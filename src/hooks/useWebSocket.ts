
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        const { data: { url }, error } = await supabase.functions.invoke('speech-to-text');
        
        if (error) throw error;

        const ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectAttempts.current = 0;
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
          setIsConnected(false);
          
          // Attempt to reconnect if under max attempts
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setTimeout(connectWebSocket, 2000 * reconnectAttempts.current);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        setSocket(ws);

        return () => {
          ws.close();
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();
  }, []);

  return { socket, isConnected };
};
