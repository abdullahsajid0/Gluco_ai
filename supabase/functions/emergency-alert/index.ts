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
    const { 
      patientName, 
      bgl, 
      trend, 
      alertType, 
      timestamp,
      doctorEmails 
    } = await req.json();

    console.log("Emergency alert triggered:", { bgl, alertType, timestamp });

    // Generate alert HTML email
    const alertHTML = generateAlertEmail({
      patientName,
      bgl,
      trend,
      alertType,
      timestamp
    });

    // Send to all emergency contact doctors
    const emailPromises = doctorEmails.map((email: string) => 
      resend.emails.send({
        from: "Glucós Emergency Alert <onboarding@resend.dev>",
        to: [email],
        subject: `🚨 URGENT: ${alertType} Alert for ${patientName}`,
        html: alertHTML,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    console.log(`Email alerts sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Emergency alert sent to ${successful} doctor(s)`,
        results: {
          successful,
          failed,
          total: doctorEmails.length
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Emergency alert error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateAlertEmail({ 
  patientName, 
  bgl, 
  trend, 
  alertType, 
  timestamp 
}: {
  patientName: string;
  bgl: number;
  trend: string;
  alertType: string;
  timestamp: string;
}) {
  const trendIcon = getTrendIcon(trend);
  const isLow = alertType.toLowerCase().includes("hypo");
  const alertColor = isLow ? "#dc2626" : "#ea580c";
  const bgColor = isLow ? "#fee2e2" : "#fed7aa";

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, ${alertColor} 0%, #991b1b 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .alert-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      background: white;
      padding: 30px;
      border: 3px solid ${alertColor};
      border-top: none;
      border-radius: 0 0 10px 10px;
    }
    .critical-box {
      background: ${bgColor};
      border-left: 5px solid ${alertColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .glucose-reading {
      font-size: 48px;
      font-weight: bold;
      color: ${alertColor};
      text-align: center;
      margin: 20px 0;
    }
    .trend {
      font-size: 32px;
      text-align: center;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-label {
      font-weight: bold;
      color: #6b7280;
    }
    .action-box {
      background: #f3f4f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
      border-left: 5px solid #3b82f6;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      background: ${alertColor};
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="alert-icon">🚨</div>
      <h1 style="margin: 0;">CRITICAL GLUCOSE ALERT</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">${alertType}</p>
    </div>
    
    <div class="content">
      <div class="critical-box">
        <h2 style="margin-top: 0; color: ${alertColor};">⚠️ IMMEDIATE ATTENTION REQUIRED</h2>
        <p style="margin: 0; font-size: 16px;">
          Your patient <strong>${patientName}</strong> has experienced a critical glucose event that requires immediate medical attention.
        </p>
      </div>

      <div class="glucose-reading">
        ${bgl} mg/dL ${trendIcon}
      </div>

      <div style="background: #f9fafb; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <div class="info-row">
          <span class="info-label">Patient:</span>
          <span>${patientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Alert Type:</span>
          <span style="color: ${alertColor}; font-weight: bold;">${alertType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Blood Glucose:</span>
          <span style="color: ${alertColor}; font-weight: bold;">${bgl} mg/dL</span>
        </div>
        <div class="info-row">
          <span class="info-label">Trend:</span>
          <span>${trend} ${trendIcon}</span>
        </div>
        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Timestamp:</span>
          <span>${new Date(timestamp).toLocaleString()}</span>
        </div>
      </div>

      <div class="action-box">
        <h3 style="margin-top: 0; color: #1f2937;">📋 Recommended Actions:</h3>
        ${isLow ? `
        <ul style="margin: 10px 0;">
          <li><strong>Immediate:</strong> Contact patient to verify consciousness and ability to treat</li>
          <li><strong>Treatment:</strong> Ensure patient consumes 15-20g fast-acting carbohydrates</li>
          <li><strong>Monitoring:</strong> Recheck glucose in 15 minutes</li>
          <li><strong>Follow-up:</strong> If unconscious or unable to respond, call emergency services</li>
          <li><strong>Review:</strong> Assess insulin doses and timing to prevent future episodes</li>
        </ul>
        ` : `
        <ul style="margin: 10px 0;">
          <li><strong>Immediate:</strong> Contact patient to verify symptoms (thirst, frequent urination)</li>
          <li><strong>Assessment:</strong> Check for ketones if Type 1 diabetes</li>
          <li><strong>Hydration:</strong> Ensure adequate water intake</li>
          <li><strong>Correction:</strong> Consider correction dose per patient's ISF</li>
          <li><strong>Monitoring:</strong> Recheck glucose in 2-3 hours</li>
          <li><strong>Emergency:</strong> If BGL > 400 mg/dL or ketones present, seek immediate care</li>
        </ul>
        `}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #6b7280; margin-bottom: 10px;">This is an automated alert from Glucós AI Diabetes Management System</p>
      </div>

      <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Important:</strong> This alert is generated by AI-powered monitoring. Please verify patient status and glucose reading through direct contact or continuous monitoring system.
        </p>
      </div>
    </div>

    <div class="footer">
      <p><strong>Glucós</strong> - AI-Powered Diabetes Care Team</p>
      <p>This email was sent to you as an emergency contact for ${patientName}</p>
      <p style="font-size: 12px; color: #9ca3af;">
        Generated at ${new Date().toLocaleString()}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function getTrendIcon(trend: string): string {
  switch (trend.toLowerCase()) {
    case "double_up":
      return "⇈";
    case "up":
      return "↗";
    case "steady":
      return "→";
    case "down":
      return "↘";
    case "double_down":
      return "⇊";
    default:
      return "→";
  }
}

