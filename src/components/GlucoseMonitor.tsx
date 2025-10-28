import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Activity, PlayCircle, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { cgmSimulator } from "@/services/cgmSimulator";
import { dataStore } from "@/services/dataStore";
import { agentService } from "@/services/agentService";

interface GlucoseMonitorProps {
  onAlertAgent: (agent: string | null) => void;
}

export const GlucoseMonitor = ({ onAlertAgent }: GlucoseMonitorProps) => {
  const [bgl, setBgl] = useState<string>("");
  const [trend, setTrend] = useState<string>("steady");
  const [insulinOnBoard, setInsulinOnBoard] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastReading, setLastReading] = useState<{ bgl: number; time: string; trend: string } | null>(null);
  const [cgmActive, setCgmActive] = useState(false);

  // Update display with latest reading
  useEffect(() => {
    const interval = setInterval(() => {
      const latest = dataStore.getLatestGlucoseReading();
      if (latest) {
        setLastReading({
          bgl: latest.bgl,
          time: latest.timestamp.toLocaleTimeString(),
          trend: latest.trend
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize CGM on mount
  useEffect(() => {
    cgmSimulator.start((alert) => {
      if (alert.severity === "critical") {
        toast.error(alert.message, {
          duration: 10000,
          className: "bg-destructive text-destructive-foreground"
        });
      } else if (alert.severity === "warning") {
        toast.warning(alert.message, {
          duration: 8000
        });
      }
    });
    setCgmActive(true);

    return () => {
      cgmSimulator.stop();
    };
  }, []);

  const toggleCGM = () => {
    if (cgmActive) {
      cgmSimulator.stop();
      setCgmActive(false);
      toast.info("CGM simulation stopped");
    } else {
      cgmSimulator.start((alert) => {
        if (alert.severity === "critical") {
          toast.error(alert.message, {
            duration: 10000
          });
        } else if (alert.severity === "warning") {
          toast.warning(alert.message, {
            duration: 8000
          });
        }
      });
      setCgmActive(true);
      toast.success("CGM simulation started");
    }
  };

  const analyzeBgl = async () => {
    if (!bgl) {
      toast.error("Please enter a blood glucose reading");
      return;
    }

    setIsAnalyzing(true);
    onAlertAgent("Guardian");

    try {
      // Add manual reading
      const iob = parseFloat(insulinOnBoard) || dataStore.getInsulinOnBoard();
      cgmSimulator.addManualReading(parseFloat(bgl), trend as any, iob);

      // Get Guardian analysis
      const response = await agentService.callGuardian(
        parseFloat(bgl),
        trend,
        iob
      );

      if (response.metadata?.alert) {
        toast.error(response.content, {
          description: response.metadata.reasoning,
          duration: 10000,
        });
      } else {
        toast.success("Glucose level analyzed", {
          description: response.metadata?.prediction || "Level within acceptable range",
        });
      }

      setLastReading({
        bgl: parseFloat(bgl),
        time: new Date().toLocaleTimeString(),
        trend
      });
      
      setBgl("");
    } catch (error) {
      console.error("Guardian analysis error:", error);
      toast.error("Failed to analyze glucose level");
    } finally {
      setIsAnalyzing(false);
      onAlertAgent(null);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
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
  };

  const getBGLColor = (bgl: number) => {
    if (bgl < 70) return "text-destructive";
    if (bgl < 80) return "text-warning";
    if (bgl > 180) return "text-warning";
    if (bgl > 250) return "text-destructive";
    return "text-success";
  };

  return (
    <Card className="p-6 shadow-medium transition-smooth hover:shadow-glow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <Activity className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Glucose Monitor</h2>
            <p className="text-sm text-muted-foreground">
              {cgmActive ? "CGM Active 🟢" : "CGM Paused"}
            </p>
          </div>
        </div>
        <Button
          variant={cgmActive ? "destructive" : "default"}
          size="sm"
          onClick={toggleCGM}
        >
          {cgmActive ? (
            <>
              <StopCircle className="w-4 h-4 mr-1" />
              Stop
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-1" />
              Start
            </>
          )}
        </Button>
      </div>

      {lastReading && (
        <div className="mb-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-3xl font-bold ${getBGLColor(lastReading.bgl)}`}>
                  {lastReading.bgl}
                </p>
                <span className="text-2xl">{getTrendIcon(lastReading.trend)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                mg/dL at {lastReading.time}
              </p>
              <p className="text-xs text-muted-foreground">
                IOB: {dataStore.getInsulinOnBoard().toFixed(1)}u
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              lastReading.bgl >= 70 && lastReading.bgl <= 180
                ? "bg-success/10"
                : "bg-warning/10"
            }`}>
              <Activity className={`w-6 h-6 ${
                lastReading.bgl >= 70 && lastReading.bgl <= 180
                  ? "text-success"
                  : "text-warning"
              }`} />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="bgl">Blood Glucose Level (mg/dL)</Label>
          <Input
            id="bgl"
            type="number"
            placeholder="120"
            value={bgl}
            onChange={(e) => setBgl(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="trend">Trend</Label>
          <select
            id="trend"
            value={trend}
            onChange={(e) => setTrend(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md transition-smooth focus:ring-2 focus:ring-primary"
          >
            <option value="steady">Steady →</option>
            <option value="up">Rising ↗</option>
            <option value="down">Falling ↘</option>
            <option value="double_up">Rising Fast ⇈</option>
            <option value="double_down">Falling Fast ⇊</option>
          </select>
        </div>

        <div>
          <Label htmlFor="insulin">Insulin on Board (units)</Label>
          <Input
            id="insulin"
            type="number"
            step="0.1"
            placeholder="0"
            value={insulinOnBoard}
            onChange={(e) => setInsulinOnBoard(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button
          onClick={analyzeBgl}
          disabled={isAnalyzing}
          className="w-full bg-gradient-to-r from-destructive to-accent hover:opacity-90 transition-smooth"
        >
          {isAnalyzing ? (
            <>
              <Activity className="w-4 h-4 mr-2 animate-pulse" />
              Guardian Analyzing...
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 mr-2" />
              Check Glucose Status
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
