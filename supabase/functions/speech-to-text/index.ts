
import { serve } from "https://deno.fresh.runtime.dev";
import { credentials } from "https://deno.land/x/broken/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the service account credentials from environment
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('Google service account credentials not found');
    }

    const client = await initializeGoogleClient(serviceAccountJson);

    // Initialize WebSocket connection
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = async (event) => {
      try {
        // Convert the audio data to the format expected by Google Speech-to-Text
        const audioContent = event.data;
        
        // Create recognition request
        const request = {
          audio: {
            content: audioContent,
          },
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
            model: 'latest_short',
            enableAutomaticPunctuation: true,
            useEnhanced: true,
          },
        };

        // Send the request to Google Speech-to-Text
        const [response] = await client.recognize(request);
        
        if (response.results && response.results[0]) {
          const transcript = response.results[0].alternatives[0].transcript;
          
          // Send transcript back to client
          socket.send(JSON.stringify({
            type: 'transcript',
            text: transcript
          }));
        }
      } catch (error) {
        console.error('Error processing audio:', error);
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process audio'
        }));
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
    return new Response(JSON.stringify({ error: 'Failed to establish WebSocket connection' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

async function initializeGoogleClient(serviceAccountJson: string) {
  try {
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    return new speech.SpeechClient({ auth });
  } catch (error) {
    console.error('Error initializing Google client:', error);
    throw error;
  }
}

