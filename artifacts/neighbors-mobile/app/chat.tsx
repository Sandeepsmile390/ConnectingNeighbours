import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Linking,
  Clipboard
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useListConversations, 
  useListMessages, 
  useSendMessage, 
  useEditMessage,
  useDeleteMessage,
  useClearChatHistory,
  useListUsers, 
  getListConversationsQueryKey, 
  getListMessagesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";

// Voice Note Player Component
function VoicePlayer({ uri }: { uri: string }) {
  const colors = useColors();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return sound
      ? () => { sound.unloadAsync(); }
      : undefined;
  }, [sound]);

  async function playSound() {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri });
        setSound(newSound);
        setIsPlaying(true);
        await newSound.playAsync();
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch {
      Alert.alert("Playback Error", "Failed to play voice note.");
    }
  }

  return (
    <View style={styles.voicePlayerRow}>
      <TouchableOpacity
        onPress={playSound}
        style={[styles.voicePlayBtn, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Feather name={isPlaying ? "pause" : "play"} size={16} color={colors.primaryForeground} />
      </TouchableOpacity>
      <View style={styles.voiceProgressBg}>
        <View style={[styles.voiceProgressFill, { backgroundColor: colors.primary, width: isPlaying ? "80%" : "20%" }]} />
      </View>
      <Text style={[styles.voiceLabel, { color: colors.mutedForeground }]}>Voice note</Text>
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [activeNeighborId, setActiveNeighborId] = useState<number | null>(null);
  const [activeNeighbor, setActiveNeighbor] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);

  // Edit/Delete and Voice notes states
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch active conversations (poll every 4s)
  const { data: conversations = [], refetch: refetchConversations } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      refetchInterval: 4000
    }
  });

  // Fetch messages thread (poll every 2s when open)
  const { data: messages = [], refetch: refetchMessages } = useListMessages(activeNeighborId!, {
    query: {
      queryKey: getListMessagesQueryKey(activeNeighborId!),
      enabled: activeNeighborId !== null,
      refetchInterval: 2000
    }
  });

  // Fetch users list
  const { data: users = [] } = useListUsers();

  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const clearChatHistory = useClearChatHistory();

  // Scroll to bottom on new messages
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, activeNeighborId]);

  if (!currentUser) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="message-square" size={40} color={colors.mutedForeground} />
        <Text style={[styles.noAuthText, { color: colors.mutedForeground }]}>Sign in to view messages</Text>
      </View>
    );
  }

  const handleSend = async () => {
    if (!newMessage.trim() || activeNeighborId === null) return;
    try {
      await sendMessage.mutateAsync({
        data: {
          receiverId: activeNeighborId,
          content: newMessage.trim(),
          messageType: "text"
        }
      });
      setNewMessage("");
      refetchMessages();
      refetchConversations();
    } catch {
      Alert.alert("Error", "Failed to send message.");
    }
  };

  const handleStartChat = (user: any) => {
    setActiveNeighborId(user.id);
    setActiveNeighbor(user);
    setNewChatOpen(false);
    setContactSearch("");
    refetchConversations();
  };

  // Document Attachment Picker
  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      if (file.size && file.size > 2 * 1024 * 1024) {
        Alert.alert("File Too Large", "Maximum file size limit is 2MB.");
        return;
      }

      // Read URI to base64
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          await sendMessage.mutateAsync({
            data: {
              receiverId: activeNeighborId!,
              content: `Sent a document: ${file.name}`,
              messageType: "document",
              fileUrl: base64Data,
              fileName: file.name
            }
          });
          refetchMessages();
          refetchConversations();
        } catch {
          Alert.alert("Upload Error", "Failed to upload document.");
        }
      };
    } catch {
      Alert.alert("Error", "Could not pick document.");
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert("Recording Failed", "Please verify microphone permissions.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      setRecording(null);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Read file to base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          try {
            await sendMessage.mutateAsync({
              data: {
                receiverId: activeNeighborId!,
                content: "Voice Message",
                messageType: "voice",
                fileUrl: base64Data
              }
            });
            refetchMessages();
            refetchConversations();
          } catch {
            Alert.alert("Upload Error", "Failed to send voice note.");
          }
        };
      }
    } catch {
      Alert.alert("Recording Error", "Could not stop recording.");
    }
  };

  // Edit Message
  const handleEditSave = async (msgId: number) => {
    if (!editingText.trim()) return;
    try {
      await editMessage.mutateAsync({
        messageId: msgId,
        data: { content: editingText.trim() }
      });
      setEditingMessageId(null);
      setEditingText("");
      refetchMessages();
    } catch {
      Alert.alert("Error", "Failed to edit message.");
    }
  };

  // Delete Message
  const handleDelete = (msgId: number) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message for everyone?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMessage.mutateAsync({ messageId: msgId });
              refetchMessages();
              refetchConversations();
            } catch {
              Alert.alert("Error", "Failed to delete message.");
            }
          }
        }
      ]
    );
  };

  // Clear Chat History
  const handleClearChat = () => {
    if (activeNeighborId === null) return;
    Alert.alert(
      "Clear Chat History",
      `Are you sure you want to clear your chat history with ${activeNeighbor?.name || "this neighbor"}? This will permanently delete all messages.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Chat",
          style: "destructive",
          onPress: async () => {
            try {
              await clearChatHistory.mutateAsync({ neighborId: activeNeighborId });
              setActiveNeighborId(null);
              setActiveNeighbor(null);
              refetchConversations();
            } catch {
              Alert.alert("Error", "Failed to clear chat history.");
            }
          }
        }
      ]
    );
  };

  const showMessageMenu = (msg: any) => {
    if (msg.isDeleted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMessage(msg);
    setShowMessageOptions(true);
  };

  const filteredContacts = users.filter(u =>
    u.id !== currentUser.id &&
    (u.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
     u.username.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 80}
    >
      {activeNeighborId === null ? (
        // Chat Thread List View
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
            <TouchableOpacity
              style={[styles.newChatBtn, { backgroundColor: colors.primary + "18" }]}
              onPress={() => setNewChatOpen(true)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollList}>
            {conversations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="message-square" size={36} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No conversation threads yet.</Text>
                <TouchableOpacity onPress={() => setNewChatOpen(true)}>
                  <Text style={[styles.emptyActionText, { color: colors.primary }]}>Start a new chat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              conversations.map((conv) => {
                const isActive = activeNeighborId === conv.neighbor.id;
                return (
                  <TouchableOpacity
                    key={conv.neighbor.id}
                    onPress={() => {
                      setActiveNeighborId(conv.neighbor.id);
                      setActiveNeighbor(conv.neighbor);
                    }}
                    style={[styles.convItem, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                        {conv.neighbor.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.convDetails}>
                      <View style={styles.convNameRow}>
                        <Text style={[styles.convName, { color: colors.foreground }]}>{conv.neighbor.name}</Text>
                        <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                        </Text>
                      </View>
                      <View style={styles.convMsgRow}>
                        <Text
                          style={[
                            styles.convMsgText,
                            { color: colors.mutedForeground },
                            conv.unreadCount > 0 ? { fontFamily: "Inter_700Bold", color: colors.foreground } : {}
                          ]}
                          numberOfLines={1}
                        >
                          {conv.lastMessage.senderId === currentUser.id ? "You: " : ""}
                          {conv.lastMessage.isDeleted ? "This message was deleted" : conv.lastMessage.content}
                        </Text>
                        {conv.unreadCount > 0 && (
                          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.unreadBadgeText, { color: colors.primaryForeground }]}>{conv.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* New Chat Contacts Modal */}
          <Modal
            visible={newChatOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setNewChatOpen(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Chat</Text>
                  <TouchableOpacity onPress={() => setNewChatOpen(false)}>
                    <Feather name="x" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.modalSearchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Feather name="search" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.modalSearchInput, { color: colors.foreground }]}
                    placeholder="Search neighbors..."
                    placeholderTextColor={colors.mutedForeground}
                    value={contactSearch}
                    onChangeText={setContactSearch}
                  />
                </View>
                <ScrollView style={styles.contactsScroll}>
                  {filteredContacts.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center", marginTop: 24 }]}>No neighbors found</Text>
                  ) : (
                    filteredContacts.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => handleStartChat(u)}
                        style={[styles.contactItem, { borderBottomColor: colors.border }]}
                      >
                        <View style={[styles.avatarFallbackSmall, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.avatarInitialSmall, { color: colors.primary }]}>{u.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                          <Text style={[styles.contactName, { color: colors.foreground }]}>{u.name}</Text>
                          <Text style={[styles.contactUsername, { color: colors.mutedForeground }]}>@{u.username}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        // Active Chat Conversation Screen
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Thread Header */}
          <View style={[styles.threadHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
            <TouchableOpacity 
              onPress={() => { setActiveNeighborId(null); setActiveNeighbor(null); }} 
              style={styles.backBtn}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityHint="Navigates back to the conversation list"
            >
              <Feather name="arrow-left" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <View style={[styles.avatarFallbackSmall, { backgroundColor: colors.primary + "18", marginRight: 8 }]}>
              <Text style={[styles.avatarInitialSmall, { color: colors.primary }]}>{activeNeighbor.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.threadName, { color: colors.foreground }]} numberOfLines={1}>{activeNeighbor.name}</Text>
              <Text style={[styles.threadMeta, { color: colors.mutedForeground }]}>
                {activeNeighbor.apartment ? `Flat ${activeNeighbor.apartment}` : "Neighbor"}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleClearChat} 
              style={styles.backBtn}
              accessibilityLabel="Clear Chat History"
              accessibilityRole="button"
              accessibilityHint="Permanently deletes all messages in this conversation"
            >
              <Feather name="trash-2" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Messages Stream */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          >
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              const isEditing = editingMessageId === msg.id;

              return (
                <View key={msg.id} style={[styles.msgRow, isMe ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
                  <TouchableOpacity
                    onLongPress={() => showMessageMenu(msg)}
                    activeOpacity={0.9}
                    style={[
                      styles.bubble,
                      isMe 
                        ? { backgroundColor: colors.primary, borderBottomRightRadius: 2 } 
                        : { backgroundColor: colors.card, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: colors.border },
                      msg.isDeleted ? { opacity: 0.6, borderStyle: "dashed" } : {}
                    ]}
                  >
                    {msg.isDeleted ? (
                      <View style={styles.deletedContainer}>
                        <Feather name="x-circle" size={12} color={isMe ? colors.primaryForeground : colors.mutedForeground} style={{ opacity: 0.6 }} />
                        <Text style={[styles.deletedText, { color: isMe ? colors.primaryForeground : colors.mutedForeground }]}>
                          This message was deleted
                        </Text>
                      </View>
                    ) : isEditing ? (
                      <View style={{ minWidth: 200, gap: 8 }}>
                        <TextInput
                          value={editingText}
                          onChangeText={setEditingText}
                          style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                          autoFocus
                          multiline
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity onPress={() => setEditingMessageId(null)} style={styles.editBtn}>
                            <Text style={{ color: isMe ? colors.primaryForeground : colors.primary, fontSize: 12 }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleEditSave(msg.id)} style={[styles.editBtn, { opacity: !editingText.trim() ? 0.5 : 1 }]}>
                            <Text style={{ color: isMe ? colors.primaryForeground : colors.primary, fontSize: 12, fontWeight: "bold" }}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        {msg.messageType === "voice" ? (
                          <VoicePlayer uri={msg.fileUrl || ""} />
                        ) : msg.messageType === "document" ? (
                          <View style={[styles.documentCard, { backgroundColor: isMe ? "rgba(255,255,255,0.12)" : colors.background }]}>
                            <Feather name="file-text" size={24} color={isMe ? colors.primaryForeground : colors.primary} />
                            <View style={{ flex: 1, marginHorizontal: 8 }}>
                              <Text style={[styles.docName, { color: isMe ? colors.primaryForeground : colors.foreground }]} numberOfLines={1}>
                                {msg.fileName || "document"}
                              </Text>
                              <Text style={[styles.docLabel, { color: isMe ? colors.primaryForeground + "90" : colors.mutedForeground }]}>Document Attachment</Text>
                            </View>
                            <TouchableOpacity onPress={() => msg.fileUrl && Linking.openURL(msg.fileUrl)} style={styles.docDownloadBtn}>
                              <Feather name="download" size={14} color={isMe ? colors.primaryForeground : colors.foreground} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={[styles.msgText, { color: isMe ? colors.primaryForeground : colors.foreground }]}>
                            {msg.content}
                          </Text>
                        )}
                      </>
                    )}
                    <View style={styles.timeRow}>
                      {msg.isEdited && !msg.isDeleted && (
                        <Text style={[styles.editedIndicator, { color: isMe ? colors.primaryForeground + "80" : colors.mutedForeground }]}>
                          (edited)
                        </Text>
                      )}
                      <Text style={[styles.timeText, { color: isMe ? colors.primaryForeground + "80" : colors.mutedForeground }]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          {/* Chat Footer Input */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 8, borderTopColor: colors.border }]}>
            <View style={styles.footerRow}>
              {/* Paperclip Document Picker */}
              <TouchableOpacity 
                onPress={pickDocument} 
                style={[styles.footerIconBtn, { backgroundColor: colors.muted + "15" }]}
                accessibilityLabel="Attach document"
                accessibilityRole="button"
                accessibilityHint="Opens document selector to attach a file to the chat"
              >
                <Feather name="paperclip" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>

              {/* Microphone Voice Recorder */}
              <TouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopRecording}
                style={[
                  styles.footerIconBtn,
                  isRecording 
                    ? { backgroundColor: "#EF4444" } 
                    : { backgroundColor: colors.muted + "15" }
                ]}
                accessibilityLabel={isRecording ? "Recording voice note. Release to send" : "Record voice note"}
                accessibilityRole="button"
                accessibilityHint="Hold to record a voice message, release to send"
              >
                <Feather name="mic" size={18} color={isRecording ? "#ffffff" : colors.mutedForeground} />
              </TouchableOpacity>

              {isRecording ? (
                <View style={styles.recordingLabelContainer} accessibilityLiveRegion="polite">
                  <Text style={styles.recordingText}>Recording... Release to send</Text>
                </View>
              ) : (
                <TextInput
                  placeholder="Type a message..."
                  placeholderTextColor={colors.mutedForeground}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  multiline
                  accessibilityLabel="Message input field"
                />
              )}

              {!isRecording && (
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!newMessage.trim() || sendMessage.isPending}
                  style={[
                    styles.sendBtn,
                    { backgroundColor: colors.primary },
                    (!newMessage.trim() || sendMessage.isPending) ? { opacity: 0.5 } : {}
                  ]}
                  activeOpacity={0.8}
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                  accessibilityHint="Sends the typed message text"
                >
                  <Feather name="send" size={15} color={colors.primaryForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
      {/* Custom Message Options Bottom Sheet / Action Sheet */}
      <Modal
        visible={showMessageOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowMessageOptions(false);
          setSelectedMessage(null);
        }}
      >
        <TouchableOpacity 
          style={styles.actionSheetOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setShowMessageOptions(false);
            setSelectedMessage(null);
          }}
        >
          <View style={[styles.actionSheetContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.actionSheetHeader}>
              <View style={[styles.actionSheetIndicator, { backgroundColor: colors.border }]} />
              <Text style={[styles.actionSheetTitle, { color: colors.foreground }]}>Message Options</Text>
            </View>

            <View style={[styles.actionSheetBody, { borderColor: colors.border }]}>
              {selectedMessage && selectedMessage.messageType === "text" && (
                <TouchableOpacity
                  style={[styles.actionSheetItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  onPress={() => {
                    Clipboard.setString(selectedMessage.content);
                    setShowMessageOptions(false);
                    setSelectedMessage(null);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="copy" size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                  <Text style={[styles.actionSheetText, { color: colors.foreground }]}>Copy Text</Text>
                </TouchableOpacity>
              )}

              {selectedMessage && selectedMessage.senderId === currentUser.id && !selectedMessage.isDeleted && (
                <>
                  <TouchableOpacity
                    style={[styles.actionSheetItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    onPress={() => {
                      const msg = selectedMessage;
                      setShowMessageOptions(false);
                      setSelectedMessage(null);
                      setEditingMessageId(msg.id);
                      setEditingText(msg.content);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                    <Text style={[styles.actionSheetText, { color: colors.foreground }]}>Edit Message</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionSheetItem}
                    onPress={() => {
                      const msgId = selectedMessage.id;
                      setShowMessageOptions(false);
                      setSelectedMessage(null);
                      handleDelete(msgId);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructive} style={{ marginRight: 10 }} />
                    <Text style={[styles.actionSheetText, { color: colors.destructive }]}>Delete Message</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.actionSheetCancel, { backgroundColor: colors.muted + "30", borderColor: colors.border }]}
              onPress={() => {
                setShowMessageOptions(false);
                setSelectedMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionSheetCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAuthText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  newChatBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  scrollList: { flex: 1 },
  emptyContainer: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyActionText: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  convItem: { flexDirection: "row", padding: 16, alignItems: "center", borderBottomWidth: 1 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarFallbackSmall: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 18, fontFamily: "Inter_700Bold" },
  avatarInitialSmall: { fontSize: 15, fontFamily: "Inter_700Bold" },
  convDetails: { flex: 1, marginLeft: 12 },
  convNameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  convTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  convMsgRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  convMsgText: { fontSize: 12, flex: 1, marginRight: 8, fontFamily: "Inter_400Regular" },
  unreadBadge: { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  unreadBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { height: "70%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, paddingBottom: 12 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalSearchBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 12, gap: 8 },
  modalSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  contactsScroll: { flex: 1 },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contactUsername: { fontSize: 11, fontFamily: "Inter_400Regular" },
  threadHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 6, marginRight: 4 },
  threadName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  threadMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  messagesScroll: { flex: 1 },
  msgRow: { flexDirection: "row", marginVertical: 4 },
  bubble: { maxWidth: "75%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  deletedContainer: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  deletedText: { fontSize: 13, fontFamily: "Inter_400Regular_Italic", fontStyle: "italic" },
  msgText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  timeRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 },
  editedIndicator: { fontSize: 8, fontFamily: "Inter_400Regular" },
  timeText: { fontSize: 9, fontFamily: "Inter_400Regular" },
  editInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14, minWidth: 200 },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 4 },
  editBtn: { padding: 4 },
  documentCard: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 10, marginVertical: 2, minWidth: 200 },
  docName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  docLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  docDownloadBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" },
  voicePlayerRow: { flexDirection: "row", alignItems: "center", minWidth: 200, paddingVertical: 4, gap: 10 },
  voicePlayBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  voiceProgressBg: { flex: 1, height: 3, backgroundColor: "rgba(0,0,0,0.08)", borderRadius: 1.5 },
  voiceProgressFill: { height: 3, borderRadius: 1.5 },
  voiceLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  footer: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  recordingLabelContainer: { flex: 1, paddingVertical: 8 },
  recordingText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { flex: 1, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, fontSize: 14, maxHeight: 80, fontFamily: "Inter_400Regular" },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actionSheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  actionSheetContent: { width: "100%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 12 },
  actionSheetHeader: { alignItems: "center", marginBottom: 16 },
  actionSheetIndicator: { width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  actionSheetTitle: { fontSize: 16, fontWeight: "bold" },
  actionSheetBody: { borderRadius: 16, overflow: "hidden", borderWidth: 1, marginBottom: 16 },
  actionSheetItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  actionSheetText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  actionSheetCancel: { paddingVertical: 14, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionSheetCancelText: { fontSize: 15, fontWeight: "bold" },
});
