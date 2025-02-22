
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import CallControls from '../components/CallControls';
import AudioWaveform from '../components/AudioWaveform';
import CallTimer from '../components/CallTimer';

const Index = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
  };

  const startCall = () => {
    setIsCallActive(true);
    setStartTime(Date.now());
  };

  return (
    <div className="flex min-h-screen bg-secondary">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          {!isCallActive ? (
            <div className="text-center mt-32">
              <h1 className="text-3xl font-bold text-primary mb-8">Welcome to AI Coach</h1>
              <button
                onClick={startCall}
                className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Start Call
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
