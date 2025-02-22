
import React, { useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import CallControls from '../components/CallControls';
import AudioWaveform from '../components/AudioWaveform';
import CallTimer from '../components/CallTimer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const startCall = () => {
    setIsCallActive(true);
    setStartTime(Date.now());
    testTextToSpeech();
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
    <div className="flex min-h-screen bg-secondary">
      <Sidebar />
      <audio ref={audioRef} className="hidden" />
      
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-2xl mx-auto">
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
      </main>
    </div>
  );
};

export default Index;
