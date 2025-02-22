import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import CallControls from '../components/CallControls';
import AudioWaveform from '../components/AudioWaveform';
import CallTimer from '../components/CallTimer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [user, navigate]);

  if (isLoading) {
    return <LoadingSpinner message="Loading AI Coach..." />;
  }

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const startCall = async () => {
    if (!user) {
      toast.error('Please sign in to start a call');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ user_id: user.id }])
        .select('id')
        .single();

      if (error) throw error;

      setCurrentSession(data.id);
      setIsCallActive(true);
      setStartTime(Date.now());
      setTranscript([]);
      setAiResponses([]);
      testTextToSpeech();
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    }
  };

  const handleEndCall = async () => {
    if (currentSession) {
      try {
        const { error } = await supabase
          .from('sessions')
          .update({ 
            ended_at: new Date().toISOString(),
            transcript: transcript.join('\n'),
            ai_responses: aiResponses 
          })
          .eq('id', currentSession);

        if (error) throw error;

        toast.success('Session saved successfully');
      } catch (error) {
        console.error('Error ending session:', error);
        toast.error('Failed to save session');
      }
    }

    setIsCallActive(false);
    setCurrentSession(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const testTextToSpeech = async () => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: "Hello! I'm your AI Coach. How can I help you today?" }
      });

      if (error) {
        throw error;
      }

      if (data?.audioContent) {
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }

        setAiResponses(prev => [...prev, "Hello! I'm your AI Coach. How can I help you today?"]);
      }
    } catch (error) {
      console.error('Error in text-to-speech:', error);
      toast.error('Failed to generate speech');
    } finally {
      setIsProcessing(false);
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

  return (
    <div className="max-w-2xl mx-auto">
      <audio ref={audioRef} className="hidden" />
      {!isCallActive ? (
        <div className="text-center mt-32">
          <h1 className="text-3xl font-bold text-primary mb-8">Welcome to AI Coach</h1>
          <button
            onClick={startCall}
            className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            disabled={isProcessing}
          >
            {isProcessing ? 'Starting...' : 'Start Call'}
          </button>
        </div>
      ) : (
        <>
          <CallTimer startTime={startTime} />
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-16 h-16 bg-primary rounded-full animate-pulse" />
              </div>
              <p className="text-lg text-primary">Listening...</p>
            </div>
            
            <AudioWaveform />
            
            <CallControls
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onEndCall={handleEndCall}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
