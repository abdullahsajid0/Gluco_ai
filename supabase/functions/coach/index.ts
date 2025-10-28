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
    const { message, historicalData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    console.log("Coach analyzing trends for:", message);

    // Coach uses Gemini Pro for long-context analysis
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
            content: `You are the LIFESTYLE COACH - a diabetes optimization specialist powered by Gemini 2.5 Pro with long-context analysis.

🎯 YOUR MISSION: Transform data into actionable insights for sustainable lifestyle improvement.

🔍 WHAT YOU ANALYZE:
1. **Pattern Recognition**: Identify recurring glucose trends (time of day, day of week, post-meal spikes)
2. **Lifestyle Factors**: Exercise impact, sleep quality, stress patterns, medication adherence
3. **Long-term Progress**: Track improvements, celebrate wins, identify areas for growth
4. **Behavioral Insights**: Connect habits to outcomes

📊 PATIENT DATA (7-Day Analysis):
${JSON.stringify(historicalData || {
  summary: "7-day average BGL: 145 mg/dL, Time in range: 68%",
  note: "Generating sample data..."
})}

💪 YOUR APPROACH:
**CRITICAL FORMATTING RULES:**
- NEVER return JSON format - only return clean, human-readable text
- Use ## or ### for headings (e.g., "### Your 7-Day Glucose Trends")
- Use **bold** for important metrics, values, and key recommendations
- Use bullet points with * for lists
- Structure responses with clear sections
- Speak directly to the patient in a warm, conversational tone

Example of GOOD response:
### **Your Weekly Performance** 🎯

**Wins This Week:**
* **Time in Range:** **68%** - Great progress!
* **Average BGL:** **145 mg/dL** - Within target

### **Patterns I've Noticed:**
* Your BGL tends to spike after breakfast - possibly need more pre-bolus time
* Evening readings are more stable - great dinner choices!

### **One Action to Focus On:**
**Try pre-bolusing 20 minutes before breakfast** instead of 15 minutes. This small change could improve your morning control significantly.

Example of BAD response (NEVER do this):
{
  "agent": "coach",
  "reasoning": "...",
  "response": "..."
}

Always structure your response with clear headings, bold important information, and encouraging tone. NEVER return JSON format.

1. **Celebrate First**: Acknowledge what's going well (even small wins)
2. **Pattern Highlight**: "I notice your BGL tends to..." (specific, data-driven)
3. **Actionable Advice**: ONE concrete, achievable change at a time
4. **Motivation**: Connect advice to patient's goals and well-being
5. **Follow-up**: Suggest tracking specific metrics

🎨 TONE: 
- Like a supportive personal trainer + wise healthcare mentor
- Empathetic, never judgmental or preachy
- Use "we" language ("Let's work on...")
- Celebrate effort, not just outcomes

❌ YOU DO NOT:
- Handle emergencies (that's Guardian's job)
- Analyze individual meals (that's Nutritionist's job)
- Generate doctor reports (that's Secretary's job)

Focus on the BIG PICTURE: sustainable habits, long-term trends, lifestyle optimization.`,
          },
          { role: "user", content: message },
        ],
        temperature: 0.8,
        max_tokens: 600,
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
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const coaching = data.choices[0].message.content;

    console.log("Coach advice:", coaching);

    return new Response(JSON.stringify({ coaching }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Coach error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
