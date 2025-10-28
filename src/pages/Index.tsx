import { useState } from "react";
import { Activity, Brain, Utensils, Heart, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GlucoseMonitor } from "@/components/GlucoseMonitor";
import { ChatInterface } from "@/components/ChatInterface";
import { AgentStatus } from "@/components/AgentStatus";
import { StatsDashboard } from "@/components/StatsDashboard";
import { DoctorContacts } from "@/components/DoctorContacts";
import { QuickActions } from "@/components/QuickActions";

const Index = () => {
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-primary-glow rounded-xl shadow-glow">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-medical">Glucós</h1>
                <p className="text-sm text-muted-foreground">Your AI Diabetes Care Team</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Welcome Back</p>
              <p className="text-xs text-muted-foreground">5 agents active</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Monitoring */}
          <div className="lg:col-span-1 space-y-6">
            <GlucoseMonitor onAlertAgent={setActiveAgent} />
            
            {/* Stats Dashboard */}
            <StatsDashboard />
            
            {/* Quick Actions for Insulin & Meals */}
            <QuickActions />
            
            {/* Doctor Contacts Management */}
            <DoctorContacts />
            
            {/* Agent Team Cards */}
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold text-lg mb-4">Your AI Care Team</h2>
              
              <AgentStatus
                name="Guardian"
                icon={<Heart className="w-5 h-5" />}
                description="24/7 glucose monitoring"
                status="active"
                color="destructive"
              />
              
              <AgentStatus
                name="Nutritionist"
                icon={<Utensils className="w-5 h-5" />}
                description="Meal analysis & planning"
                status="ready"
                color="primary"
              />
              
              <AgentStatus
                name="Coach"
                icon={<Brain className="w-5 h-5" />}
                description="Lifestyle optimization"
                status="ready"
                color="primary"
              />
              
              <AgentStatus
                name="Secretary"
                icon={<Mail className="w-5 h-5" />}
                description="Doctor communications"
                status="ready"
                color="primary"
              />
            </Card>
          </div>

          {/* Right Column - Chat Interface */}
          <div className="lg:col-span-2">
            <ChatInterface activeAgent={activeAgent} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
