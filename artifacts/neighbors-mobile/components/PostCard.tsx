import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  announcement: "Announcement",
  helpNeeded: "Help Needed",
  lostFound: "Lost & Found",
  recommendation: "Recommendation",
  safety: "Safety",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "#6366F1",
  announcement: "#0EA5E9",
  helpNeeded: "#F97316",
  lostFound: "#EAB308",
  recommendation: "#22C55E",
  safety: "#EF4444",
};

interface Post {
  id: number;
  authorId: number;
  author: { id: number; name: string; apartment?: string | null; avatarUrl?: string | null };
  title?: string | null;
  content: string;
  category: string;
  likesCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

interface PostCardProps {
  post: Post;
  currentUserId?: number;
  onLike: (id: number) => void;
  onDelete: (id: number) => void;
}

export function PostCard({ post, currentUserId, onLike, onDelete }: PostCardProps) {
  const colors = useColors();
  const catColor = CATEGORY_COLORS[post.category] ?? "#6366F1";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          {post.author.avatarUrl ? (
            <Image source={{ uri: post.author.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {post.author.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.foreground }]}>{post.author.name}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {post.author.apartment ? `${post.author.apartment} · ` : ""}
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: catColor + "18" }]}>
          <Text style={[styles.badgeText, { color: catColor }]}>{CATEGORY_LABELS[post.category]}</Text>
        </View>
      </View>

      {post.title && (
        <Text style={[styles.title, { color: colors.foreground }]}>{post.title}</Text>
      )}
      <Text style={[styles.content, { color: colors.foreground }]} numberOfLines={4}>
        {post.content}
      </Text>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => onLike(post.id)} activeOpacity={0.7}>
          <Feather
            name="heart"
            size={16}
            color={post.isLikedByMe ? "#F43F5E" : colors.mutedForeground}
          />
          <Text style={[styles.footerBtnText, {
            color: post.isLikedByMe ? "#F43F5E" : colors.mutedForeground
          }]}>{post.likesCount}</Text>
        </TouchableOpacity>
        {currentUserId === post.authorId && (
          <TouchableOpacity style={styles.footerBtn} onPress={() => onDelete(post.id)} activeOpacity={0.7}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 14,
    paddingBottom: 10,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, marginLeft: 8,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  title: {
    fontSize: 15, fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 14, marginBottom: 4,
  },
  content: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    paddingHorizontal: 14, lineHeight: 20,
    paddingBottom: 14,
  },
  footer: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: 1, padding: 10, paddingHorizontal: 14,
    gap: 16,
  },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
