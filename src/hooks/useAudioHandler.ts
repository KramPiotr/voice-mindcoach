
import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAudioHandler = (user: any) => {
  const [transcript, setTranscript] = useState<string[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const base64ToBlob = (base64: string, type: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };

  const handleDataAvailable = async (event: BlobEvent) => {
    const sessionId = sessionIdRef.current;

    if (event.data.size > 0 && sessionId) {
      try {
        console.log("Audio chunk received, size:", event.data.size, "sessionId:", sessionId);

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string;
            const base64Audio = base64.split(",")[1];
            console.log("Audio converted to base64, sending to speech-to-text...");

            const { data: sttData, error: sttError } = await supabase.functions.invoke(
              "speech-to-text",
              {
                body: {
                  audio: base64Audio,
                },
              }
            );

            console.log("Speech-to-text response:", {
              data: sttData,
              error: sttError,
            });

            if (sttError) {
              console.error("Speech-to-text error:", sttError);
              toast.error("Error processing speech");
              return;
            }

            if (sttData?.text) {
              console.log("Received transcript:", sttData.text);
              setTranscript((prev) => [...prev, sttData.text]);

              console.log("Sending transcript to Vertex AI...");
              const { data: aiData, error: aiError } = await supabase.functions.invoke(
                "vertex-ai",
                {
                  body: {
                    text: sttData.text,
                    sessionId: sessionId,
                    userId: user?.id,
                  },
                }
              );

              console.log("Vertex AI response:", {
                data: aiData,
                error: aiError,
              });

              if (aiError) {
                console.error("AI response error:", aiError);
                toast.error("Error getting AI response");
                return;
              }

              if (aiData?.response) {
                console.log("Received AI response:", aiData.response);
                setAiResponses((prev) => [...prev, aiData.response]);

                console.log("Converting AI response to speech...");
                const { data: ttsData, error: ttsError } = await supabase.functions.invoke(
                  "text-to-speech",
                  {
                    body: { text: aiData.response },
                  }
                );

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
                  const audioBlob = base64ToBlob(ttsData.audioContent, "audio/mpeg");
                  const audioUrl = URL.createObjectURL(audioBlob);

                  if (audioRef.current) {
                    audioRef.current.src = audioUrl;
                    await audioRef.current.play();
                  }
                }
              }
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
        hasSession: Boolean(sessionId),
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
      sessionIdRef.current = sessionId;

      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.start(3000);
      console.log("MediaRecorder started with sessionId:", sessionId);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Failed to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("Stopping MediaRecorder...");
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      sessionIdRef.current = null;
      console.log("MediaRecorder stopped");
    } else {
      console.log("Cannot stop recording:", {
        hasMediaRecorder: Boolean(mediaRecorderRef.current),
        isRecording,
      });
    }
  };

  return {
    transcript,
    aiResponses,
    isRecording,
    audioRef,
    startRecording,
    stopRecording,
    setTranscript,
    setAiResponses,
  };
};
