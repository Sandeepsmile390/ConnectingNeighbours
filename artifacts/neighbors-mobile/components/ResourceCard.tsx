import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: keyof typeof Feather.glyphMap; label: string }> = {
  ride: { icon: "navigation", label: "Ride" },
  item: { icon: "box", label: "Item" },
  service: { icon: "tool", label: "Service" },
  childcare: { icon: "heart", label: "Childcare" },
};

interface Resource {
  id: number;
  offererId: number;
  offerer: { id: number; name: string; avatarUrl?: string | null };
  title: string;
  description: string;
  type: string;
  isAvailable: boolean;
  createdAt: string;
}

interface ResourceCardProps {
  resource: Resource;
  currentUserId?: number;
  onDelete: (id: number) => void;
}

export function ResourceCard({ resource, currentUserId, onDelete }: ResourceCardProps) {
  const colors = useColors();
  const conf = TYPE_CONFIG[resource.type] ?? TYPE_CONFIG.item;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={conf.icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{resource.title}</Text>
          <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{conf.label}</Text>
          </View>
        </View>
        <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
          {resource.description}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {resource.offerer.name} · {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
          </Text>
          {currentUserId === resource.offererId && (
            <TouchableOpacity onPress={() => onDelete(resource.id)} activeOpacity={0.7}>
              <Feather name="trash-2" size={14} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 1,
    marginHorizontal: 16, marginBottom: 10,
    flexDirection: "row", alignItems: "flex-start",
    padding: 14, gap: 12,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  content: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, gap: 8 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 8 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
