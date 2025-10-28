import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { dataStore } from "@/services/dataStore";
import { TrendingUp, TrendingDown, Activity, Droplet } from "lucide-react";

export const StatsDashboard = () => {
  const [stats, setStats] = useState({
    avgBGL: 0,
    timeInRange: 0,
    timeAboveRange: 0,
    timeBelowRange: 0,
    hypoEvents: 0,
    hyperEvents: 0,
    readings: 0,
    avgCarbs: 0,
    totalInsulin: 0
  });

  useEffect(() => {
    const updateStats = () => {
      const newStats = dataStore.getStatistics(168); // Last 7 days
      setStats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ 
    label, 
    value, 
    unit = "", 
    icon: Icon, 
    color = "primary",
    subtitle = ""
  }: {
    label: string;
    value: number | string;
    unit?: string;
    icon: any;
    color?: string;
    subtitle?: string;
  }) => {
    const colorClasses = {
      primary: "bg-primary/10 text-primary",
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      destructive: "bg-destructive/10 text-destructive"
    };

    return (
      <div className="p-4 rounded-lg bg-gradient-to-br from-card to-card/50 border border-border/50 hover:shadow-md transition-smooth">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
          <div className={`p-1.5 rounded-md ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="w-3 h-3" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-2xl font-bold">{value}</p>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    );
  };

  const getTimeInRangeColor = (tir: number) => {
    if (tir >= 70) return "success";
    if (tir >= 50) return "warning";
    return "destructive";
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-lg mb-1">7-Day Statistics</h2>
        <p className="text-sm text-muted-foreground">
          {stats.readings} readings tracked
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Avg Glucose"
          value={stats.avgBGL || "--"}
          unit="mg/dL"
          icon={Activity}
          color={
            stats.avgBGL >= 70 && stats.avgBGL <= 180
              ? "success"
              : stats.avgBGL > 0
              ? "warning"
              : "primary"
          }
        />

        <StatCard
          label="Time in Range"
          value={stats.timeInRange || "--"}
          unit="%"
          icon={TrendingUp}
          color={getTimeInRangeColor(stats.timeInRange)}
          subtitle="70-180 mg/dL"
        />

        <StatCard
          label="High Events"
          value={stats.hyperEvents || 0}
          icon={TrendingUp}
          color={stats.hyperEvents > 5 ? "warning" : "primary"}
          subtitle="> 250 mg/dL"
        />

        <StatCard
          label="Low Events"
          value={stats.hypoEvents || 0}
          icon={TrendingDown}
          color={stats.hypoEvents > 3 ? "destructive" : "primary"}
          subtitle="< 70 mg/dL"
        />

        <StatCard
          label="Total Insulin"
          value={stats.totalInsulin || "--"}
          unit="u"
          icon={Droplet}
          color="primary"
          subtitle="7 days"
        />

        <StatCard
          label="Avg Carbs"
          value={stats.avgCarbs || "--"}
          unit="g"
          icon={Activity}
          color="primary"
          subtitle="per meal"
        />
      </div>

      {/* Time in Range Breakdown */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Glucose Distribution</p>
        <div className="h-4 flex rounded-lg overflow-hidden">
          <div
            className="bg-destructive"
            style={{ width: `${stats.timeBelowRange}%` }}
            title={`Below: ${stats.timeBelowRange}%`}
          />
          <div
            className="bg-success"
            style={{ width: `${stats.timeInRange}%` }}
            title={`In Range: ${stats.timeInRange}%`}
          />
          <div
            className="bg-warning"
            style={{ width: `${stats.timeAboveRange}%` }}
            title={`Above: ${stats.timeAboveRange}%`}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Below: {stats.timeBelowRange}%</span>
          <span>In Range: {stats.timeInRange}%</span>
          <span>Above: {stats.timeAboveRange}%</span>
        </div>
      </div>
    </Card>
  );
};

