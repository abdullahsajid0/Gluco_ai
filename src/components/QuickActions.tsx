import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Syringe, Utensils } from "lucide-react";
import { dataStore } from "@/services/dataStore";
import { toast } from "sonner";

export function QuickActions() {
  const [insulinUnits, setInsulinUnits] = useState("");
  const [carbAmount, setCarbAmount] = useState("");
  const [mealDescription, setMealDescription] = useState("");

  const handleLogInsulin = () => {
    const units = parseFloat(insulinUnits);
    
    if (!units || units <= 0) {
      toast.error("Please enter a valid insulin amount");
      return;
    }

    dataStore.addMedicationLog({
      type: "bolus",
      units
    });

    toast.success(`Logged ${units} units of insulin`, {
      description: "Your insulin dose has been recorded"
    });

    setInsulinUnits("");
  };

  const handleLogMeal = () => {
    const carbs = parseFloat(carbAmount);
    
    if (!mealDescription.trim()) {
      toast.error("Please describe your meal");
      return;
    }

    if (!carbs || carbs <= 0) {
      toast.error("Please enter carb amount");
      return;
    }

    dataStore.addMealLog({
      description: mealDescription,
      carbs
    });

    toast.success(`Logged: ${mealDescription}`, {
      description: `${carbs}g carbs recorded`
    });

    setMealDescription("");
    setCarbAmount("");
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border-border/50 shadow-lg">
      <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
      
      <div className="space-y-4">
        {/* Log Insulin */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-blue-500/20 rounded">
              <Syringe className="w-4 h-4 text-blue-500" />
            </div>
            <Label className="text-sm font-medium">Log Insulin</Label>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Units"
              value={insulinUnits}
              onChange={(e) => setInsulinUnits(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogInsulin()}
              className="flex-1"
              min="0"
              step="0.5"
            />
            <Button 
              onClick={handleLogInsulin}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Log
            </Button>
          </div>
        </div>

        {/* Log Meal */}
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-green-500/20 rounded">
              <Utensils className="w-4 h-4 text-green-500" />
            </div>
            <Label className="text-sm font-medium">Log Meal</Label>
          </div>
          
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="What did you eat?"
              value={mealDescription}
              onChange={(e) => setMealDescription(e.target.value)}
              className="w-full"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Carbs (g)"
                value={carbAmount}
                onChange={(e) => setCarbAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogMeal()}
                className="flex-1"
                min="0"
                step="1"
              />
              <Button 
                onClick={handleLogMeal}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Log
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Quick logging:</strong> Instantly record insulin doses and meals. Data appears in your Stats Dashboard immediately.
        </p>
      </div>
    </Card>
  );
}

