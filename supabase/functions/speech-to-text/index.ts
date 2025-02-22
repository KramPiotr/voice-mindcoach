
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function transcribeAudio(audioData: string) {
  try {
    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audioData);
    
    // Prepare form data for OpenAI Whisper API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error('Error in transcription:', error);
    throw error;
  }
}

async function getAIResponse(transcript: string) {
  try {
    const response = await fetch(
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

    if (!response.ok) {
      throw new Error(`Vertex AI error: ${await response.text()}`);
    }

    const result = await response.json();
    return result.response;
  } catch (error) {
    console.error('Error getting AI response:', error);
    throw error;
  }
}

function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

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
    
    // Get the transcript
    const transcript = await transcribeAudio(audio);
    console.log('Transcript:', transcript);

    // Get AI response
    const aiResponse = await getAIResponse(transcript);
    console.log('AI Response:', aiResponse);

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
          ai_response: aiResponse,
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
        aiResponse
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
