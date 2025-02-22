
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  message: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId }: FeedbackRequest = await req.json();

    // Get user profile for better context
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const userResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      headers: {
        "apikey": supabaseKey!,
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });

    const [userProfile] = await userResponse.json();
    const userName = userProfile?.full_name || "Anonymous User";

    const emailResponse = await resend.emails.send({
      from: "AI Coach <onboarding@resend.dev>",
      to: ["piotr.kram7@gmail.com", "georgejm00@gmail.com"],
      subject: `New Feedback from ${userName}`,
      html: `
        <h1>New Feedback Received</h1>
        <p><strong>From:</strong> ${userName}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error sending feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
