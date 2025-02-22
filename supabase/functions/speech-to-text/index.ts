
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
    const { audio, sessionId, userId } = await req.json();

    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio for session:', sessionId);
    
    // Convert base64 to audio bytes
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));

    // Create request for Google Cloud Speech-to-Text
    const request = {
      audio: {
        content: btoa(String.fromCharCode(...binaryAudio))
      },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        model: 'default',
        useEnhanced: true,
      }
    };

    // Call Google Cloud Speech-to-Text API
    const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GOOGLE_SERVICE_ACCOUNT')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Google Speech-to-Text API error:', error);
      throw new Error(`Google Speech-to-Text API error: ${error}`);
    }

    const result = await response.json();
    console.log('Speech-to-Text result:', result);

    let transcript = '';
    if (result.results && result.results.length > 0) {
      transcript = result.results[0].alternatives[0].transcript;
    }

    console.log('Transcript:', transcript);

    // Get AI response using existing Vertex AI function
    const aiResponse = await fetch(
      'http://localhost:54321/functions/v1/vertex-ai',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ transcript }),
      }
    );

    if (!aiResponse.ok) {
      throw new Error('Failed to get AI response');
    }

    const { response: aiText } = await aiResponse.json();

    // Store the interaction in the database
    const { error: dbError } = await fetch(
      'http://localhost:54321/rest/v1/chat_interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          user_message: transcript,
          ai_response: aiText,
          interaction_type: 'speech',
          successful: true,
        }),
      }
    ).then(res => res.json());

    if (dbError) {
      console.error('Error storing interaction:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        transcript,
        aiResponse: aiText
      }),
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
