import { ReactNode } from "react";

interface AgentStatusProps {
  name: string;
  icon: ReactNode;
  description: string;
  status: "active" | "ready" | "idle";
  color: "primary" | "success" | "destructive";
}

export const AgentStatus = ({ name, icon, description, status, color }: AgentStatusProps) => {
  const statusColors = {
    active: "bg-success",
    ready: "bg-primary",
    idle: "bg-muted-foreground",
  };

  const bgColors = {
    primary: "bg-primary/10",
    success: "bg-success/10",
    destructive: "bg-destructive/10",
  };

  const textColors = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth cursor-pointer">
      <div className={`p-2 ${bgColors[color]} rounded-lg`}>
        <div className={textColors[color]}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]} ${status === 'active' ? 'animate-pulse' : ''}`} />
      </div>
    </div>
  );
};
