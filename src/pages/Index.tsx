import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import CallControls from "../components/CallControls";
import AudioWaveform from "../components/AudioWaveform";
import CallTimer from "../components/CallTimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Transcript from "@/components/transcript/Transcript";
import CoachingStatus from "@/components/CoachingStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [user, navigate]);

  const handleDataAvailable = async (event: BlobEvent, sessionId: string) => {
    if (event.data.size > 0 && sessionId) {
      try {
        console.log("Audio chunk received, size:", event.data.size);

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string;
            const base64Audio = base64.split(",")[1];
            console.log(
              "Audio converted to base64, sending to speech-to-text..."
            );

            const { data: sttData, error: sttError } =
              await supabase.functions.invoke("speech-to-text", {
                body: {
                  audio: base64Audio,
                },
              });

            console.log("Speech-to-text response:", {
              data: sttData,
              error: sttError,
            });

            if (sttError) {
              console.error("Speech-to-text error:", sttError);
              toast.error("Error processing speech");
              return;
            }

            const response = await fetch(
              `${import.meta.env.VITE_API_URL}/api/tools/store/`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `JWT ${accessToken}`,
                },
                body: JSON.stringify({
                  transcript: sttData?.text,
                }),
              }
            );

            if (sttData?.text) {
              console.log("Received transcript:", sttData.text);
              setTranscript((prev) => [...prev, sttData.text]);

              // Poll the new endpoint until we get the "done" response
              const pollForAiResponse = async () => {
                try {
                  const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/tools/status/`,
                    {
                      method: "GET",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `JWT ${accessToken}`,
                      },
                    }
                  );

                  const aiData = await response.json();
                  console.log("New endpoint response:", aiData);

                  if (!response.ok) {
                    console.error("AI response error:", aiData);
                    toast.error("Error getting AI response");
                    return;
                  }

                  if (aiData?.["ai_response"] === "done") {
                    console.log("Received AI response:", aiData.response);
                    setAiResponses((prev) => [...prev, aiData.response]);

                    // Convert AI response to speech
                    console.log("Converting AI response to speech...");
                    const { data: ttsData, error: ttsError } =
                      await supabase.functions.invoke("text-to-speech", {
                        body: { text: aiData.response },
                      });

                    console.log("Text-to-speech response:", {
                      data: ttsData,
                      error: ttsError,
                    });

                    if (ttsError) {
                      console.error("Text-to-speech error:", ttsError);
                      toast.error("Error converting response to speech");
                      return;
                    }

                    if (ttsData?.audioContent) {
                      const audioBlob = base64ToBlob(
                        ttsData.audioContent,
                        "audio/mpeg"
                      );
                      const audioUrl = URL.createObjectURL(audioBlob);

                      if (audioRef.current) {
                        audioRef.current.src = audioUrl;
                        await audioRef.current.play();
                      }
                    }
                  } else {
                    // If not "done", poll again after a delay
                    setTimeout(pollForAiResponse, 3000);
                  }
                } catch (error) {
                  console.error("Error polling AI response:", error);
                  toast.error("Error getting AI response");
                }
              };

              // Start polling for AI response
              pollForAiResponse();
            }
          } catch (error) {
            console.error("Error in FileReader callback:", error);
            toast.error("Error processing audio data");
          }
        };

        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          toast.error("Error reading audio data");
        };

        reader.readAsDataURL(event.data);
      } catch (error) {
        console.error("Error in handleDataAvailable:", error);
        toast.error("Error processing audio");
      }
    } else {
      console.log("No audio data or session:", {
        dataSize: event.data.size,
        hasSession: Boolean(currentSession),
      });
    }
  };

  const startRecording = async (sessionId: string) => {
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      console.log("Microphone access granted, creating MediaRecorder...");
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) =>
        handleDataAvailable(event, sessionId);
      mediaRecorder.start(3000); // Capture in 3-second chunks
      console.log("MediaRecorder started");
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Failed to access microphone");
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("Stopping MediaRecorder...");
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
      await fetch(`${import.meta.env.VITE_API_URL}/api/tools/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `JWT ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId: currentSession,
          transcript: transcript.join("\n"),
          aiResponses: aiResponses,
        }),
      });
      console.log("MediaRecorder stopped");
    } else {
      console.log("Cannot stop recording:", {
        hasMediaRecorder: Boolean(mediaRecorderRef.current),
        isRecording,
      });
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const startCall = async () => {
    if (!user) {
      toast.error("Please sign in to start a call");
      return;
    }

    try {
      console.log("Starting new session...");
      const { data, error } = await supabase
        .from("sessions")
        .insert([{ user_id: user.id }])
        .select("id")
        .single();

      if (error) throw error;

      console.log("Session created:", data.id);
      setCurrentSession(data.id);
      setIsCallActive(true);
      setStartTime(Date.now());
      setTranscript([]);
      setAiResponses([]);
      await startRecording(data.id);
      await testTextToSpeech();
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Failed to start session");
    }
  };

  const handleEndCall = async () => {
    console.log("Ending call...");
    stopRecording();

    if (currentSession) {
      try {
        const { error } = await supabase
          .from("sessions")
          .update({
            ended_at: new Date().toISOString(),
            transcript: transcript.join("\n"),
            ai_responses: aiResponses,
          })
          .eq("id", currentSession);

        if (error) throw error;

        console.log("Session saved successfully");
        toast.success("Session saved successfully");
      } catch (error) {
        console.error("Error ending session:", error);
        toast.error("Failed to save session");
      }
    }

    setIsCallActive(false);
    setCurrentSession(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const base64ToBlob = (base64: string, type: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };

  const testTextToSpeech = async () => {
    try {
      setIsProcessing(true);
      console.log("Testing text-to-speech...");
      const { data, error } = await supabase.functions.invoke(
        "text-to-speech",
        {
          body: { text: "Hello! I'm your AI Coach. How can I help you today?" },
        }
      );

      if (error) {
        throw error;
      }

      console.log("Text-to-speech response received");
      if (data?.audioContent) {
        const audioBlob = base64ToBlob(data.audioContent, "audio/mpeg");
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
        }

        setAiResponses((prev) => [
          ...prev,
          "Hello! I'm your AI Coach. How can I help you today?",
        ]);
      }
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      toast.error("Failed to generate speech");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading AI Coach..." />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <audio ref={audioRef} className="hidden" />
      {!isCallActive ? (
        <div className="text-center mt-32">
          <h1 className="text-3xl font-bold text-primary mb-8">
            Welcome to AI Coach
          </h1>
          <button
            onClick={startCall}
            className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            disabled={isProcessing}
          >
            {isProcessing ? "Starting..." : "Start Call"}
          </button>
        </div>
      ) : (
        <>
          <CallTimer startTime={startTime} />
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div
                  className={`w-16 h-16 bg-primary rounded-full ${
                    isRecording ? "animate-pulse" : ""
                  }`}
                />
              </div>
              <p className="text-lg text-primary">
                {isRecording ? "Listening..." : "Call Active"}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {transcript.map((text, index) => (
                <div key={index} className="flex flex-col gap-4">
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">You:</p>
                    <p>{text}</p>
                  </div>
                  {aiResponses[index] && (
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <p className="text-sm text-primary">AI Coach:</p>
                      <p>{aiResponses[index]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <AudioWaveform isActive={isRecording} />

            <CallControls
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onEndCall={handleEndCall}
            />

            <Tabs defaultValue="transcript" className="w-full mt-8">
              <TabsList className="grid grid-cols-2 bg-gray-800">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="coaching-status">
                  Coaching Status
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="mt-6">
                <Transcript />
              </TabsContent>

              <TabsContent value="coaching-status" className="mt-6">
                <CoachingStatus currentStage="systematic-assessment" />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
