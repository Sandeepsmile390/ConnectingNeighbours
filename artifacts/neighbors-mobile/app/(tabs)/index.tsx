import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl, TextInput, ActivityIndicator, Alert,
  Image, Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  useGetFeedStats, 
  useGetRecentActivity, 
  useListAlerts,
  useListColonies,
  useCreateColony,
  useJoinColony,
  getListColoniesQueryKey,
  useListPendingMembers,
  useVerifyColonyMember,
  getListPendingMembersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
  const { user, refetchUser } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<"choose" | "admin" | "resident">("choose");
  const [showAdminPasswordModal, setShowAdminPasswordModal] = React.useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = React.useState("");

  const [lastSeenTime, setLastSeenTime] = React.useState<number>(Date.now());
  const [showNotificationsModal, setShowNotificationsModal] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const role = await AsyncStorage.getItem("intended_role");
        if (role === "admin" || role === "resident") {
          if (!user.colonyId) {
            setActiveTab(role as any);
            await AsyncStorage.removeItem("intended_role");
          } else if (role === "admin" && !user.isColonyAdmin) {
            await AsyncStorage.removeItem("intended_role");
            const token = await AsyncStorage.getItem("cn_auth_token");
            if (token) {
              const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN || "connecting-neighbours-apiserver.vercel.app";
              const res = await fetch(`https://${DOMAIN}/api/auth/promote-admin`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ password: "Admin@1234" }),
              });
              if (res.ok) {
                Alert.alert("Welcome, Admin!", "You have been promoted to colony administrator.");
                await refetchUser();
              }
            }
          } else {
            await AsyncStorage.removeItem("intended_role");
          }
        }
      } catch (err) {
        console.error("Auto promotion failed:", err);
      }
    })();
  }, [user]);

  React.useEffect(() => {
    if (user?.colonyId) {
      (async () => {
        try {
          const val = await AsyncStorage.getItem("last_seen_notifications");
          if (val) {
            setLastSeenTime(Number(val));
          } else {
            const now = Date.now();
            await AsyncStorage.setItem("last_seen_notifications", String(now));
            setLastSeenTime(now);
          }
        } catch {}
      })();
    }
  }, [user?.colonyId]);

  const handleOpenNotifications = async () => {
    setShowNotificationsModal(true);
    const now = Date.now();
    try {
      await AsyncStorage.setItem("last_seen_notifications", String(now));
      setLastSeenTime(now);
    } catch {}
  };

  const handleAdminChoicePress = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Admin Password Required",
        "Please enter the password to register a colony:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Verify",
            onPress: (pwd?: string) => {
              if (pwd === "Admin@1234") {
                setActiveTab("admin");
              } else {
                Alert.alert("Error", "Incorrect admin password");
              }
            }
          }
        ],
        "secure-text"
      );
    } else if (Platform.OS === "web") {
      const pwd = window.prompt("Enter admin password:");
      if (pwd === "Admin@1234") {
        setActiveTab("admin");
      } else if (pwd !== null) {
        alert("Incorrect admin password");
      }
    } else {
      setShowAdminPasswordModal(true);
    }
  };

  const [searchTerm, setSearchTerm] = React.useState("");
  
  // Create Form States
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [address, setAddress] = React.useState("");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetFeedStats();
  const { data: activity, isLoading: actLoading, refetch: refetchActivity } = useGetRecentActivity();
  const { data: alerts = [], refetch: refetchAlerts } = useListAlerts();

  const { data: pendingMembers = [] } = useListPendingMembers({
    query: {
      enabled: !!user && user.isColonyAdmin === true,
      refetchInterval: 15000,
      queryKey: getListPendingMembersQueryKey()
    }
  });
  const verifyMember = useVerifyColonyMember();

  const pendingCount = user?.isColonyAdmin ? pendingMembers.length : 0;
  const newActivityCount = activity 
    ? activity.filter(a => new Date(a.createdAt).getTime() > lastSeenTime).length
    : 0;
  const unseenCount = pendingCount + newActivityCount;

  // Onboarding Hooks
  const { data: colonies, isLoading: coloniesLoading } = useListColonies({
    query: {
      enabled: !!user && !user.colonyId,
      queryKey: getListColoniesQueryKey()
    }
  });
  const createColony = useCreateColony();
  const joinColony = useJoinColony();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchActivity(), refetchAlerts()]);
    setRefreshing(false);
  };

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const activeEmergencyAlerts = alerts.filter(a => !a.isResolved && (a.severity === "emergency" || a.severity === "high"));

  if (user && !user.colonyId) {
    const handleRegister = async () => {
      if (!name.trim() || !description.trim() || !address.trim()) {
        Alert.alert("Missing Fields", "Please fill in all colony fields");
        return;
      }
      try {
        await createColony.mutateAsync({
          data: {
            name: name.trim(),
            description: description.trim(),
            address: address.trim()
          }
        });
        Alert.alert("Success", "Colony Registered successfully!");
        setName("");
        setDescription("");
        setAddress("");
        setActiveTab("choose");
        await refetchUser();
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to create colony");
      }
    };

    const handleJoin = async (colId: number) => {
      try {
        await joinColony.mutateAsync({
          data: { colonyId: colId }
        });
        Alert.alert("Success", "Join request submitted. Pending admin approval.");
        await refetchUser();
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to join colony");
      }
    };

    const filteredColonies = colonies?.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top + webTopPad + 30, paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 20 }}>
          <Feather name="map-pin" size={48} color={colors.primary} style={{ alignSelf: "center", marginBottom: 12 }} />
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground, textAlign: "center" }}>Setup Your Colony</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", marginTop: 4, marginHorizontal: 20 }}>
            To access the neighborhood portal, you must register a new colony as an Admin, or join an existing one as a Resident.
          </Text>
        </View>

        {activeTab === "choose" && (
          <View style={{ gap: 16, marginTop: 10 }}>
            {/* Admin choice */}
            <TouchableOpacity 
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 20, borderRadius: 16 }}
              onPress={handleAdminChoicePress}
              activeOpacity={0.8}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary + "18", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Feather name="home" size={20} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.foreground }}>Become a Colony Admin</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, lineHeight: 16 }}>
                Register a new colony. You will approve residency requests, manage safety alerts, and configure the neighborhood directory.
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: colors.primary }}>Register colony</Text>
                <Feather name="arrow-right" size={13} color={colors.primary} />
              </View>
            </TouchableOpacity>

            {/* Resident choice */}
            <TouchableOpacity 
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 20, borderRadius: 16 }}
              onPress={() => setActiveTab("resident")}
              activeOpacity={0.8}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary + "18", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Feather name="users" size={20} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.foreground }}>Join as a Resident</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, lineHeight: 16 }}>
                Search and join an existing colony. Participate in discussions, trade listings, view alerts, and message neighbors.
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: colors.primary }}>Search colonies</Text>
                <Feather name="arrow-right" size={13} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "admin" && (
          <View style={{ backgroundColor: colors.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 12, marginTop: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.foreground }}>Register New Colony</Text>
            
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}>Colony Name</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, color: colors.foreground, backgroundColor: colors.background }}
                placeholder="e.g. Skyline Residency"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}>Address / Location</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, color: colors.foreground, backgroundColor: colors.background }}
                placeholder="e.g. Sector 5, Dwarka"
                placeholderTextColor={colors.mutedForeground}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}>Short Description</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, color: colors.foreground, backgroundColor: colors.background, minHeight: 60 }}
                placeholder="e.g. Quiet neighborhood with 150 flats..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: "center" }}
                onPress={() => setActiveTab("choose")}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 10, alignItems: "center" }}
                onPress={handleRegister}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === "resident" && (
          <View style={{ backgroundColor: colors.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 12, marginTop: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.foreground }}>Search Colonies</Text>
            
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: colors.background }}>
              <Feather name="search" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 8, color: colors.foreground }}
                placeholder="Search by name or address..."
                placeholderTextColor={colors.mutedForeground}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            {coloniesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
            ) : filteredColonies && filteredColonies.length > 0 ? (
              <ScrollView style={{ maxHeight: 200, gap: 8 }} nestedScrollEnabled>
                {filteredColonies.map((colony) => (
                  <View key={colony.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.foreground }}>{colony.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{colony.address}</Text>
                    </View>
                    <TouchableOpacity 
                      style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 6 }}
                      onPress={() => handleJoin(colony.id)}
                    >
                      <Text style={{ color: colors.primaryForeground, fontSize: 12, fontWeight: "bold" }}>Join</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center", marginVertical: 10 }}>
                No colonies match your search.
              </Text>
            )}

            <TouchableOpacity 
              style={{ paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: "center", marginTop: 6 }}
              onPress={() => setActiveTab("choose")}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin Onboarding Password Modal for Android */}
        <Modal
          visible={showAdminPasswordModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowAdminPasswordModal(false);
            setAdminPasswordInput("");
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Admin Verification</Text>
              <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
                Please enter the administrator password to register a colony:
              </Text>
              <TextInput
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                secureTextEntry
                autoFocus
                value={adminPasswordInput}
                onChangeText={setAdminPasswordInput}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowAdminPasswordModal(false);
                    setAdminPasswordInput("");
                  }}
                >
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, borderWidth: 0 }]}
                  onPress={() => {
                    if (adminPasswordInput === "Admin@1234") {
                      setShowAdminPasswordModal(false);
                      setAdminPasswordInput("");
                      setActiveTab("admin");
                    } else {
                      Alert.alert("Error", "Incorrect admin password");
                    }
                  }}
                >
                  <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + webTopPad + 16, paddingBottom: 100 + webBotPad }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerSection}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting}</Text>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
            {user?.name ?? "Neighbor"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {user?.colonyId && (
            <TouchableOpacity 
              style={[styles.bellBtn, { backgroundColor: colors.card, borderColor: colors.border }]} 
              onPress={handleOpenNotifications}
              activeOpacity={0.7}
            >
              <Feather name="bell" size={20} color={colors.foreground} />
              {unseenCount > 0 && (
                <View style={[styles.bellBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={styles.bellBadgeText}>{unseenCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logoMark}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Critical Status Alerts / Messages */}
      <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 20 }}>
        {user && !user.colonyId && (
          <View style={[styles.statusBanner, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <Feather name="map-pin" size={16} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: "#1D4ED8" }]}>Join a Colony</Text>
              <Text style={[styles.statusText, { color: "#2563EB" }]}>
                You haven't joined a colony yet. Register or join a colony in the Colony Hub to connect with neighbors.
              </Text>
              <TouchableOpacity onPress={() => router.push("/colonies" as any)} style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#1D4ED8" }}>Go to Colony Hub &rarr;</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {user && user.colonyId && !user.isVerified && (
          <View style={[styles.statusBanner, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
            <Feather name="alert-triangle" size={16} color="#D97706" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: "#B45309" }]}>Verification Pending</Text>
              <Text style={[styles.statusText, { color: "#D97706" }]}>
                Your residency is pending verification by the administrator. You can still use the community portal, but you are not yet verified.
              </Text>
              <TouchableOpacity onPress={() => router.push("/colonies" as any)} style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#B45309" }}>Go to Colony Hub &rarr;</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeEmergencyAlerts.length > 0 && (
          <View style={[styles.statusBanner, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
            <Feather name="alert-triangle" size={16} color="#DC2626" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.statusTitle, { color: "#991B1B" }]}>CRITICAL EMERGENCIES</Text>
              {activeEmergencyAlerts.map(alert => (
                <View key={alert.id} style={{ borderLeftWidth: 2, borderLeftColor: "#EF4444", paddingLeft: 8, marginVertical: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#111827" }}>{alert.title}</Text>
                  <Text style={{ fontSize: 11, color: "#4B5563" }}>{alert.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Quick Action Grid */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
      <View style={styles.quickActionGrid}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/alerts" as any)} activeOpacity={0.7}>
          <View style={[styles.actionIconBg, { backgroundColor: "#EF444415" }]}>
            <Feather name="alert-triangle" size={18} color="#EF4444" />
          </View>
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>Report Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/colonies" as any)} activeOpacity={0.7}>
          <View style={[styles.actionIconBg, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="map" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>Colony Hub</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/assistant" as any)} activeOpacity={0.7}>
          <View style={[styles.actionIconBg, { backgroundColor: "#6366F115" }]}>
            <Feather name="cpu" size={18} color="#6366F1" />
          </View>
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>AI Assistant</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/hostels" as any)} activeOpacity={0.7}>
          <View style={[styles.actionIconBg, { backgroundColor: "#F9731615" }]}>
            <Feather name="home" size={18} color="#F97316" />
          </View>
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>Browse PGs</Text>
        </TouchableOpacity>
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
        <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0, marginBottom: 0 }]}>Recent Activity</Text>
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

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.notificationsContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.notificationsHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.notificationsTitle, { color: colors.foreground }]}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
              {/* Residency Requests for Admins */}
              {user?.isColonyAdmin && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary, letterSpacing: 0.5 }}>RESIDENCY REQUESTS</Text>
                  {pendingMembers.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, fontStyle: "italic" }}>No pending requests.</Text>
                  ) : (
                    pendingMembers.map((member: any) => (
                      <View key={member.id} style={[styles.pendingItem, { borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.foreground }}>{member.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{member.apartment || "No unit specified"}</Text>
                        </View>
                        <TouchableOpacity
                          style={{ backgroundColor: "#10B981", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 }}
                          onPress={async () => {
                            try {
                              await verifyMember.mutateAsync({ data: { memberId: member.id } });
                              Alert.alert("Success", "Resident approved.");
                              queryClient.invalidateQueries({ queryKey: getListPendingMembersQueryKey() });
                            } catch (err: any) {
                              Alert.alert("Error", err.message || "Failed to approve member");
                            }
                          }}
                        >
                          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* Recent Activities */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary, letterSpacing: 0.5 }}>RECENT ACTIVITY</Text>
                {!activity?.length ? (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, fontStyle: "italic" }}>No recent activity.</Text>
                ) : (
                  activity.map((item) => {
                    const conf = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.post;
                    return (
                      <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
                        <View style={[styles.actIcon, { backgroundColor: conf.color + "18", width: 30, height: 30, borderRadius: 15 }]}>
                          <Feather name={conf.icon} size={14} color={conf.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: colors.foreground }}>
                            <Text style={{ fontWeight: "bold" }}>{item.actorName}</Text> {item.type === "post" ? "posted" : item.type === "listing" ? "listed" : item.type === "event" ? "created event" : item.type === "alert" ? "reported" : "offered"}: {item.title}
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 20,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 2 },
  logoMark: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 12, marginBottom: 12 },
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
  statusBanner: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: "flex-start" },
  statusTitle: { fontSize: 14, fontWeight: "bold" },
  statusText: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  quickActionGrid: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 8 },
  actionIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  bellBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  bellBadge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  bellBadgeText: { color: "#ffffff", fontSize: 9, fontWeight: "bold" },
  notificationsContent: { width: "90%", height: "80%", borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  notificationsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  notificationsTitle: { fontSize: 18, fontWeight: "bold" },
  pendingItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, borderWidth: 1, borderRadius: 10, marginVertical: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", padding: 20, borderRadius: 16, borderWidth: 1, gap: 14 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular" },
  modalButtons: { flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 6 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, alignItems: "center", minWidth: 80 },
});
