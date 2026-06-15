import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetFeedStats, useGetRecentActivity } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { formatDistanceToNow } from "date-fns";

const ACTIVITY_ICONS: Record<string, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  post: { icon: "message-circle", color: "#6366F1" },
  listing: { icon: "shopping-bag", color: "#3B82F6" },
  event: { icon: "calendar", color: "#F97316" },
  alert: { icon: "alert-triangle", color: "#EF4444" },
  resource: { icon: "heart", color: "#289B87" },
};

function SkeletonBox({ w, h, radius = 8 }: { w: number | string; h: number; radius?: number }) {
  const colors = useColors();
  return <View style={{ width: w as number, height: h, borderRadius: radius, backgroundColor: colors.muted, marginBottom: 4 }} />;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetFeedStats();
  const { data: activity, isLoading: actLoading, refetch: refetchActivity } = useGetRecentActivity();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchActivity()]);
    setRefreshing(false);
  };

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + webTopPad + 16, paddingBottom: 100 + webBotPad }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerSection}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting}</Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user?.name ?? "Neighbor"}
          </Text>
        </View>
        <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>CN</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Community Stats</Text>

      {statsLoading ? (
        <View style={styles.statsGrid}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SkeletonBox w={36} h={36} radius={10} />
              <SkeletonBox w={40} h={24} />
              <SkeletonBox w={60} h={12} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <StatCard icon="users" iconColor="#3B82F6" value={stats?.totalMembers ?? 0} label="Members" onPress={() => router.push("/members")} />
          <StatCard icon="message-square" iconColor="#22C55E" value={stats?.totalPosts ?? 0} label="Posts" onPress={() => router.push("/feed")} />
          <StatCard icon="shopping-bag" iconColor="#A855F7" value={stats?.activeListings ?? 0} label="Listings" onPress={() => router.push("/market")} />
          <StatCard icon="calendar" iconColor="#F97316" value={stats?.upcomingEvents ?? 0} label="Events" onPress={() => router.push("/events")} />
          <StatCard icon="alert-triangle" iconColor="#EF4444" value={stats?.activeAlerts ?? 0} label="Alerts" onPress={() => router.push("/alerts")} />
          <StatCard icon="heart" iconColor="#289B87" value={stats?.availableResources ?? 0} label="Resources" onPress={() => router.push("/resources")} />
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
      </View>

      <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {actLoading ? (
          [...Array(4)].map((_, i) => (
            <View key={i} style={[styles.actItem, i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : {}]}>
              <SkeletonBox w={36} h={36} radius={18} />
              <View style={{ flex: 1, gap: 4 }}>
                <SkeletonBox w="80%" h={14} />
                <SkeletonBox w="50%" h={12} />
              </View>
            </View>
          ))
        ) : !activity?.length ? (
          <View style={styles.emptyActivity}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recent activity</Text>
          </View>
        ) : (
          activity.slice(0, 8).map((item, i) => {
            const conf = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.post;
            return (
              <View key={item.id} style={[styles.actItem, i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : {}]}>
                <View style={[styles.actIcon, { backgroundColor: conf.color + "18" }]}>
                  <Feather name={conf.icon} size={16} color={conf.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actTitle, { color: colors.foreground }]} numberOfLines={1}>
                    <Text style={{ color: colors.primary }}>{item.actorName}</Text> {item.type === "post" ? "posted" : item.type === "listing" ? "listed" : item.type === "event" ? "created event" : item.type === "alert" ? "reported" : "offered"}: {item.title}
                  </Text>
                  <Text style={[styles.actTime, { color: colors.mutedForeground }]}>
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 24,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 2 },
  logoMark: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  skeletonCard: {
    flex: 1, minWidth: "44%", padding: 16,
    borderRadius: 14, borderWidth: 1, gap: 6,
  },
  activityCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  actItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  actIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actTitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  actTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyActivity: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
