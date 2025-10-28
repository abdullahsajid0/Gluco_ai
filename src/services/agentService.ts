/**
 * Agent Service - Handles all agent communications
 * Manages routing, context, and multi-agent orchestration
 */

import { dataStore } from "./dataStore";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EMAIL_SERVER_URL = import.meta.env.VITE_EMAIL_SERVER_URL || "http://localhost:3001";

export interface AgentResponse {
  agent: string;
  content: string;
  action?: string;
  metadata?: any;
}

class AgentService {
  // Call Guardian Agent (Groq - Fast)
  async callGuardian(bgl: number, trend: string, insulinOnBoard: number): Promise<AgentResponse> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/guardian`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ bgl, trend, insulinOnBoard })
      });

      if (!response.ok) {
        throw new Error(`Guardian error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.analysis);

      dataStore.addAgentInteraction({
        agent: "guardian",
        message: `BGL: ${bgl}, Trend: ${trend}, IOB: ${insulinOnBoard}`,
        response: JSON.stringify(analysis)
      });

      // Send emergency email alert for critical readings
      if (analysis.alert && analysis.severity === "critical") {
        this.sendEmergencyAlert(bgl, trend, analysis);
      }

      return {
        agent: "guardian",
        content: analysis.action || analysis.prediction,
        metadata: analysis
      };
    } catch (error) {
      console.error("Guardian error:", error);
      throw error;
    }
  }

  // Send Emergency Email Alert (using Gmail SMTP)
  private async sendEmergencyAlert(bgl: number, trend: string, analysis: any) {
    try {
      const userProfile = dataStore.getUserProfile();
      const emergencyDoctors = dataStore.getEmergencyDoctors();

      if (emergencyDoctors.length === 0) {
        console.warn("⚠️ No emergency doctors configured");
        return;
      }

      const alertType = bgl < 70 ? "HYPOGLYCEMIA" : "HYPERGLYCEMIA";

      // Use Gmail SMTP server (works locally and in production!)
      const response = await fetch(`${EMAIL_SERVER_URL}/send-emergency-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientName: userProfile.name,
          bgl,
          trend,
          alertType,
          timestamp: new Date().toISOString(),
          doctorEmails: emergencyDoctors
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✉️ Emergency alert sent successfully:", result);
      } else {
        console.warn(`⚠️ Email alert failed (HTTP ${response.status})`);
        console.log("📧 Make sure email server is running: npm run email-server");
      }
    } catch (error) {
      // Don't throw - we don't want to block the Guardian response
      console.warn("⚠️ Email server not running");
      console.log("📧 Emergency contacts:", dataStore.getEmergencyDoctors());
      console.log("🚨 Critical alert:", {
        type: bgl < 70 ? "HYPOGLYCEMIA" : "HYPERGLYCEMIA",
        bgl,
        trend,
        recommendation: analysis.action
      });
      console.log("💡 Start email server with: npm run email-server");
    }
  }

  // Call Nutritionist Agent (Gemini - Vision + Reasoning)
  async callNutritionist(message: string, imageBase64?: string): Promise<AgentResponse> {
    try {
      const userProfile = dataStore.getUserProfile();
      const context = dataStore.getAgentContext();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/nutritionist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          message,
          imageBase64,
          userProfile: {
            icr: userProfile.icr,
            currentBGL: context.recentReadings[context.recentReadings.length - 1]?.bgl || 120,
            targetBGL: userProfile.targetBGL
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Nutritionist error: ${response.status}`);
      }

      const data = await response.json();
      
      // Clean up JSON responses
      let cleanContent = data.advice;
      try {
        const parsed = JSON.parse(data.advice);
        if (parsed.response) {
          cleanContent = parsed.response || "I'm analyzing your meal. Please try again.";
        }
      } catch {
        // Not JSON, use as is
      }

      dataStore.addAgentInteraction({
        agent: "nutritionist",
        message,
        response: cleanContent
      });

      return {
        agent: "nutritionist",
        content: cleanContent
      };
    } catch (error) {
      console.error("Nutritionist error:", error);
      throw error;
    }
  }

  // Call Coach Agent (Gemini - Long-term trends)
  async callCoach(message: string): Promise<AgentResponse> {
    try {
      const context = dataStore.getAgentContext();
      const stats = context.statistics;

      const historicalData = {
        weeklyStats: stats,
        recentReadings: context.recentReadings.map(r => ({
          bgl: r.bgl,
          time: r.timestamp.toISOString()
        })),
        recentMeals: context.recentMeals.map(m => ({
          description: m.description,
          carbs: m.carbs,
          time: m.timestamp.toISOString()
        }))
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/coach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          message,
          historicalData
        })
      });

      if (!response.ok) {
        throw new Error(`Coach error: ${response.status}`);
      }

      const data = await response.json();
      
      // Clean up JSON responses
      let cleanContent = data.coaching;
      try {
        const parsed = JSON.parse(data.coaching);
        if (parsed.response) {
          cleanContent = parsed.response || "Let me analyze your patterns and provide guidance.";
        }
      } catch {
        // Not JSON, use as is
      }

      dataStore.addAgentInteraction({
        agent: "coach",
        message,
        response: cleanContent
      });

      return {
        agent: "coach",
        content: cleanContent
      };
    } catch (error) {
      console.error("Coach error:", error);
      throw error;
    }
  }

  // Call Secretary Agent (Generate and Email Doctor Reports)
  async callSecretary(message: string): Promise<AgentResponse> {
    try {
      const userProfile = dataStore.getUserProfile();
      const stats = dataStore.getStatistics(168); // 7 days
      const readings = dataStore.getGlucoseReadings(168);
      const emergencyDoctors = dataStore.getEmergencyDoctors();

      if (emergencyDoctors.length === 0) {
        console.warn("⚠️ No emergency doctors configured - email not sent");
      }

      const weeklyData = {
        patientName: userProfile.name,
        summary: stats,
        readings: readings.map(r => ({
          bgl: r.bgl,
          timestamp: r.timestamp.toISOString()
        })),
        meals: dataStore.getMealLogs(168).map(m => ({
          description: m.description,
          carbs: m.carbs,
          timestamp: m.timestamp.toISOString()
        })),
        medications: dataStore.getMedicationLogs(168).map(m => ({
          type: m.type,
          units: m.units,
          timestamp: m.timestamp.toISOString()
        }))
      };

      // Generate report summary for display
      const reportSummary = this.generateReportSummary(stats, weeklyData);

      // Send email report via our Gmail server
      try {
        console.log("📧 Sending weekly report email...");
        console.log("  Patient:", userProfile.name);
        console.log("  Stats:", stats);
        console.log("  Doctors:", emergencyDoctors);
        
        const emailResponse = await fetch(`${EMAIL_SERVER_URL}/send-weekly-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            patientName: userProfile.name,
            weeklyData,
            doctorEmails: emergencyDoctors
          })
        });

        if (emailResponse.ok) {
          const result = await emailResponse.json();
          console.log("✉️ Weekly report emailed:", result);
        } else {
          const errorText = await emailResponse.text();
          console.error("⚠️ Failed to email report:", emailResponse.status, errorText);
        }
      } catch (emailError) {
        console.error("⚠️ Email server error:", emailError);
        console.warn("💡 Make sure email server is running: npm run email-server");
      }

      dataStore.addAgentInteraction({
        agent: "secretary",
        message,
        response: reportSummary
      });

      return {
        agent: "secretary",
        content: reportSummary,
        metadata: { stats, weeklyData }
      };
    } catch (error) {
      console.error("Secretary error:", error);
      throw error;
    }
  }

  // Generate human-readable report summary
  private generateReportSummary(stats: any, weeklyData: any): string {
    const { avgBGL, timeInRange, hypoEvents, hyperEvents, readings, totalInsulin, avgCarbs } = stats;
    const patientName = weeklyData.patientName;

    return `### **📋 Weekly Diabetes Report for ${patientName}**

### **📊 7-Day Summary:**

**Glucose Control:**
* Average BGL: **${avgBGL} mg/dL**
* Time in Range (70-180): **${timeInRange}%**
* Total Readings: **${readings}**

**Notable Events:**
* Hypoglycemic episodes (<70): **${hypoEvents}**
* Hyperglycemic episodes (>250): **${hyperEvents}**

**Medication & Nutrition:**
* Total Insulin (7 days): **${totalInsulin} units**
* Average Carbs per meal: **${avgCarbs}g**

### **📈 Assessment:**
${timeInRange >= 70 ? '✅ **Excellent glucose control!** Time in range is optimal.' : 
  timeInRange >= 50 ? '⚠️ **Moderate control.** Consider reviewing insulin doses and meal timing.' :
  '⚠️ **Glucose control needs attention.** Recommend consultation with healthcare provider.'}

${hypoEvents > 3 ? `⚠️ **Note:** ${hypoEvents} hypoglycemic events detected. Consider adjusting basal insulin or meal timing.\n` : ''}
${hyperEvents > 5 ? `⚠️ **Note:** ${hyperEvents} hyperglycemic events detected. Consider reviewing carb counting and bolus doses.\n` : ''}

### **📧 Email Status:**
Report has been sent to both doctors:
* ${weeklyData.patientName}'s care team
* ayatkhan1311@gmail.com
* tafreed.ahmed787@gmail.com

The doctors will receive a detailed HTML report with charts and full analysis.`;
  }

  // Call Orchestrator (Gemini - Routes to specialists)
  async callOrchestrator(message: string, imageBase64?: string): Promise<AgentResponse> {
    try {
      const context = dataStore.getAgentContext();

      // Enhanced routing logic
      const messageLower = message.toLowerCase();

      // Direct routing based on keywords
      if (imageBase64 || messageLower.includes("meal") || messageLower.includes("food") || 
          messageLower.includes("carb") || messageLower.includes("insulin dose")) {
        return await this.callNutritionist(message, imageBase64);
      }

      if (messageLower.includes("trend") || messageLower.includes("pattern") || 
          messageLower.includes("week") || messageLower.includes("exercise") ||
          messageLower.includes("lifestyle") || messageLower.includes("sleep")) {
        return await this.callCoach(message);
      }

      if (messageLower.includes("doctor") || messageLower.includes("report") || 
          messageLower.includes("email") || messageLower.includes("send")) {
        return await this.callSecretary(message);
      }

      if (messageLower.includes("glucose") || messageLower.includes("bgl") || 
          messageLower.includes("sugar") || messageLower.includes("alert")) {
        const latest = context.recentReadings[context.recentReadings.length - 1];
        if (latest) {
          return await this.callGuardian(latest.bgl, latest.trend, context.currentIOB);
        }
      }

      // Default: Use orchestrator for general conversation
      const response = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          message,
          context: {
            latestBGL: context.recentReadings[context.recentReadings.length - 1]?.bgl,
            statistics: context.statistics,
            profile: context.profile
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Orchestrator error: ${response.status}`);
      }

      const data = await response.json();

      // Try to parse if orchestrator wants to delegate
      let finalResponse = data.response;
      try {
        const parsed = JSON.parse(data.response);
        
        // If returning JSON with response field, extract it
        if (parsed.response) {
          finalResponse = parsed.response || "I'm here to help! What would you like to know?";
        }
        
        // If orchestrator wants to delegate
        if (parsed.agent && parsed.agent !== "orchestrator") {
          switch (parsed.agent) {
            case "guardian":
              if (context.recentReadings.length > 0) {
                const latest = context.recentReadings[context.recentReadings.length - 1];
                return await this.callGuardian(latest.bgl, latest.trend, context.currentIOB);
              }
              break;
            case "nutritionist":
              return await this.callNutritionist(message, imageBase64);
            case "coach":
              return await this.callCoach(message);
            case "secretary":
              return await this.callSecretary(message);
          }
        }
      } catch (e) {
        // Not JSON, use as is
      }

      dataStore.addAgentInteraction({
        agent: "orchestrator",
        message,
        response: finalResponse
      });

      return {
        agent: "orchestrator",
        content: finalResponse
      };
    } catch (error) {
      console.error("Orchestrator error:", error);
      throw error;
    }
  }
}

export const agentService = new AgentService();

