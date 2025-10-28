import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doctorEmail, patientName, weeklyData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    console.log("Secretary generating report for:", patientName);

    // Secretary uses Gemini Pro for professional summarization
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
            content: `You are the SECRETARY - a medical communications specialist powered by Gemini 2.5 Pro, integrated with Resend for email delivery.

🎯 YOUR MISSION: Generate clear, professional medical summaries for healthcare providers.

📋 REPORT REQUIREMENTS:

**FORMAT: Professional HTML Email**

**STRUCTURE:**
1. **Executive Summary** (2-3 sentences)
   - Overall glycemic control assessment
   - Key concerns or improvements
   
2. **Glucose Metrics** (Table format)
   - Average BGL
   - Time in Range (70-180 mg/dL): [X]%
   - Time Above Range (>180 mg/dL): [X]%
   - Time Below Range (<70 mg/dL): [X]%
   - Total readings analyzed
   
3. **Notable Events**
   - Hypoglycemic episodes (<70 mg/dL): Count and timing
   - Severe hyperglycemia (>250 mg/dL): Count and timing
   
4. **Medication Summary**
   - Total insulin administered (7 days)
   - Average daily basal/bolus breakdown if available
   
5. **Dietary Patterns**
   - Average carbohydrate intake
   - Meal frequency
   
6. **Clinical Recommendations** (if warranted)
   - Patterns requiring attention
   - Suggested therapy adjustments
   
**TONE:**
- Professional medical language
- Objective, data-driven
- Concise (maximum 1 page)
- Use clinical terminology
- Highlight actionable insights

**HTML STYLING:**
- Clean, readable design
- Use tables for metrics
- Color-code sections (green for good, yellow for caution, red for concern)
- Include Glucós branding header`,
          },
          {
            role: "user",
            content: `Generate a comprehensive weekly diabetes management report for ${patientName}.

PATIENT DATA (7 days):
${JSON.stringify(weeklyData, null, 2)}

Create a professional HTML email suitable for a physician review.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reportHTML = data.choices[0].message.content;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Glucós Health Assistant <onboarding@resend.dev>",
      to: [doctorEmail],
      subject: `Weekly Diabetes Report - ${patientName}`,
      html: reportHTML,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Report sent to doctor successfully",
        data: emailResponse 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Secretary error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
