/**
 * In-Memory Data Store for Glucós
 * Manages patient data without requiring a database
 * Implements agentic memory and context management
 */

export interface GlucoseReading {
  timestamp: Date;
  bgl: number;
  trend: string;
  insulinOnBoard: number;
  notes?: string;
}

export interface MealLog {
  timestamp: Date;
  description: string;
  imageBase64?: string;
  carbs?: number;
  protein?: number;
  fat?: number;
  insulinDose?: number;
}

export interface MedicationLog {
  timestamp: Date;
  type: "basal" | "bolus";
  units: number;
  notes?: string;
}

export interface UserProfile {
  name: string;
  icr: string; // Insulin-to-Carb Ratio (e.g., "1:10")
  isf: number; // Insulin Sensitivity Factor
  targetBGL: number;
  basalRate: number;
  doctorEmail?: string;
}

export interface AgentInteraction {
  timestamp: Date;
  agent: string;
  message: string;
  response: string;
}

class DataStore {
  private glucoseReadings: GlucoseReading[] = [];
  private mealLogs: MealLog[] = [];
  private medicationLogs: MedicationLog[] = [];
  private agentInteractions: AgentInteraction[] = [];
  private userProfile: UserProfile = {
    name: "Patient",
    icr: "1:10",
    isf: 50,
    targetBGL: 120,
    basalRate: 1.0,
    doctorEmail: "ayatkhan1311@gmail.com"
  };

  // Emergency contact doctors
  private emergencyDoctors: string[] = [
    "ayatkhan1311@gmail.com",
    "tafreed.ahmed787@gmail.com"
  ];

  // Glucose Readings
  addGlucoseReading(reading: Omit<GlucoseReading, "timestamp">) {
    this.glucoseReadings.push({
      ...reading,
      timestamp: new Date()
    });
    // Keep only last 1000 readings
    if (this.glucoseReadings.length > 1000) {
      this.glucoseReadings.shift();
    }
  }

  getGlucoseReadings(hours: number = 24): GlucoseReading[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.glucoseReadings.filter(r => r.timestamp >= cutoff);
  }

  getLatestGlucoseReading(): GlucoseReading | null {
    return this.glucoseReadings.length > 0
      ? this.glucoseReadings[this.glucoseReadings.length - 1]
      : null;
  }

  // Meal Logs
  addMealLog(meal: Omit<MealLog, "timestamp">) {
    this.mealLogs.push({
      ...meal,
      timestamp: new Date()
    });
  }

  getMealLogs(hours: number = 24): MealLog[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.mealLogs.filter(m => m.timestamp >= cutoff);
  }

  // Medication Logs
  addMedicationLog(medication: Omit<MedicationLog, "timestamp">) {
    this.medicationLogs.push({
      ...medication,
      timestamp: new Date()
    });
  }

  getMedicationLogs(hours: number = 24): MedicationLog[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.medicationLogs.filter(m => m.timestamp >= cutoff);
  }

  // Calculate Insulin on Board
  getInsulinOnBoard(): number {
    const now = new Date();
    const recentMeds = this.medicationLogs.filter(m => {
      const hoursSince = (now.getTime() - m.timestamp.getTime()) / (1000 * 60 * 60);
      return hoursSince <= 5 && m.type === "bolus"; // Insulin active for ~5 hours
    });

    return recentMeds.reduce((total, med) => {
      const hoursSince = (now.getTime() - med.timestamp.getTime()) / (1000 * 60 * 60);
      const remaining = med.units * Math.max(0, (5 - hoursSince) / 5); // Linear decay
      return total + remaining;
    }, 0);
  }

  // Agent Interactions
  addAgentInteraction(interaction: Omit<AgentInteraction, "timestamp">) {
    this.agentInteractions.push({
      ...interaction,
      timestamp: new Date()
    });
  }

  getAgentInteractions(limit: number = 50): AgentInteraction[] {
    return this.agentInteractions.slice(-limit);
  }

  // User Profile
  getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  updateUserProfile(updates: Partial<UserProfile>) {
    this.userProfile = { ...this.userProfile, ...updates };
  }

  // Emergency Doctors
  getEmergencyDoctors(): string[] {
    return [...this.emergencyDoctors];
  }

  addEmergencyDoctor(email: string) {
    if (!this.emergencyDoctors.includes(email)) {
      this.emergencyDoctors.push(email);
    }
  }

  removeEmergencyDoctor(email: string) {
    this.emergencyDoctors = this.emergencyDoctors.filter(e => e !== email);
  }

