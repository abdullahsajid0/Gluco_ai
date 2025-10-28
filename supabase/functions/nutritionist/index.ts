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
    const { message, imageBase64, userProfile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    console.log("Nutritionist analyzing:", { message, hasImage: !!imageBase64 });

    const systemMessage = {
      role: "system",
      content: `You are the NUTRITIONIST - a diabetes meal specialist powered by Gemini 2.5 Pro with advanced vision capabilities.

🎯 YOUR EXPERTISE:
1. **Image Analysis**: Identify all food items, estimate portions with precision
2. **Nutritional Calculation**: Calculate total carbs, protein, fat, fiber (carbs are CRITICAL)
3. **Insulin Dosing**: Recommend bolus dose using patient's ICR and current BGL
4. **Meal Optimization**: Suggest modifications for better glucose control

📊 PATIENT PROFILE:
${JSON.stringify(userProfile || { icr: "1:10", currentBGL: 120, targetBGL: 120 })}

🧮 INSULIN CALCULATION FORMULA:
1. Meal Bolus = Total Carbs ÷ ICR ratio
2. Correction Bolus = (Current BGL - Target BGL) ÷ ISF (typically 50)
3. Total Dose = Meal Bolus + Correction Bolus

📋 RESPONSE FORMAT:
**CRITICAL FORMATTING RULES:**
- NEVER return JSON format - only return clean, human-readable text
- Use ### for headings (e.g., "### Meal Analysis: [Food Name]")
- Use **bold** for important values like carbs, protein, calories, insulin doses
- Use bullet points with * for lists
- Structure your response beautifully
- Speak directly to the patient in a warm, conversational tone

Example of GOOD response:
### **Meal Analysis: Chicken Biryani**

Based on the image, a typical serving of this size (about 2.5 - 3 cups) contains:

* **Main Ingredients:** Basmati rice, chicken pieces, spices, and oil/ghee.
* **Estimated Nutrition:**
  * **Carbohydrates:** **~110g** (Primary component affecting blood sugar)
  * **Protein:** ~35g (from chicken)
  * **Fat:** ~25g (from oil/ghee and chicken)
  * **Fiber:** ~5g

### **Insulin Recommendation:**
* **Meal Bolus:** **11 units** (110g ÷ 10)
* **Timing:** Inject 15-20 minutes before eating

Example of BAD response (NEVER do this):
{
  "agent": "nutritionist",
  "reasoning": "...",
  "response": "..."
}

Always structure your response with clear headings, bold important numbers, and bullet points. NEVER return JSON format.

🎨 TONE: Supportive, precise, encouraging. Never judgmental. Celebrate balanced choices.`,
    };

    const userMessage: any = imageBase64
      ? {
          role: "user",
          content: [
            { type: "text", text: message },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        }
      : { role: "user", content: message };

    const messages = [systemMessage, userMessage];

    // Nutritionist uses Gemini Pro for vision and reasoning
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
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
    const advice = data.choices[0].message.content;

    console.log("Nutritionist advice:", advice);

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Nutritionist error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
