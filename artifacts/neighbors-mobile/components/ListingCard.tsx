import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  sell: { label: "For Sale", color: "#3B82F6" },
  free: { label: "Free", color: "#22C55E" },
  rent: { label: "For Rent", color: "#F97316" },
};

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  electronics: "cpu",
  furniture: "briefcase",
  clothing: "tag",
  books: "book",
  groceries: "shopping-bag",
  appliances: "settings",
  other: "box",
};

interface Listing {
  id: number;
  sellerId: number;
  seller: { id: number; name: string; avatarUrl?: string | null };
  title: string;
  description: string;
  price?: number | null;
  type: string;
  category: string;
  isAvailable: boolean;
  createdAt: string;
}

interface ListingCardProps {
  listing: Listing;
  currentUserId?: number;
  onDelete: (id: number) => void;
}

export function ListingCard({ listing, currentUserId, onDelete }: ListingCardProps) {
  const colors = useColors();
  const typeConf = TYPE_CONFIG[listing.type] ?? TYPE_CONFIG.sell;
  const catIcon = CATEGORY_ICONS[listing.category] ?? "box";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.imageArea, { backgroundColor: colors.muted }]}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + "22" }]}>
          <Feather name={catIcon} size={24} color={colors.primary} />
        </View>
        <View style={[styles.typeBadge, { backgroundColor: typeConf.color }]}>
          <Text style={styles.typeBadgeText}>{typeConf.label}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{listing.title}</Text>
        {listing.type !== "free" && listing.price != null && (
          <Text style={[styles.price, { color: colors.primary }]}>₹{listing.price}</Text>
        )}
        <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
          {listing.description}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {listing.seller.name} · {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
          </Text>
          {currentUserId === listing.sellerId && (
            <TouchableOpacity onPress={() => onDelete(listing.id)} activeOpacity={0.7}>
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
    borderRadius: 14, borderWidth: 1, overflow: "hidden", flex: 1,
  },
  imageArea: {
    height: 96, alignItems: "center", justifyContent: "center", position: "relative",
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  typeBadge: {
    position: "absolute", top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  typeBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  body: { padding: 12, gap: 4 },
  title: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  description: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, marginRight: 8 },
});
