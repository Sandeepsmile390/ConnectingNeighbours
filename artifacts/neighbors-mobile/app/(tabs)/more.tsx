import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Platform, Alert, Modal, TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useListConversations, 
  useListPendingMembers, 
  useListAlerts,
  getListConversationsQueryKey,
  getListPendingMembersQueryKey,
  getListAlertsQueryKey
} from "@workspace/api-client-react";

const MENU_ITEMS: { label: string; icon: keyof typeof Feather.glyphMap; route: string; desc: string }[] = [
  { label: "Members", icon: "users", route: "/members", desc: "Browse colony residents" },
  { label: "Colony Hub", icon: "map-pin", route: "/colonies", desc: "Manage your colony residency" },
  { label: "Safety Alerts", icon: "alert-triangle", route: "/alerts", desc: "View & report incidents" },
  { label: "Private Messages", icon: "message-square", route: "/chat", desc: "Send direct messages to neighbors" },
  { label: "Shared Resources", icon: "heart", route: "/resources", desc: "Community sharing network" },
  { label: "Hostels & PG Rentals", icon: "home", route: "/hostels", desc: "Explore local accommodations" },
  { label: "Community Guidelines", icon: "book-open", route: "/guidelines", desc: "Read our rules and terms" },
  { label: "AI Guide", icon: "cpu", route: "/assistant", desc: "Ask the neighborhood AI chatbot" },
  { label: "App Feedback", icon: "smile", route: "/feedback", desc: "Submit bugs or recommendations" },
  { label: "My Profile", icon: "user", route: "/profile", desc: "Edit your neighborhood profile" },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, login, loginDev, logout, refetchUser } = useAuth();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showGoogleAdminPasswordModal, setShowGoogleAdminPasswordModal] = useState(false);
  const [showPromotionPasswordModal, setShowPromotionPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [promotionPasswordInput, setPromotionPasswordInput] = useState("");

  const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN || "connecting-neighbours-apiserver.vercel.app";

  // Fetch count states
  const { data: conversations } = useListConversations({
    query: {
      enabled: isAuthenticated && !!user,
      refetchInterval: 10000,
      queryKey: getListConversationsQueryKey()
    }
  });

  const { data: pendingMembers } = useListPendingMembers({
    query: {
      enabled: isAuthenticated && !!user && user.isColonyAdmin === true,
      refetchInterval: 15000,
      queryKey: getListPendingMembersQueryKey()
    }
  });

  const { data: alerts } = useListAlerts({
    query: {
      enabled: isAuthenticated && !!user,
      refetchInterval: 10000,
      queryKey: getListAlertsQueryKey()
    }
  });

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const handleAdminDevLogin = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Admin Password Required",
        "Please enter the password to log in as administrator:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: (pwd?: string) => {
              if (pwd === "Admin@1234") {
                loginDev("admin", pwd).catch(() => {
                  Alert.alert("Error", "Admin login failed.");
                });
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
        loginDev("admin", pwd);
      } else if (pwd !== null) {
        alert("Incorrect admin password");
      }
    } else {
      // Android
      setShowPasswordModal(true);
    }
  };

  const handleGoogleAdminLogin = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Admin Password Required",
        "Please enter the password to log in as administrator:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: async (pwd?: string) => {
              if (pwd === "Admin@1234") {
                try {
                  const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
                  await AsyncStorage.setItem("intended_role", "admin");
                } catch {}
                login();
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
        (async () => {
          try {
            const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
            await AsyncStorage.setItem("intended_role", "admin");
          } catch {}
          login();
        })();
      } else if (pwd !== null) {
        alert("Incorrect admin password");
      }
    } else {
      setShowGoogleAdminPasswordModal(true);
    }
  };

  const promoteToAdmin = async (pwd: string) => {
    try {
      const storedToken = await AsyncStorage.getItem("cn_auth_token");
      if (!storedToken) return false;
      const res = await fetch(`https://${DOMAIN}/api/auth/promote-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        Alert.alert("Success", "You are now a colony administrator.");
        await refetchUser();
        return true;
      } else {
        Alert.alert("Error", "Incorrect admin password");
        return false;
      }
    } catch {
      Alert.alert("Error", "An error occurred during promotion.");
      return false;
    }
  };

  const handleBecomeAdminPress = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Admin Password Required",
        "Please enter the password to become colony admin:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Verify",
            onPress: async (pwd?: string) => {
              if (pwd) {
                await promoteToAdmin(pwd);
              }
            }
          }
        ],
        "secure-text"
      );
    } else if (Platform.OS === "web") {
      const pwd = window.prompt("Enter admin password:");
      if (pwd) {
        promoteToAdmin(pwd);
      }
    } else {
      setShowPromotionPasswordModal(true);
    }
  };

  const getBadgeCount = (route: string) => {
    if (route === "/chat") {
      return conversations?.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0) || 0;
    }
    if (route === "/colonies") {
      return user?.isColonyAdmin ? (pendingMembers?.length || 0) : 0;
    }
    if (route === "/alerts") {
      return alerts?.filter((a: any) => !a.isResolved && (a.severity === "emergency" || a.severity === "high")).length || 0;
    }
    return 0;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + webTopPad + 20, paddingBottom: 100 + webBotPad }}
        showsVerticalScrollIndicator={false}
      >
        {isAuthenticated && user ? (
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>{user.name}</Text>
                {user.isColonyAdmin && (
                  <View style={[styles.adminRoleBadge, { backgroundColor: "#F59E0B18" }]}>
                    <Feather name="shield" size={10} color="#F59E0B" />
                    <Text style={styles.adminRoleText}>Admin</Text>
                  </View>
                )}
              </View>
              {user.apartment && (
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{user.apartment}</Text>
                </View>
              )}
              {user.bio && (
                <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>{user.bio}</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.loginCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 8 }}
              resizeMode="cover"
            />
            <Text style={[styles.loginTitle, { color: colors.foreground }]}>Join Your Neighborhood</Text>
            <Text style={[styles.loginDesc, { color: colors.mutedForeground }]}>
              Sign in to post, RSVP to events, and connect with neighbors.
            </Text>
            
            <View style={{ width: "100%", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }]}
                onPress={handleGoogleAdminLogin}
                activeOpacity={0.85}
              >
                <Feather name="shield" size={16} color={colors.primaryForeground} />
                <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Sign In as Admin (Google)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }]}
                onPress={async () => {
                  try {
                    await AsyncStorage.setItem("intended_role", "resident");
                  } catch {}
                  login();
                }}
                activeOpacity={0.85}
              >
                <Feather name="user" size={16} color={colors.primaryForeground} />
                <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Sign In as Resident (Google)</Text>
              </TouchableOpacity>
            </View>

            {/* Developer Simulated Logins */}
            <View style={{ width: "100%", marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textAlign: "center", marginBottom: 8, letterSpacing: 0.5 }}>
                DEVELOPER SIMULATED LOGINS
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.devLoginBtn, { borderColor: colors.primary }]}
                  onPress={handleAdminDevLogin}
                >
                  <Text style={[styles.devLoginBtnText, { color: colors.primary }]}>Dev Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devLoginBtn, { borderColor: colors.primary }]}
                  onPress={() => loginDev("resident")}
                >
                  <Text style={[styles.devLoginBtnText, { color: colors.primary }]}>Dev Resident</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EXPLORE</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {MENU_ITEMS.map((item, i) => {
            const badgeCount = getBadgeCount(item.route);
            return (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.menuItem,
                  i < MENU_ITEMS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : {},
                ]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name={item.icon} size={18} color={colors.primary} />
                </View>
                <View style={styles.menuText}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                    {badgeCount > 0 && (
                      <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                        <Text style={styles.badgeText}>{badgeCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
        </View>

        {isAuthenticated && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {user && !user.isColonyAdmin && (
                <TouchableOpacity 
                  style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]} 
                  onPress={handleBecomeAdminPress} 
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconBox, { backgroundColor: "#F59E0B18" }]}>
                    <Feather name="shield" size={18} color="#F59E0B" />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[styles.menuLabel, { color: "#F59E0B" }]}>Become Colony Admin</Text>
                    <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>Elevate profile using admin password</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
                <View style={[styles.menuIconBox, { backgroundColor: colors.destructive + "18" }]}>
                  <Feather name="log-out" size={18} color={colors.destructive} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.destructive }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>Connecting Neighbors · v1.0</Text>
      </ScrollView>

      {/* Admin Password Modal for Android */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPasswordInput("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Admin Verification</Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              Please enter the administrator password:
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              secureTextEntry
              autoFocus
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                }}
              >
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderWidth: 0 }]}
                onPress={() => {
                  if (passwordInput === "Admin@1234") {
                    setShowPasswordModal(false);
                    const pwd = passwordInput;
                    setPasswordInput("");
                    loginDev("admin", pwd).catch(() => {
                      Alert.alert("Error", "Admin login failed.");
                    });
                  } else {
                    Alert.alert("Error", "Incorrect admin password");
                  }
                }}
              >
                <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Google Admin Password Modal for Android */}
      <Modal
        visible={showGoogleAdminPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowGoogleAdminPasswordModal(false);
          setPasswordInput("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Admin Verification</Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              Please enter the administrator password:
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              secureTextEntry
              autoFocus
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setShowGoogleAdminPasswordModal(false);
                  setPasswordInput("");
                }}
              >
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderWidth: 0 }]}
                onPress={async () => {
                  if (passwordInput === "Admin@1234") {
                    setShowGoogleAdminPasswordModal(false);
                    setPasswordInput("");
                    try {
                      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
                      await AsyncStorage.setItem("intended_role", "admin");
                    } catch {}
                    login();
                  } else {
                    Alert.alert("Error", "Incorrect admin password");
                  }
                }}
              >
                <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Promotion Admin Password Modal for Android */}
      <Modal
        visible={showPromotionPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPromotionPasswordModal(false);
          setPromotionPasswordInput("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Become Colony Admin</Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              Please enter the administrator password:
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              secureTextEntry
              autoFocus
              value={promotionPasswordInput}
              onChangeText={setPromotionPasswordInput}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setShowPromotionPasswordModal(false);
                  setPromotionPasswordInput("");
                }}
              >
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderWidth: 0 }]}
                onPress={async () => {
                  const success = await promoteToAdmin(promotionPasswordInput);
                  if (success) {
                    setShowPromotionPasswordModal(false);
                    setPromotionPasswordInput("");
                  }
                }}
              >
                <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1,
    padding: 16, flexDirection: "row", gap: 14, marginBottom: 24, alignItems: "flex-start",
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 24, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  adminRoleBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, gap: 3,
  },
  adminRoleText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4, marginTop: 4 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  loginCard: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1,
    padding: 24, alignItems: "center", gap: 8, marginBottom: 24,
  },
  loginTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
  loginDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  loginBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  loginBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  devLoginRow: { flexDirection: "row", gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", paddingTop: 12, width: "100%", justifyContent: "space-between" },
  devLoginBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderRadius: 10, alignItems: "center" },
  devLoginBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1,
    paddingHorizontal: 20, marginBottom: 8,
  },
  menuCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  menuIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  appVersion: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", padding: 20, borderRadius: 16, borderWidth: 1, gap: 14 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular" },
  modalButtons: { flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 6 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, alignItems: "center", minWidth: 80 },
});
