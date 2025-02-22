
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpeechRecognitionConfig {
  encoding: string;
  sampleRateHertz: number;
  languageCode: string;
  model: string;
  enableAutomaticPunctuation: boolean;
  useEnhanced: boolean;
}

// Google Cloud Speech-to-Text streaming recognition
async function createRecognitionStream(config: SpeechRecognitionConfig) {
  const apiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
  const apiEndpoint = 'https://speech.googleapis.com/v1/speech:recognize';

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      config,
      audio: {
        content: null // Will be filled with audio data
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    let recognitionStream: any = null;
    let isProcessing = false;

    socket.onopen = () => {
      console.log("Client connected");
    };

    socket.onmessage = async (event) => {
      try {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data);
          
          if (message.type === 'interrupt') {
            isProcessing = false;
            console.log("Processing interrupted");
            return;
          }
        }

        // Handle binary audio data
        if (event.data instanceof ArrayBuffer) {
          if (!isProcessing) {
            isProcessing = true;
            
            const config: SpeechRecognitionConfig = {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 16000,
              languageCode: 'en-US',
              model: 'latest_short',
              enableAutomaticPunctuation: true,
              useEnhanced: true,
            };

            try {
              const result = await createRecognitionStream(config);
              
              if (result.results && result.results[0]) {
                const transcript = result.results[0].alternatives[0].transcript;
                
                // Send transcript back to client
                socket.send(JSON.stringify({
                  type: 'transcript',
                  text: transcript
                }));
                
                isProcessing = false;
              }
            } catch (error) {
              console.error('Speech recognition error:', error);
              socket.send(JSON.stringify({
                type: 'error',
                error: 'Speech recognition failed'
              }));
              isProcessing = false;
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message handling error:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log("Client disconnected");
    };

    return response;
  } catch (error) {
    console.error('Connection error:', error);
    return new Response('Failed to establish WebSocket connection', { 
      status: 500,
      headers: corsHeaders
    });
  }
});
