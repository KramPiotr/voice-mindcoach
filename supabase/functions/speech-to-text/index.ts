
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Processing speech-to-text request...');
    const { audio } = await req.json();

    if (!audio) {
      console.error('No audio data provided');
      throw new Error('No audio data provided');
    }

    console.log('Audio data received, preparing request for Google Cloud...');
    
    // Convert base64 to audio bytes
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));

    // Create request for Google Cloud Speech-to-Text
    const request = {
      audio: {
        content: audio // Send the original base64 string directly
      },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        model: 'default',
        useEnhanced: true,
      }
    };

    console.log('Sending request to Google Cloud Speech-to-Text...');

    // Get the service account token
    const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!serviceAccount) {
      throw new Error('Google service account credentials not found');
    }

    // Call Google Cloud Speech-to-Text API
    const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceAccount}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    console.log('Received response from Google Cloud Speech-to-Text');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Speech-to-Text API error:', errorText);
      throw new Error(`Google Speech-to-Text API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('Speech-to-Text result:', result);

    let text = '';
    if (result.results && result.results.length > 0) {
      text = result.results[0].alternatives[0].transcript;
      console.log('Transcribed text:', text);
    }

    return new Response(
      JSON.stringify({ text }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in speech-to-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
