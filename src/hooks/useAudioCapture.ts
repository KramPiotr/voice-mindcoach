
import { useState, useEffect, useRef } from 'react';

interface AudioCaptureOptions {
  onAudioData: (audioData: Blob) => void;
  silenceThreshold?: number;
}

export const useAudioCapture = ({ 
  onAudioData, 
  silenceThreshold = 1500 
}: AudioCaptureOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const silenceTimer = useRef<number | null>(null);

  useEffect(() => {
    let cleanup = () => {};

    const initializeAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000
          }
        });

        mediaRecorder.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
            
            // Reset silence timer
            if (silenceTimer.current) {
              window.clearTimeout(silenceTimer.current);
            }
            
            silenceTimer.current = window.setTimeout(() => {
              if (audioChunks.current.length > 0) {
                const audioBlob = new Blob(audioChunks.current, { 
                  type: 'audio/webm;codecs=opus' 
                });
                onAudioData(audioBlob);
                audioChunks.current = [];
              }
            }, silenceThreshold);
          }
        };

        cleanup = () => {
          stream.getTracks().forEach(track => track.stop());
          if (silenceTimer.current) {
            window.clearTimeout(silenceTimer.current);
          }
        };
      } catch (error) {
        console.error('Error initializing audio capture:', error);
      }
    };

    initializeAudio();
    return cleanup;
  }, [onAudioData, silenceThreshold]);

  const startRecording = () => {
    if (mediaRecorder.current?.state === 'inactive') {
      audioChunks.current = [];
      mediaRecorder.current.start(100); // Capture in 100ms chunks
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      if (silenceTimer.current) {
        window.clearTimeout(silenceTimer.current);
      }
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording
  };
};
