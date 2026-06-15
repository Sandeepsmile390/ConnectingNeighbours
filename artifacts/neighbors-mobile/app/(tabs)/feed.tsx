import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Platform, Alert,
  RefreshControl, KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useListPosts, useCreatePost, useLikePost, useDeletePost,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "general", label: "General" },
  { key: "announcement", label: "Announcement" },
  { key: "helpNeeded", label: "Help Needed" },
  { key: "lostFound", label: "Lost & Found" },
  { key: "recommendation", label: "Recommendation" },
  { key: "safety", label: "Safety" },
];

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user, isAuthenticated, login } = useAuth();

  const [category, setCategory] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [refreshing, setRefreshing] = useState(false);

  const { data: posts = [], isLoading, refetch } = useListPosts({ category: category || undefined });
  const createMutation = useCreatePost();
  const likeMutation = useLikePost();
  const deleteMutation = useDeletePost();

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!content.trim()) return;
    try {
      await createMutation.mutateAsync({ data: { content: content.trim(), title: title.trim() || undefined, category: newCategory as any } });
      await qc.invalidateQueries();
      setShowCreate(false);
      setContent("");
      setTitle("");
      setNewCategory("general");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to create post");
    }
  };

  const handleLike = async (id: number) => {
    if (!isAuthenticated) { login(); return; }
    try {
      await likeMutation.mutateAsync({ id });
      await qc.invalidateQueries();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ id });
            await qc.invalidateQueries();
          } catch {}
        },
      },
    ]);
  };

  const currentUserId = user?.id;

  const headerComponent = (
    <View>
      <View style={[styles.topBar, { paddingTop: insets.top + webTopPad + 12 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Community Feed</Text>
        {isAuthenticated && (
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.filterChip, {
              backgroundColor: category === c.key ? colors.primary : colors.muted,
            }]}
            onPress={() => setCategory(c.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, {
              color: category === c.key ? colors.primaryForeground : colors.foreground,
            }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={isLoading ? [] : posts}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={currentUserId}
            onLike={handleLike}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 24, gap: 10 }}>
              {[...Array(3)].map((_, i) => (
                <View key={i} style={[styles.skeleton, { backgroundColor: colors.muted }]} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="message-circle"
              title="No posts yet"
              description="Be the first to share something with the community."
              actionLabel={isAuthenticated ? "Create Post" : undefined}
              onAction={isAuthenticated ? () => setShowCreate(true) : undefined}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 100 + webBotPad, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Post</Text>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!content.trim() || createMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={[styles.postBtn, { color: content.trim() ? colors.primary : colors.mutedForeground }]}>
                  {createMutation.isPending ? "Posting..." : "Post"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                {CATEGORIES.slice(1).map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.catChip, { backgroundColor: newCategory === c.key ? colors.primary : colors.muted }]}
                    onPress={() => setNewCategory(c.key)}
                  >
                    <Text style={{ color: newCategory === c.key ? "#fff" : colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" }}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Title (optional)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Give your post a title..."
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Content *</Text>
              <TextInput
                style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={content}
                onChangeText={setContent}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  newBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  filterBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  skeleton: { height: 120, borderRadius: 14, marginHorizontal: 16 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  postBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 16 },
  catRow: { marginBottom: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  input: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 15, fontFamily: "Inter_400Regular",
  },
  textarea: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 15, fontFamily: "Inter_400Regular",
    minHeight: 120,
  },
});
