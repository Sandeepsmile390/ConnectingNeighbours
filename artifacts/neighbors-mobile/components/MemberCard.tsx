import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: number;
  name: string;
  bio?: string | null;
  apartment?: string | null;
  avatarUrl?: string | null;
  isVerified: boolean;
  joinedAt: string;
}

export function MemberCard({ user }: { user: User }) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {user.isVerified && (
          <View style={[styles.verifiedBadge, { backgroundColor: "#3B82F618" }]}>
            <Feather name="check-circle" size={10} color="#3B82F6" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
      <Text style={[styles.name, { color: colors.foreground }]}>{user.name}</Text>
      {user.apartment && (
        <View style={styles.apartmentRow}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
          <Text style={[styles.apartment, { color: colors.mutedForeground }]}>{user.apartment}</Text>
        </View>
      )}
      {user.bio && (
        <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>{user.bio}</Text>
      )}
      <Text style={[styles.joined, { color: colors.mutedForeground }]}>
        Joined {formatDistanceToNow(new Date(user.joinedAt), { addSuffix: true })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 1,
    padding: 14, flex: 1,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 22, fontFamily: "Inter_700Bold" },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, gap: 3,
  },
  verifiedText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#3B82F6" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  apartmentRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 6 },
  apartment: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, marginBottom: 8 },
  joined: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
