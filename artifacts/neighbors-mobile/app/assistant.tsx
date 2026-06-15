import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryAiAssistant } from "@workspace/api-client-react";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  {
    title: "Upcoming Events",
    description: "What events are happening?",
    prompt: "What community events are happening this week or in the near future?",
  },
  {
    title: "Marketplace",
    description: "What items are for sale?",
    prompt: "Show me all active listings in the marketplace, including prices.",
  },
  {
    title: "Local Safety",
    description: "Are there safety alerts?",
    prompt: "Are there any active safety alerts or warnings in the neighborhood?",
  },
  {
    title: "Borrow Resources",
    description: "What can I borrow?",
    prompt: "What shared resources are currently available to borrow?",
  },
];

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const aiQuery = useQueryAiAssistant();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, aiQuery.isPending]);

  const handleSend = async (text: string) => {
    if (!text.trim() || aiQuery.isPending) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const data = await aiQuery.mutateAsync({
        data: {
          message: text.trim(),
        },
      });

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert(
        "Assistant Error",
        err.message || "Failed to get response from Gemini AI. Ensure the server has GEMINI_API_KEY set."
      );
    }
  };

  const clearChat = () => {
    Alert.alert("Clear Chat", "Are you sure you want to clear this conversation?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => setMessages([]) },
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="cpu" size={40} color={colors.mutedForeground} />
        <Text style={[styles.noAuthText, { color: colors.mutedForeground }]}>Sign in to ask the AI Guide</Text>
      </View>
    );
  }

  const webBotPad = Platform.OS === "web" ? 34 : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Summary */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.headerInfo}>
            <View style={[styles.avatarBox, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="cpu" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Neighborhood AI Guide</Text>
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>Powered by Google Gemini 1.5</Text>
            </View>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.clearBtn} activeOpacity={0.7}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>

        {/* Messages / Welcome View */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.welcomeContainer}>
              <View style={[styles.welcomeIconContainer, { backgroundColor: colors.primary + "12" }]}>
                <Ionicons name="sparkles" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>Hello, {user.name}!</Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.mutedForeground }]}>
                I'm your neighborhood AI guide. I have access to real-time events, marketplace listings, safety alerts, and resource sharing details. Ask me anything!
              </Text>

              {/* Suggestions Grid */}
              <View style={styles.suggestionsGrid}>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.suggestionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleSend(qp.prompt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>{qp.title}</Text>
                    <Text style={[styles.suggestionDesc, { color: colors.mutedForeground }]}>{qp.description}</Text>
                    <View style={styles.arrowRow}>
                      <Text style={[styles.askText, { color: colors.primary }]}>Ask Guide</Text>
                      <Feather name="arrow-right" size={12} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.messageList}>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <View key={msg.id} style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
                    {!isUser && (
                      <View style={[styles.smallAvatar, { backgroundColor: colors.primary + "18" }]}>
                        <Feather name="cpu" size={13} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.msgBody}>
                      <View
                        style={[
                          styles.msgBubble,
                          isUser
                            ? { backgroundColor: colors.primary, borderBottomRightRadius: 2 }
                            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 2 }
                        ]}
                      >
                        <Text style={[styles.msgText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>
                          {msg.content}
                        </Text>
                      </View>
                      <Text style={[styles.msgTime, { color: colors.mutedForeground, textAlign: isUser ? "right" : "left" }]}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    {isUser && (
                      user.avatarUrl ? (
                        <Image source={{ uri: user.avatarUrl }} style={styles.smallUserAvatar} />
                      ) : (
                        <View style={[styles.smallUserAvatar, { backgroundColor: colors.muted }]}>
                          <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.mutedForeground }}>
                            {user.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                );
              })}

              {/* Loader */}
              {aiQuery.isPending && (
                <View style={[styles.messageRow, styles.assistantRow]}>
                  <View style={[styles.smallAvatar, { backgroundColor: colors.primary + "18" }]}>
                    <Feather name="cpu" size={13} color={colors.primary} />
                  </View>
                  <View style={[styles.msgBubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 2, paddingVertical: 10 }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + 12 }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about the neighborhood..."
            placeholderTextColor={colors.mutedForeground}
            onSubmitEditing={() => handleSend(input)}
            editable={!aiQuery.isPending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }, !input.trim() || aiQuery.isPending ? { opacity: 0.5 } : {}]}
            onPress={() => handleSend(input)}
            disabled={!input.trim() || aiQuery.isPending}
            activeOpacity={0.8}
          >
            <Feather name="send" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAuthText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  headerSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  clearBtn: { padding: 6 },
  messageScroll: { flex: 1 },
  welcomeContainer: { alignItems: "center", paddingVertical: 24, gap: 8 },
  welcomeIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  welcomeTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  welcomeSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, paddingHorizontal: 20, marginBottom: 16 },
  suggestionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 8, justifyContent: "center" },
  suggestionCard: { width: "45%", borderWidth: 1, borderRadius: 12, padding: 12, gap: 4, justifyContent: "space-between" },
  suggestionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  suggestionDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 14 },
  arrowRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  askText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  messageList: { gap: 12 },
  messageRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginVertical: 2 },
  userRow: { justifyContent: "flex-end", alignSelf: "flex-end" },
  assistantRow: { justifyContent: "flex-start", alignSelf: "flex-start" },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 2 },
  smallUserAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 2 },
  msgBody: { maxWidth: "80%" },
  msgBubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  msgText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 2, paddingHorizontal: 4 },
  inputBar: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 10, gap: 10, alignItems: "center", borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 10 : 6, fontSize: 14, fontFamily: "Inter_400Regular" },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
}) as any;
