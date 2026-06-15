import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Platform, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";

const MENU_ITEMS: { label: string; icon: keyof typeof Feather.glyphMap; route: string; desc: string }[] = [
  { label: "Members", icon: "users", route: "/members", desc: "Browse colony residents" },
  { label: "Safety Alerts", icon: "alert-triangle", route: "/alerts", desc: "View & report incidents" },
  { label: "Shared Resources", icon: "heart", route: "/resources", desc: "Community sharing network" },
  { label: "My Profile", icon: "user", route: "/profile", desc: "Edit your neighborhood profile" },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, login, logout } = useAuth();

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user.name}</Text>
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
          <Feather name="user" size={32} color={colors.primary} />
          <Text style={[styles.loginTitle, { color: colors.foreground }]}>Join Your Neighborhood</Text>
          <Text style={[styles.loginDesc, { color: colors.mutedForeground }]}>
            Sign in to post, RSVP to events, and connect with neighbors.
          </Text>
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={login}
            activeOpacity={0.85}
          >
            <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Sign In with Replit</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EXPLORE</Text>
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.route}
            style={[
              styles.menuItem,
              i < MENU_ITEMS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : {},
            ]}
            onPress={() => router.push(item.route as "/members" | "/alerts" | "/resources" | "/profile")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.primary + "18" }]}>
              <Feather name={item.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      {isAuthenticated && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  loginCard: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1,
    padding: 24, alignItems: "center", gap: 8, marginBottom: 24,
  },
  loginTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
  loginDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  loginBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  loginBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
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
});
