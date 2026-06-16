import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  useListPendingMembers,
  useGetRecentActivity,
  getListPendingMembersQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";

export function NotificationBell() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [lastSeenTime, setLastSeenTime] = useState<number>(Date.now());

  // Load last seen notifications time
  useEffect(() => {
    if (!user?.colonyId) return;
    const loadLastSeen = async () => {
      try {
        const val = await AsyncStorage.getItem("last_seen_notifications");
        if (val) {
          setLastSeenTime(Number(val));
        }
      } catch {}
    };
    loadLastSeen();
  }, [user?.colonyId]);

  const { data: pendingMembers = [] } = useListPendingMembers({
    query: {
      enabled: !!user && user.isColonyAdmin === true,
      refetchInterval: 15000,
      queryKey: getListPendingMembersQueryKey()
    }
  });

  const { data: activity = [] } = useGetRecentActivity({
    query: {
      enabled: !!user && !!user.colonyId,
      refetchInterval: 15000,
      queryKey: getGetRecentActivityQueryKey(),
    }
  });

  const pendingCount = user?.isColonyAdmin ? pendingMembers.length : 0;
  const newActivityCount = activity.filter(
    (a: any) => new Date(a.createdAt).getTime() > lastSeenTime
  ).length;

  const unseenCount = pendingCount + newActivityCount;

  if (!user?.colonyId) return null;

  return (
    <TouchableOpacity
      style={[styles.bellBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push("/notifications" as any)}
      activeOpacity={0.7}
    >
      <Feather name="bell" size={20} color={colors.foreground} />
      {unseenCount > 0 && (
        <View style={[styles.bellBadge, { backgroundColor: colors.destructive }]}>
          <Text style={styles.bellBadgeText}>{unseenCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
  },
});
