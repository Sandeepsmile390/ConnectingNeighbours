import { useState, useRef, useEffect } from "react";
import { useQueryAiAssistant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Bot, User, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  {
    title: "Upcoming Events",
    description: "What community events are happening this week?",
    prompt: "What community events are happening this week or in the near future?",
  },
  {
    title: "Marketplace Items",
    description: "Are there any items for sale or free?",
    prompt: "Show me all active listings in the marketplace, including prices.",
  },
  {
    title: "Neighborhood Safety",
    description: "Are there any active safety alerts?",
    prompt: "Are there any active safety alerts or warnings in the neighborhood?",
  },
  {
    title: "Shared Resources",
    description: "What resources can I borrow?",
    prompt: "What shared resources are currently available to borrow?",
  },
];

export default function Assistant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const aiQuery = useQueryAiAssistant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiQuery.isPending]);

  const handleSend = (text: string) => {
    if (!text.trim() || aiQuery.isPending) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    aiQuery.mutate(
      {
        data: {
          message: text.trim(),
        },
      },
      {
        onSuccess: (data) => {
          const assistantMsg: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        },
        onError: (err: any) => {
          toast({
            title: "Assistant Error",
            description: err.message || "Failed to get response from Gemini AI. Ensure the server has GEMINI_API_KEY set.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] max-w-4xl mx-auto border rounded-2xl bg-card shadow-lg overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full blur opacity-75 animate-pulse" />
            <Avatar className="h-10 w-10 border border-primary/20 relative">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg flex items-center gap-1.5 text-foreground">
              Neighborhood AI Guide
              <Sparkles className="h-4 w-4 text-indigo-500 fill-indigo-500" />
            </h1>
            <p className="text-xs text-muted-foreground">Ask me about listings, events, safety alerts, or neighbors</p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground hover:text-destructive gap-1.5"
            title="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear Chat</span>
          </Button>
        )}
      </div>

      {/* Messages / Welcome Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-muted/5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center max-w-2xl mx-auto space-y-8 py-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-2">
                <Sparkles className="h-8 w-8 animate-bounce text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Hello, {user?.name || "Neighbor"}!</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                I'm your hyperlocal AI Guide. I have access to real-time neighborhood information from our database. Ask me anything!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {QUICK_PROMPTS.map((qp, idx) => (
                <Card
                  key={idx}
                  className="hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] cursor-pointer transition-all duration-200 group relative overflow-hidden"
                  onClick={() => handleSend(qp.prompt)}
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-indigo-500 transition-colors">
                        {qp.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {qp.description}
                      </p>
                    </div>
                    <div className="flex items-center text-xs text-indigo-500 font-medium pt-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      Ask guide
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <Avatar className="h-8 w-8 shrink-0 mt-0.5 border">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Bot className="h-4 w-4 text-indigo-500" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`max-w-[80%] flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed whitespace-pre-line ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground border rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span
                      className={`text-[10px] text-muted-foreground mt-1 px-1 ${
                        isUser ? "self-end" : "self-start"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {isUser && (
                    <Avatar className="h-8 w-8 shrink-0 mt-0.5 border">
                      <AvatarImage src={user?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}

            {aiQuery.isPending && (
              <div className="flex gap-3.5 justify-start">
                <Avatar className="h-8 w-8 shrink-0 border">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4 text-indigo-500" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted text-foreground border rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm flex items-center gap-1.5">
                  <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about the neighborhood..."
            className="flex-1 bg-background"
            disabled={aiQuery.isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={aiQuery.isPending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
