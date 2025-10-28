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
    const { bgl, trend, insulinOnBoard } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    console.log("Guardian analyzing:", { bgl, trend, insulinOnBoard });

    // Guardian uses Groq for ultra-fast response (critical for alerts)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Fast model for real-time alerts
        messages: [
          {
            role: "system",
            content: `You are the GUARDIAN - an ultra-fast diabetes monitoring AI using Groq for millisecond response times.

CRITICAL MISSION: Predict and prevent hypoglycemia/hyperglycemia events.

ANALYSIS CRITERIA:
- Hypoglycemia Risk: BGL < 70 mg/dL or rapidly falling (double_down trend)
- Hyperglycemia Risk: BGL > 250 mg/dL or rapidly rising (double_up trend)  
- Warning Zone: BGL 70-80 or 180-250 mg/dL
- IOB Impact: Each unit of insulin typically lowers BGL by 30-50 mg/dL over 4-5 hours

RESPONSE FORMAT (JSON ONLY):
{
  "alert": true/false,
  "severity": "critical" | "warning" | "normal",
  "prediction": "Expected BGL in 15-30 minutes based on trend and IOB",
  "action": "Specific, immediate action required (consume 15g fast carbs, monitor closely, etc.)",
  "reasoning": "Brief explanation of analysis"
}

RULES:
1. Speed over eloquence - respond in under 500ms
2. Be decisive - clear actions, no hedging
3. Consider trend momentum and IOB in predictions
4. Critical alerts for BGL <70 or >250 or dangerous trends`,
          },
          {
            role: "user",
            content: `ANALYZE NOW: BGL=${bgl} mg/dL | Trend=${trend || "steady"} | IOB=${insulinOnBoard || 0}u`,
          },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log("Guardian analysis:", analysis);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Guardian error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