  // Analytics & Statistics
  getStatistics(hours: number = 168): { // Default 7 days
    avgBGL: number;
    timeInRange: number;
    timeAboveRange: number;
    timeBelowRange: number;
    hypoEvents: number;
    hyperEvents: number;
    readings: number;
    avgCarbs: number;
    totalInsulin: number;
  } {
    const readings = this.getGlucoseReadings(hours);
    const meals = this.getMealLogs(hours);
    const meds = this.getMedicationLogs(hours);

    if (readings.length === 0) {
      return {
        avgBGL: 0,
        timeInRange: 0,
        timeAboveRange: 0,
        timeBelowRange: 0,
        hypoEvents: 0,
        hyperEvents: 0,
        readings: 0,
        avgCarbs: 0,
        totalInsulin: 0
      };
    }

    const total = readings.reduce((sum, r) => sum + r.bgl, 0);
    const avgBGL = total / readings.length;

    const inRange = readings.filter(r => r.bgl >= 70 && r.bgl <= 180).length;
    const aboveRange = readings.filter(r => r.bgl > 180).length;
    const belowRange = readings.filter(r => r.bgl < 70).length;

    const hypoEvents = readings.filter(r => r.bgl < 70).length;
    const hyperEvents = readings.filter(r => r.bgl > 250).length;

    const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const avgCarbs = meals.length > 0 ? totalCarbs / meals.length : 0;

    const totalInsulin = meds.reduce((sum, m) => sum + m.units, 0);

    return {
      avgBGL: Math.round(avgBGL),
      timeInRange: Math.round((inRange / readings.length) * 100),
      timeAboveRange: Math.round((aboveRange / readings.length) * 100),
      timeBelowRange: Math.round((belowRange / readings.length) * 100),
      hypoEvents,
      hyperEvents,
      readings: readings.length,
      avgCarbs: Math.round(avgCarbs),
      totalInsulin: Math.round(totalInsulin * 10) / 10
    };
  }

  // Get context for agents
  getAgentContext(): {
    recentReadings: GlucoseReading[];
    recentMeals: MealLog[];
    currentIOB: number;
    profile: UserProfile;
    statistics: ReturnType<typeof this.getStatistics>;
  } {
    return {
      recentReadings: this.getGlucoseReadings(4), // Last 4 hours
      recentMeals: this.getMealLogs(8), // Last 8 hours
      currentIOB: this.getInsulinOnBoard(),
      profile: this.getUserProfile(),
      statistics: this.getStatistics(168) // Last 7 days
    };
  }

  // Clear old data (optional cleanup)
  clearOldData(days: number = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    this.glucoseReadings = this.glucoseReadings.filter(r => r.timestamp >= cutoff);
    this.mealLogs = this.mealLogs.filter(m => m.timestamp >= cutoff);
    this.medicationLogs = this.medicationLogs.filter(m => m.timestamp >= cutoff);
    this.agentInteractions = this.agentInteractions.filter(i => i.timestamp >= cutoff);
  }

  // Export/Import for persistence (localStorage)
  exportData() {
    return {
      glucoseReadings: this.glucoseReadings,
      mealLogs: this.mealLogs,
      medicationLogs: this.medicationLogs,
      agentInteractions: this.agentInteractions,
      userProfile: this.userProfile,
      emergencyDoctors: this.emergencyDoctors
    };
  }

  importData(data: any) {
    if (data.glucoseReadings) {
      this.glucoseReadings = data.glucoseReadings.map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp)
      }));
    }
    if (data.mealLogs) {
      this.mealLogs = data.mealLogs.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    }
    if (data.medicationLogs) {
      this.medicationLogs = data.medicationLogs.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    }
    if (data.agentInteractions) {
      this.agentInteractions = data.agentInteractions.map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp)
      }));
    }
    if (data.userProfile) {
      this.userProfile = data.userProfile;
    }
    if (data.emergencyDoctors) {
      this.emergencyDoctors = data.emergencyDoctors;
    }
  }
}

// Singleton instance
export const dataStore = new DataStore();

// Auto-save to localStorage
if (typeof window !== "undefined") {
  // Load data on init
  const savedData = localStorage.getItem("glucos-data");
  if (savedData) {
    try {
      dataStore.importData(JSON.parse(savedData));
    } catch (e) {
      console.error("Failed to load saved data:", e);
    }
  }

  // Save data every 30 seconds
  setInterval(() => {
    try {
      localStorage.setItem("glucos-data", JSON.stringify(dataStore.exportData()));
    } catch (e) {
      console.error("Failed to save data:", e);
    }
  }, 30000);

  // Save on page unload
  window.addEventListener("beforeunload", () => {
    try {
      localStorage.setItem("glucos-data", JSON.stringify(dataStore.exportData()));
    } catch (e) {
      console.error("Failed to save data:", e);
    }
  });
}

