/**
 * Test Data Generator
 * Generates realistic sample data for testing the multi-agent system
 */

import { dataStore } from "./dataStore";

export class TestDataGenerator {
  /**
   * Generate a week of realistic glucose readings
   */
  static generateWeekOfGlucoseData() {
    const now = new Date();
    const readings: any[] = [];

    // Generate 7 days of data (288 readings per day = every 5 minutes)
    for (let day = 7; day >= 0; day--) {
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - day);
          timestamp.setHours(hour, minute, 0, 0);

          const bgl = this.generateRealisticBGL(hour, minute);
          const trend = this.calculateTrend(bgl);

          readings.push({
            timestamp,
            bgl,
            trend,
            insulinOnBoard: this.calculateIOB(hour, minute)
          });
        }
      }
    }

    return readings;
  }

  /**
   * Generate realistic BGL based on time of day
   */
  private static generateRealisticBGL(hour: number, minute: number): number {
    let base = 120;

    // Dawn phenomenon (5-8 AM)
    if (hour >= 5 && hour < 8) {
      base += 20;
    }

    // Post-meal spikes
    if ((hour >= 8 && hour <= 9) || (hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 19)) {
      base += 40;
    }

    // Night time (tends to be more stable)
    if (hour >= 22 || hour < 6) {
      base -= 10;
    }

    // Add random variation
    const variation = (Math.random() - 0.5) * 30;
    const result = Math.max(60, Math.min(250, base + variation));

    return Math.round(result);
  }

  /**
   * Calculate trend based on BGL
   */
  private static calculateTrend(bgl: number): string {
    if (bgl < 80) return Math.random() > 0.5 ? "down" : "steady";
    if (bgl > 180) return Math.random() > 0.5 ? "up" : "steady";
    return "steady";
  }

  /**
   * Calculate insulin on board based on time of day
   */
  private static calculateIOB(hour: number, minute: number): number {
    // Simulate IOB after meals
    if ((hour >= 8 && hour < 12) || (hour >= 13 && hour < 17) || (hour >= 19 && hour < 23)) {
      const hoursAfterDose = (hour % 4) + (minute / 60);
      const initialDose = 5 + Math.random() * 3;
      return Math.max(0, initialDose * (1 - hoursAfterDose / 5));
    }
    return 0;
  }

  /**
   * Generate sample meals
   */
  static generateSampleMeals() {
    const meals = [
      {
        description: "Breakfast: Oatmeal with berries",
        carbs: 45,
        protein: 8,
        fat: 5,
        insulinDose: 4.5
      },
      {
        description: "Lunch: Chicken sandwich with apple",
        carbs: 55,
        protein: 30,
        fat: 12,
        insulinDose: 5.5
      },
      {
        description: "Dinner: Salmon with rice and vegetables",
        carbs: 60,
        protein: 35,
        fat: 15,
        insulinDose: 6.0
      },
      {
        description: "Snack: Greek yogurt with granola",
        carbs: 25,
        protein: 15,
        fat: 8,
        insulinDose: 2.5
      }
    ];

    const now = new Date();
    const generatedMeals: any[] = [];

    for (let day = 7; day >= 0; day--) {
      // Breakfast (8 AM)
      const breakfast = new Date(now);
      breakfast.setDate(breakfast.getDate() - day);
      breakfast.setHours(8, 0, 0, 0);
      generatedMeals.push({
        ...meals[0],
        timestamp: breakfast
      });

      // Lunch (12 PM)
      const lunch = new Date(now);
      lunch.setDate(lunch.getDate() - day);
      lunch.setHours(12, 30, 0, 0);
      generatedMeals.push({
        ...meals[1],
        timestamp: lunch
      });

      // Dinner (6 PM)
      const dinner = new Date(now);
      dinner.setDate(dinner.getDate() - day);
      dinner.setHours(18, 0, 0, 0);
      generatedMeals.push({
        ...meals[2],
        timestamp: dinner
      });

      // Random snack
      if (Math.random() > 0.5) {
        const snack = new Date(now);
        snack.setDate(snack.getDate() - day);
        snack.setHours(15, 0, 0, 0);
        generatedMeals.push({
          ...meals[3],
          timestamp: snack
        });
      }
    }

    return generatedMeals;
  }

  /**
   * Generate medication logs
   */
  static generateMedicationLogs() {
    const now = new Date();
    const medications: any[] = [];

    for (let day = 7; day >= 0; day--) {
      // Basal insulin (once daily at 10 PM)
      const basal = new Date(now);
      basal.setDate(basal.getDate() - day);
      basal.setHours(22, 0, 0, 0);
      medications.push({
        timestamp: basal,
        type: "basal" as const,
        units: 24,
        notes: "Long-acting basal insulin"
      });

      // Bolus doses (with meals)
      const breakfast = new Date(now);
      breakfast.setDate(breakfast.getDate() - day);
      breakfast.setHours(8, 0, 0, 0);
      medications.push({
        timestamp: breakfast,
        type: "bolus" as const,
        units: 4.5,
        notes: "Breakfast bolus"
      });

      const lunch = new Date(now);
      lunch.setDate(lunch.getDate() - day);
      lunch.setHours(12, 30, 0, 0);
      medications.push({
        timestamp: lunch,
        type: "bolus" as const,
        units: 5.5,
        notes: "Lunch bolus"
      });

      const dinner = new Date(now);
      dinner.setDate(dinner.getDate() - day);
      dinner.setHours(18, 0, 0, 0);
      medications.push({
        timestamp: dinner,
        type: "bolus" as const,
        units: 6.0,
        notes: "Dinner bolus"
      });
    }

    return medications;
  }

  /**
   * Populate the data store with test data
   */
  static populateTestData() {
    console.log("🧪 Generating test data...");

    // Generate glucose readings
    const readings = this.generateWeekOfGlucoseData();
    console.log(`📊 Generated ${readings.length} glucose readings`);

    // Sample every 30 minutes to avoid overwhelming the system
    const sampledReadings = readings.filter((_, index) => index % 6 === 0);
    sampledReadings.forEach(reading => {
      dataStore.addGlucoseReading({
        bgl: reading.bgl,
        trend: reading.trend,
        insulinOnBoard: reading.insulinOnBoard,
        notes: "Test data"
      });
      // Manually set timestamp (hack for testing)
      const lastReading = dataStore.getLatestGlucoseReading();
      if (lastReading) {
        (lastReading as any).timestamp = reading.timestamp;
      }
    });

    // Generate meals
    const meals = this.generateSampleMeals();
    console.log(`🍽️ Generated ${meals.length} meal logs`);
    meals.forEach(meal => {
      dataStore.addMealLog(meal);
      // Manually set timestamp
      const logs = (dataStore as any).mealLogs;
      if (logs.length > 0) {
        logs[logs.length - 1].timestamp = meal.timestamp;
      }
    });

    // Generate medications
    const medications = this.generateMedicationLogs();
    console.log(`💉 Generated ${medications.length} medication logs`);
    medications.forEach(med => {
      dataStore.addMedicationLog(med);
      // Manually set timestamp
      const logs = (dataStore as any).medicationLogs;
      if (logs.length > 0) {
        logs[logs.length - 1].timestamp = med.timestamp;
      }
    });

    const stats = dataStore.getStatistics(168);
    console.log("✅ Test data populated successfully!");
    console.log("📈 Statistics:", stats);

    return stats;
  }

  /**
   * Clear all test data
   */
  static clearTestData() {
    localStorage.removeItem("glucos-data");
    console.log("🗑️ Test data cleared. Refresh the page to start fresh.");
  }
}

// Make available globally for testing in console
if (typeof window !== "undefined") {
  (window as any).testData = TestDataGenerator;
}

