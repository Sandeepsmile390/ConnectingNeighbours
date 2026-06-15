import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListConversations, 
  useListMessages, 
  useSendMessage, 
  useEditMessage,
  useDeleteMessage,
  useListUsers, 
  getListConversationsQueryKey, 
  getListMessagesQueryKey 
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, Search, Plus, X, Pencil, Trash2, Mic, Paperclip, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  // Editing and voice recording states
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
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
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();

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
        content: newMessage.trim(),
        messageType: "text"
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

  // WhatsApp Features logic

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          sendMessage.mutate({
            data: {
              receiverId: activeNeighborId!,
              content: "Voice Message",
              messageType: "voice",
              fileUrl: base64Data,
            }
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeNeighborId!) });
              queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
            },
            onError: () => {
              toast({ title: "Failed to send voice note", variant: "destructive" });
            }
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Microphone Access Denied", description: "Please enable microphone permissions in your browser.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Document Attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload files smaller than 2MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      sendMessage.mutate({
        data: {
          receiverId: activeNeighborId!,
          content: `Sent a document: ${file.name}`,
          messageType: "document",
          fileUrl: base64Data,
          fileName: file.name
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeNeighborId!) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to upload file", variant: "destructive" });
        }
      });
    };
  };

  // Edit Message
  const handleEditSave = (msgId: number) => {
    if (!editingText.trim()) return;

    editMessage.mutate({
      messageId: msgId,
      data: { content: editingText.trim() }
    }, {
      onSuccess: () => {
        setEditingMessageId(null);
        setEditingText("");
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeNeighborId!) });
      },
      onError: () => {
        toast({ title: "Failed to edit message", variant: "destructive" });
      }
    });
  };

  // Delete Message
  const handleDelete = (msgId: number) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    deleteMessage.mutate({
      messageId: msgId
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeNeighborId!) });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to delete message", variant: "destructive" });
      }
    });
  };

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
                      {conv.lastMessage.isDeleted ? "This message was deleted" : conv.lastMessage.content}
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
                const isEditing = editingMessageId === msg.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`group relative max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none"
                    } ${msg.isDeleted ? "opacity-60 bg-muted/40 text-muted-foreground border border-dashed" : ""}`}>
                      {/* Hover action menu for own active messages */}
                      {isMe && !msg.isDeleted && !isEditing && (
                        <div className="absolute right-0 top-0 -translate-y-8 bg-background border rounded-lg shadow-md flex items-center p-0.5 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            type="button"
                            className="h-6 w-6 rounded text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.content); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            type="button"
                            className="h-6 w-6 rounded text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(msg.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Content rendering */}
                      {msg.isDeleted ? (
                        <p className="italic text-muted-foreground flex items-center gap-1.5 py-0.5">
                          <X className="h-4 w-4 opacity-50" />
                          This message was deleted
                        </p>
                      ) : isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px] py-1">
                          <Input 
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="h-8 text-foreground"
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              type="button"
                              className="h-6 px-2 text-xs" 
                              onClick={() => setEditingMessageId(null)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              type="button"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleEditSave(msg.id)}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.messageType === "voice" ? (
                            <div className="flex flex-col gap-1 py-1">
                              <audio src={msg.fileUrl || undefined} controls className="h-10 max-w-[240px] rounded-lg" />
                              <p className="text-[10px] text-muted-foreground">Voice Message</p>
                            </div>
                          ) : msg.messageType === "document" ? (
                            <div className="flex items-center gap-3 bg-background/5 border border-foreground/10 rounded-xl p-3 my-1">
                              <FileText className="h-8 w-8 text-primary shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs truncate">{msg.fileName || "document"}</p>
                                <p className="text-[10px] text-muted-foreground">Document Attachment</p>
                              </div>
                              <a 
                                href={msg.fileUrl || undefined} 
                                download={msg.fileName || "document"}
                                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors shrink-0"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </>
                      )}

                      <div className="flex justify-end items-center gap-1 mt-1">
                        {msg.isEdited && !msg.isDeleted && (
                          <span className={`text-[8px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                            (edited)
                          </span>
                        )}
                        <p className={`text-[9px] text-right ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-4 border-t flex flex-col gap-2 bg-muted/5">
              <form onSubmit={handleSend} className="flex gap-2 items-center">
                {/* File Attachment Uploader */}
                <label className="cursor-pointer shrink-0">
                  <input 
                    type="file" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                  />
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                    <Paperclip className="h-4 w-4" />
                  </div>
                </label>

                {/* Voice Recorder Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`h-9 w-9 rounded-full shrink-0 ${isRecording ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  <Mic className="h-4 w-4" />
                </Button>

                {isRecording ? (
                  <div className="flex-1 px-3 py-2 text-sm text-red-500 animate-pulse font-medium">
                    Recording voice... Click Mic to send
                  </div>
                ) : (
                  <Input 
                    placeholder="Type a message..." 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    disabled={sendMessage.isPending}
                  />
                )}

                <Button type="submit" size="icon" disabled={sendMessage.isPending || (!newMessage.trim() && !isRecording)}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
