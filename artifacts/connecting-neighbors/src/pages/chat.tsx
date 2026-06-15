import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListConversations, 
  useListMessages, 
  useSendMessage, 
  useListUsers, 
  getListConversationsQueryKey, 
  getListMessagesQueryKey 
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeNeighborId, setActiveNeighborId] = useState<number | null>(null);
  const [activeNeighbor, setActiveNeighbor] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations (poll every 4 seconds for new messages)
  const { data: conversations } = useListConversations({
    query: { 
      queryKey: getListConversationsQueryKey(),
      refetchInterval: 4000 
    }
  });

  // Fetch messages in active thread (poll every 2 seconds when open)
  const { data: messages } = useListMessages(activeNeighborId!, {
    query: { 
      queryKey: getListMessagesQueryKey(activeNeighborId!),
      enabled: activeNeighborId !== null,
      refetchInterval: 2000
    }
  });

  // Fetch all users to start a new chat
  const { data: users } = useListUsers();

  const sendMessage = useSendMessage();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || activeNeighborId === null) return;

    sendMessage.mutate({
      data: {
        receiverId: activeNeighborId,
        content: newMessage.trim()
      }
    }, {
      onSuccess: () => {
        setNewMessage("");
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeNeighborId) });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to send message", variant: "destructive" });
      }
    });
  };

  const handleStartChat = (user: any) => {
    setActiveNeighborId(user.id);
    setActiveNeighbor(user);
    setNewChatOpen(false);
    setContactSearch("");
    
    // Check if conversation already exists in lists, if not invalidates
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
  };

  // Set first conversation as active initially if no active chat
  useEffect(() => {
    if (conversations && conversations.length > 0 && activeNeighborId === null) {
      const first = conversations[0];
      setActiveNeighborId(first.neighbor.id);
      setActiveNeighbor(first.neighbor);
    }
  }, [conversations, activeNeighborId]);

  // Filter contacts
  const filteredContacts = users?.filter(u => 
    u.id !== currentUser?.id && 
    (u.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
     u.username.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] flex rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Sidebar Chat List */}
      <div className="w-full md:w-80 border-r flex flex-col bg-muted/10">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <h2 className="font-bold text-lg">Messages</h2>
          <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 overflow-hidden max-w-sm">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>New Chat</DialogTitle>
              </DialogHeader>
              <div className="p-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search neighbors..." 
                    className="pl-9"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredContacts?.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">No neighbors found</div>
                  ) : (
                    filteredContacts?.map((u) => (
                      <button 
                        key={u.id} 
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                        onClick={() => handleStartChat(u)}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatarUrl || undefined} />
                          <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">@{u.username} {u.apartment && `• ${u.apartment}`}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto opacity-30 mb-3" />
              <p className="text-sm">No conversations yet.</p>
              <Button size="sm" variant="link" className="mt-1" onClick={() => setNewChatOpen(true)}>Start a chat</Button>
            </div>
          ) : (
            conversations?.map((conv) => {
              const isActive = activeNeighborId === conv.neighbor.id;
              return (
                <button
                  key={conv.neighbor.id}
                  onClick={() => {
                    setActiveNeighborId(conv.neighbor.id);
                    setActiveNeighbor(conv.neighbor);
                  }}
                  className={`w-full flex gap-3 p-3 rounded-xl transition-colors items-start text-left ${
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={conv.neighbor.avatarUrl || undefined} />
                    <AvatarFallback>{conv.neighbor.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-1">
                      <span className="font-semibold text-sm truncate">{conv.neighbor.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conv.lastMessage.createdAt))}
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {conv.lastMessage.senderId === currentUser?.id ? "You: " : ""}
                      {conv.lastMessage.content}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="h-5 w-5 shrink-0 rounded-full bg-primary text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className={`flex-1 flex flex-col bg-background ${activeNeighborId === null ? "hidden md:flex" : "flex"}`}>
        {activeNeighborId === null ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <MessageSquare className="h-16 w-16 opacity-10 mb-4 animate-bounce" />
            <h3 className="font-semibold text-lg text-foreground">Select a Conversation</h3>
            <p className="text-sm max-w-xs text-center mt-1">Choose a neighbor from the list or start a new chat thread.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activeNeighbor?.avatarUrl || undefined} />
                  <AvatarFallback>{activeNeighbor?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground text-sm truncate">{activeNeighbor?.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {activeNeighbor?.apartment ? `Apartment: ${activeNeighbor.apartment}` : "Neighbor"}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-muted-foreground" 
                onClick={() => {
                  setActiveNeighborId(null);
                  setActiveNeighbor(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages?.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[9px] mt-1 text-right ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-4 border-t flex gap-2 bg-muted/5">
              <Input 
                placeholder="Type a message..." 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                disabled={sendMessage.isPending}
              />
              <Button type="submit" size="icon" disabled={sendMessage.isPending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
