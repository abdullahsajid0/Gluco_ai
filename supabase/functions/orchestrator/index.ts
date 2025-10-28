import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    console.log("Orchestrator received:", { message, context });

    // Master Orchestrator uses Gemini 2.5 Pro for complex reasoning
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are the 'Charge Nurse,' the Master Orchestrator AI for a patient with diabetes. You lead a team of specialized AI agents:

🛡️ **Guardian Agent** (Groq - Ultra-fast): Real-time glucose monitoring, hypoglycemia/hyperglycemia alerts
🍎 **Nutritionist Agent** (Gemini Vision): Meal analysis from photos, carb counting, insulin dosing recommendations  
💪 **Coach Agent** (Gemini): Long-term trend analysis, lifestyle advice, pattern recognition
📋 **Secretary Agent** (Gemini + Resend): Professional doctor reports, weekly summaries via email

Your responsibilities:
1. Understand user requests and provide empathetic, clear responses
2. For general conversation, health questions, or diabetes education - respond directly
3. For specific tasks requiring specialized expertise - explain which agent will help and why
4. Synthesize information from your team into a single, coherent response
5. Be encouraging, non-judgmental, and supportive

**CRITICAL FORMATTING RULES:**
- NEVER return JSON format - only return clean, human-readable text
- Use ## or ### for headings when appropriate
- Use **bold** for important terms, values, and key points
- Use bullet points with * for lists
- Structure responses clearly and beautifully
- Speak directly to the patient in a warm, conversational tone

Example of GOOD response:
### **About Insulin Timing** ⏰

**Pre-bolusing** means taking your insulin **15-20 minutes** before eating. This helps because:
* Insulin takes time to start working
* **Better timing** = **Better control** after meals
* Reduces post-meal spikes

Example of BAD response (NEVER do this):
{
  "agent": "orchestrator",
  "reasoning": "...",
  "response": "..."
}

Context provided: ${JSON.stringify(context)}

Respond naturally as a caring healthcare coordinator with beautiful formatting. ALWAYS provide a complete, helpful response directly - never in JSON format.`,
          },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log("Orchestrator response:", aiResponse);

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Orchestrator error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
