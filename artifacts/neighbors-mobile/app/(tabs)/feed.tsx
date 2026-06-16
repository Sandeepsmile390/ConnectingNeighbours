import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Platform, Alert,
  RefreshControl, KeyboardAvoidingView, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useListPosts, useCreatePost, useLikePost, useDeletePost,
  useListComments, useCreateComment, useDeleteComment,
  getListCommentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";
import { formatDistanceToNow } from "date-fns";

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
  
  // Comments states
  const [activePostIdForComments, setActivePostIdForComments] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  const { data: posts = [], isLoading, refetch } = useListPosts({ category: category || undefined });
  const createMutation = useCreatePost();
  const likeMutation = useLikePost();
  const deleteMutation = useDeletePost();

  // Comments hooks
  const { data: comments = [], isLoading: commentsLoading } = useListComments(activePostIdForComments!, {
    query: {
      enabled: activePostIdForComments !== null,
      queryKey: getListCommentsQueryKey(activePostIdForComments ?? 0),
    }
  });
  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();

  const activePost = posts.find(p => p.id === activePostIdForComments);

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

  const handleAddComment = async () => {
    if (!commentText.trim() || activePostIdForComments === null) return;
    try {
      await createCommentMutation.mutateAsync({
        id: activePostIdForComments,
        data: { content: commentText.trim() }
      });
      setCommentText("");
      await qc.invalidateQueries();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCommentMutation.mutateAsync({ id: commentId });
            await qc.invalidateQueries();
          } catch {
            Alert.alert("Error", "Failed to delete comment");
          }
        }
      }
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
            onComment={(id) => setActivePostIdForComments(id)}
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

      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? insets.top : 0 }]}>
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

      {/* Comments View Modal */}
      <Modal
        visible={activePostIdForComments !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setActivePostIdForComments(null);
          setCommentText("");
        }}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? insets.top : 0 }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => { setActivePostIdForComments(null); setCommentText(""); }}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Comments</Text>
              <View style={{ width: 22 }} />
            </View>

            {/* Comments Scrollable Stream */}
            <ScrollView 
              style={styles.modalBody} 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Context original post details */}
              {activePost && (
                <View style={[styles.originalPostContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={styles.originalPostHeader}>
                    <Text style={[styles.originalPostAuthor, { color: colors.foreground }]}>{activePost.author.name}</Text>
                    <Text style={[styles.originalPostTime, { color: colors.mutedForeground }]}>
                      {formatDistanceToNow(new Date(activePost.createdAt), { addSuffix: true })}
                    </Text>
                  </View>
                  {activePost.title && (
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>{activePost.title}</Text>
                  )}
                  <Text style={[styles.originalPostContent, { color: colors.foreground }]}>{activePost.content}</Text>
                </View>
              )}

              <Text style={[styles.commentsSectionTitle, { color: colors.foreground }]}>
                Discussion ({comments.length})
              </Text>

              {commentsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
              ) : comments.length === 0 ? (
                <Text style={{ textAlign: "center", color: colors.mutedForeground, marginVertical: 30, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                  No comments yet. Start the conversation!
                </Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={[styles.commentItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.commentHeader}>
                      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{comment.author.name}</Text>
                        {comment.author.apartment && (
                          <Text style={[styles.commentMeta, { color: colors.mutedForeground }]}>· {comment.author.apartment}</Text>
                        )}
                      </View>
                      <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
                      <Text style={[styles.commentContent, { color: colors.foreground, flex: 1 }]}>
                        {comment.content}
                      </Text>
                      {comment.authorId === currentUserId && (
                        <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={{ padding: 4 }}>
                          <Feather name="trash-2" size={14} color={colors.destructive} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Sticky bottom Comment bar */}
            <View style={[styles.commentInputBar, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
              <TextInput
                style={[styles.commentInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Write a comment..."
                placeholderTextColor={colors.mutedForeground}
                multiline
              />
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={!commentText.trim() || createCommentMutation.isPending}
                style={[styles.commentSendBtn, { backgroundColor: commentText.trim() ? colors.primary : colors.muted + "40" }]}
                activeOpacity={0.8}
              >
                <Feather name="send" size={16} color={commentText.trim() ? colors.primaryForeground : colors.mutedForeground} />
              </TouchableOpacity>
            </View>
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
  commentInputBar: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 10, gap: 10, alignItems: "center", borderTopWidth: 1 },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 10 : 6, fontSize: 14, fontFamily: "Inter_400Regular" },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  originalPostContainer: { padding: 14, borderBottomWidth: 1, borderStyle: "dashed", margin: 16, borderRadius: 12, borderWidth: 1 },
  originalPostHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  originalPostAuthor: { fontSize: 13, fontWeight: "bold" },
  originalPostTime: { fontSize: 11 },
  originalPostContent: { fontSize: 14, lineHeight: 20 },
  commentsSectionTitle: { fontSize: 15, fontWeight: "bold", paddingHorizontal: 16, marginTop: 10, marginBottom: 10 },
  commentItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  commentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: "bold" },
  commentMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentContent: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
});
