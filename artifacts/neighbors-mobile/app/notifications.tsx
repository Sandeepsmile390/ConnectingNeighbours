import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Alert, Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  useGetRecentActivity, 
  useListPendingMembers,
  useVerifyColonyMember,
  getListPendingMembersQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

const ACTIVITY_ICONS: Record<string, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  post: { icon: "message-circle", color: "#6366F1" },
  listing: { icon: "shopping-bag", color: "#3B82F6" },
  event: { icon: "calendar", color: "#F97316" },
  alert: { icon: "alert-triangle", color: "#EF4444" },
  resource: { icon: "heart", color: "#289B87" },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN || "connecting-neighbours-apiserver.vercel.app";
  const CURRENT_VERSION = "1.0.0";
  const [updateInfo, setUpdateInfo] = useState<{ latestVersion: string; apkUrl: string; releaseNotes: string } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchUpdateInfo = async () => {
      try {
        const res = await fetch(`https://${DOMAIN}/api/app-version`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.latestVersion !== CURRENT_VERSION) {
            setUpdateInfo(data);
          }
        }
      } catch {}
    };
    fetchUpdateInfo();
    return () => { active = false; };
  }, []);

  const { data: pendingMembers = [], isLoading: membersLoading } = useListPendingMembers({
    query: {
      enabled: !!user && user.isColonyAdmin === true,
      refetchInterval: 15000,
      queryKey: getListPendingMembersQueryKey()
    }
  });

  const { data: activity = [], isLoading: actLoading } = useGetRecentActivity({
    query: {
      enabled: !!user && !!user.colonyId,
      refetchInterval: 15000,
      queryKey: getGetRecentActivityQueryKey(),
    }
  });

  const verifyMember = useVerifyColonyMember();

  // Reset notification counts on mount by saving current timestamp
  useEffect(() => {
    if (!user?.colonyId) return;
    (async () => {
      try {
        const now = Date.now();
        await AsyncStorage.setItem("last_seen_notifications", String(now));
      } catch {}
    })();
  }, [user?.colonyId]);

  const handleApprove = async (memberId: number) => {
    try {
      await verifyMember.mutateAsync({ data: { memberId } });
      Alert.alert("Success", "Resident approved.");
      queryClient.invalidateQueries({ queryKey: getListPendingMembersQueryKey() });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to approve member");
    }
  };

  const webTopPad = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ 
        paddingTop: 16, 
        paddingHorizontal: 20, 
        paddingBottom: 100 
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Update Available Banner */}
      {updateInfo && (
        <View style={[styles.updateBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary }]}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={[styles.updateIconBox, { backgroundColor: colors.primary }]}>
              <Feather name="download" size={16} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.foreground }}>
                App Update Available! (v{updateInfo.latestVersion})
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 16 }}>
                {updateInfo.releaseNotes || "A newer version of the app is available with bug fixes and improvements."}
              </Text>
              <TouchableOpacity
                style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (updateInfo.apkUrl) {
                    Linking.openURL(updateInfo.apkUrl);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.primaryForeground, fontSize: 12, fontWeight: "bold" }}>Download APK Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Residency Requests for Admins */}
      {user?.isColonyAdmin && (
        <View style={{ marginBottom: 24 }}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>RESIDENCY REQUESTS</Text>
          {membersLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
          ) : pendingMembers.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, fontStyle: "italic", textAlign: "center" }}>
                No pending requests.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {pendingMembers.map((member: any) => (
                <View key={member.id} style={[styles.pendingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.foreground }}>{member.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{member.apartment || "No unit specified"}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: "#10B981" }]}
                    onPress={() => handleApprove(member.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}>Approve</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recent Activities */}
      <View>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>RECENT ACTIVITY</Text>
        {actLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
        ) : activity.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, fontStyle: "italic", textAlign: "center" }}>
              No recent activity.
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 8 }]}>
            {activity.map((item, index) => {
              const conf = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.post;
              return (
                <View 
                  key={item.id} 
                  style={[
                    styles.actItem, 
                    index > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : {}
                  ]}
                >
                  <View style={[styles.actIcon, { backgroundColor: conf.color + "18" }]}>
                    <Feather name={conf.icon} size={15} color={conf.color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 18 }}>
                      <Text style={{ fontWeight: "bold", color: colors.primary }}>{item.actorName}</Text>
                      {item.type === "post" ? " posted" : item.type === "listing" ? " listed" : item.type === "event" ? " created event" : item.type === "alert" ? " reported" : " offered"}
                      : {item.title}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.mutedForeground }}>
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  pendingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  approveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  actIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  updateBanner: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 20,
  },
  updateIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
});
