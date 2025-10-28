import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Trash2, CheckCircle } from "lucide-react";
import { dataStore } from "@/services/dataStore";
import { toast } from "sonner";

export function DoctorContacts() {
  const [doctors, setDoctors] = useState<string[]>(dataStore.getEmergencyDoctors());
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDoctor = () => {
    if (!newEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (doctors.includes(newEmail)) {
      toast.error("This doctor is already in your emergency contacts");
      return;
    }

    dataStore.addEmergencyDoctor(newEmail);
    setDoctors(dataStore.getEmergencyDoctors());
    setNewEmail("");
    setIsAdding(false);
    toast.success("Doctor added to emergency contacts!", {
      description: `${newEmail} will receive all critical alerts`,
    });
  };

  const handleRemoveDoctor = (email: string) => {
    if (doctors.length === 1) {
      toast.error("You must have at least one emergency contact");
      return;
    }

    dataStore.removeEmergencyDoctor(email);
    setDoctors(dataStore.getEmergencyDoctors());
    toast.success("Doctor removed from emergency contacts");
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border-border/50 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Emergency Doctor Contacts</h3>
          <p className="text-sm text-muted-foreground">
            Doctors who receive critical glucose alerts and weekly reports
          </p>
        </div>
      </div>

      {/* Current Doctors List */}
      <div className="space-y-3 mb-4">
        {doctors.map((email) => (
          <div
            key={email}
            className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/30 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-success" />
              <div>
                <p className="text-sm font-medium">{email}</p>
                <p className="text-xs text-muted-foreground">
                  Receives emergency alerts & weekly reports
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveDoctor(email)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={doctors.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add New Doctor */}
      {isAdding ? (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="doctor@hospital.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddDoctor();
              }
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewEmail("");
              }
            }}
            className="flex-1"
            autoFocus
          />
          <Button onClick={handleAddDoctor} size="sm">
            Add
          </Button>
          <Button
            onClick={() => {
              setIsAdding(false);
              setNewEmail("");
            }}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Doctor
        </Button>
      )}

      {/* Info Badge */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Mail className="w-4 h-4 text-blue-500 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">When alerts are sent:</p>
            <ul className="space-y-1 ml-2">
              <li>• Emergency: Glucose &lt;70 or &gt;250 mg/dL</li>
              <li>• Weekly: Every Sunday at 9 AM</li>
              <li>• On-demand: When you request a report</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

