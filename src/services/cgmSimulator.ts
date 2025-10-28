/**
 * CGM Simulator - Simulates continuous glucose monitoring
 * Generates realistic glucose trends and triggers Guardian alerts
 */

import { dataStore } from "./dataStore";
import { agentService } from "./agentService";

export type TrendType = "steady" | "up" | "down" | "double_up" | "double_down";

class CGMSimulator {
  private isRunning = false;
  private currentBGL = 120;
  private currentTrend: TrendType = "steady";
  private intervalId: number | null = null;
  private alertCallback?: (alert: { severity: string; message: string }) => void;

  start(onAlert?: (alert: { severity: string; message: string }) => void) {
    if (this.isRunning) return;

    this.alertCallback = onAlert;
    this.isRunning = true;

    // Load last reading if available
    const lastReading = dataStore.getLatestGlucoseReading();
    if (lastReading) {
      this.currentBGL = lastReading.bgl;
      this.currentTrend = lastReading.trend as TrendType;
    }

    // Generate reading every 5 minutes
    this.intervalId = window.setInterval(() => {
      this.generateReading();
    }, 5 * 60 * 1000); // 5 minutes

    // Generate first reading immediately
    this.generateReading();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async generateReading() {
    // Simulate realistic glucose fluctuations
    const change = this.calculateChange();
    this.currentBGL = Math.max(40, Math.min(400, this.currentBGL + change));
    
    // Update trend based on change rate
    this.updateTrend(change);

    const reading = {
      bgl: Math.round(this.currentBGL),
      trend: this.currentTrend,
      insulinOnBoard: dataStore.getInsulinOnBoard()
    };

    // Save to data store
    dataStore.addGlucoseReading(reading);

    // Check with Guardian for alerts
    try {
      const response = await agentService.callGuardian(
        reading.bgl,
        reading.trend,
        reading.insulinOnBoard
      );

      if (response.metadata?.alert && this.alertCallback) {
        this.alertCallback({
          severity: response.metadata.severity,
          message: response.content
        });
      }
    } catch (error) {
      console.error("Guardian check failed:", error);
    }
  }

  private calculateChange(): number {
    const hour = new Date().getHours();
    const meals = dataStore.getMealLogs(1); // Last hour
    const recentMeal = meals.length > 0;
    
    // Base change rate
    let change = 0;

    // Time of day effects
    if (hour >= 6 && hour <= 8) {
      // Dawn phenomenon
      change = Math.random() * 3 + 1;
    } else if (hour >= 12 && hour <= 13) {
      // Lunch spike tendency
      change = Math.random() * 2;
    } else {
      change = (Math.random() - 0.5) * 2;
    }

    // Meal effects
    if (recentMeal) {
      change += Math.random() * 5 + 2; // Post-meal spike
    }

    // IOB effects (insulin brings it down)
    const iob = dataStore.getInsulinOnBoard();
    change -= iob * 0.5;

    // Current BGL effects (regression to mean)
    if (this.currentBGL > 180) {
      change -= 1; // Tendency to come down
    } else if (this.currentBGL < 80) {
      change += 1; // Tendency to come up
    }

    // Add some randomness
    change += (Math.random() - 0.5) * 2;

    return change;
  }

  private updateTrend(change: number) {
    const rate = change / 5; // Per minute

    if (rate > 2) {
      this.currentTrend = "double_up";
    } else if (rate > 1) {
      this.currentTrend = "up";
    } else if (rate < -2) {
      this.currentTrend = "double_down";
    } else if (rate < -1) {
      this.currentTrend = "down";
    } else {
      this.currentTrend = "steady";
    }
  }

  // Manual reading entry
  addManualReading(bgl: number, trend: TrendType, insulinOnBoard: number) {
    this.currentBGL = bgl;
    this.currentTrend = trend;
    
    dataStore.addGlucoseReading({
      bgl,
      trend,
      insulinOnBoard
    });

    // Check with Guardian
    agentService.callGuardian(bgl, trend, insulinOnBoard)
      .then(response => {
        if (response.metadata?.alert && this.alertCallback) {
          this.alertCallback({
            severity: response.metadata.severity,
            message: response.content
          });
        }
      })
      .catch(error => {
        console.error("Guardian check failed:", error);
      });
  }

  getCurrentReading() {
    return {
      bgl: Math.round(this.currentBGL),
      trend: this.currentTrend,
      insulinOnBoard: dataStore.getInsulinOnBoard()
    };
  }

  isActive() {
    return this.isRunning;
  }
}

export const cgmSimulator = new CGMSimulator();

