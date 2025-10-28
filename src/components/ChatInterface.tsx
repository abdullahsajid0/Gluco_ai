import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { agentService } from "@/services/agentService";
import { dataStore } from "@/services/dataStore";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  agent?: string;
}

interface ChatInterfaceProps {
  activeAgent: string | null;
}

export const ChatInterface = ({ activeAgent }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your Glucós AI care team. 🏥\n\n" +
        "I can help you with:\n" +
        "📸 Meal analysis - Upload a photo for carb counting\n" +
        "📊 Trend analysis - Ask about patterns in your glucose\n" +
        "✉️ Doctor reports - Generate and send weekly summaries\n" +
        "🎯 Lifestyle coaching - Get personalized advice\n\n" +
        "What can I help you with today?",
      agent: "orchestrator",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Please upload an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      setSelectedImage(base64);
      toast.success("Image uploaded! Ask me about this meal.");
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      role: "user",
      content: input || "What's in this meal?",
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    const userImage = selectedImage;
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Route through orchestrator
      const response = await agentService.callOrchestrator(
        userInput || "Analyze this meal and provide carb count and insulin recommendation",
        userImage || undefined
      );

      // Save meal if it was food-related
      if (response.agent === "nutritionist" && userImage) {
        dataStore.addMealLog({
          description: userInput || "Meal from image",
          imageBase64: userImage
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.content,
          agent: response.agent,
        },
      ]);
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = "Failed to get response from AI agents";
      if (error.message?.includes("429")) {
        errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
      } else if (error.message?.includes("402")) {
        errorMessage = "API credits needed. Please check your configuration.";
      }
      
      toast.error(errorMessage);
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
          agent: "system",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentDisplayName = (agent?: string) => {
    switch (agent) {
      case "orchestrator":
        return "Charge Nurse 👨‍⚕️";
      case "guardian":
        return "Guardian 🛡️";
      case "nutritionist":
        return "Nutritionist 🍎";
      case "coach":
        return "Coach 💪";
      case "secretary":
        return "Secretary 📋";
      default:
        return agent;
    }
  };

  return (
    <Card className="h-[calc(100vh-12rem)] flex flex-col shadow-medium">
      {/* Chat Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <p className="font-medium">
              {activeAgent ? `${activeAgent} is analyzing...` : "Multi-Agent Care Team"}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {messages.length - 1} messages
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl transition-smooth ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-auto shadow-md"
                    : "bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-sm"
                }`}
              >
                {msg.agent && msg.role === "assistant" && (
                  <p className="text-xs font-semibold mb-2 opacity-80 border-b border-current/20 pb-1">
                    {getAgentDisplayName(msg.agent)}
                  </p>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-1">
                    <ReactMarkdown
                      components={{
                        h3: ({ children }) => (
                          <h3 className="text-base font-bold text-current mt-3 mb-2">{children}</h3>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-bold text-current mt-3 mb-2">{children}</h2>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold text-current mt-3 mb-2">{children}</h1>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-current">{children}</strong>
                        ),
                        p: ({ children }) => (
                          <p className="text-sm leading-relaxed my-2 text-current">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-1 my-2 text-current">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-1 my-2 text-current">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm leading-relaxed text-current">{children}</li>
                        ),
                        code: ({ children }) => (
                          <code className="bg-black/10 px-1 py-0.5 rounded text-xs text-current">{children}</code>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-br from-secondary to-secondary/80 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-card space-y-2">
        {selectedImage && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
            <Camera className="w-4 h-4 text-primary" />
            <p className="text-sm text-primary font-medium">Image attached</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImage(null)}
              className="ml-auto"
            >
              Remove
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            <Camera className="w-4 h-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about meals, trends, or request a report..."
            className="resize-none"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            size="icon"
            className="shrink-0 bg-gradient-to-r from-primary to-primary-glow"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
