import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, Alert, Platform, KeyboardAvoidingView,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateUser, useListColonies } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user, logout, refetchUser } = useAuth();
  const updateMutation = useUpdateUser();
  const { data: colonies } = useListColonies();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [apartment, setApartment] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (user && !initialized.current) {
      setName(user.name ?? "");
      setBio(user.bio ?? "");
      setApartment(user.apartment ?? "");
      setPhone(user.phone ?? "");
      setAvatarUrl(user.avatarUrl ?? "");
      setTwitterUrl(user.twitterUrl ?? "");
      setFacebookUrl(user.facebookUrl ?? "");
      setLinkedinUrl(user.linkedinUrl ?? "");
      setInstagramUrl(user.instagramUrl ?? "");
      setGithubUrl(user.githubUrl ?? "");
      initialized.current = true;
    }
  }, [user]);

  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const handleSave = async () => {
    if (!user) return;
    if (name.trim().length < 2) { Alert.alert("Name too short", "Name must be at least 2 characters"); return; }
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: { 
          name: name.trim(), 
          bio: bio.trim() || undefined, 
          apartment: apartment.trim() || undefined, 
          phone: phone.trim() || undefined, 
          avatarUrl: avatarUrl.trim() || undefined,
          twitterUrl: twitterUrl.trim() || undefined,
          facebookUrl: facebookUrl.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          instagramUrl: instagramUrl.trim() || undefined,
          githubUrl: githubUrl.trim() || undefined
        },
      });
      await qc.invalidateQueries();
      await refetchUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Profile updated successfully");
    } catch {
      Alert.alert("Error", "Failed to update profile");
    }
  };

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="user" size={40} color={colors.mutedForeground} />
        <Text style={[styles.noAuthText, { color: colors.mutedForeground }]}>Sign in to view your profile</Text>
      </View>
    );
  }

  const previewUrl = avatarUrl.trim() || null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 40 + webBotPad }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          {previewUrl ? (
            <Image source={{ uri: previewUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {name.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <Text style={[styles.avatarNote, { color: colors.mutedForeground }]}>
            Enter an image URL below to update your photo
          </Text>

          {user.colonyId && colonies && (
            (() => {
              const myColony = colonies.find(c => c.id === user.colonyId);
              if (!myColony) return null;
              return (
                <View style={[styles.colonyBadgeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="map-pin" size={13} color={colors.primary} />
                  <Text style={[styles.colonyName, { color: colors.foreground }]}>{myColony.name}</Text>
                  {user.isColonyApproved ? (
                    <View style={[styles.badgeVerified, { backgroundColor: "#10B981" }]}>
                      <Feather name="check" size={10} color="#fff" />
                      <Text style={styles.badgeText}>Verified</Text>
                    </View>
                  ) : (
                    <View style={[styles.badgePending, { backgroundColor: "#F59E0B" }]}>
                      <Feather name="alert-circle" size={10} color="#fff" />
                      <Text style={styles.badgeText}>Pending</Text>
                    </View>
                  )}
                </View>
              );
            })()
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Public Information</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={name} onChangeText={setName}
                placeholder="Your name" placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Unit / House</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={apartment} onChangeText={setApartment}
                placeholder="e.g. 4B" placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Bio</Text>
          <TextInput
            style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={bio} onChangeText={setBio}
            placeholder="Tell neighbors about yourself..." placeholderTextColor={colors.mutedForeground}
            multiline textAlignVertical="top"
            maxLength={160}
          />
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{bio.length}/160</Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={phone} onChangeText={setPhone}
            placeholder="+91 98765 43210" placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Avatar URL</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={avatarUrl} onChangeText={setAvatarUrl}
            placeholder="https://..." placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={[styles.separator, { borderTopColor: colors.border }]} />
          <Text style={[styles.sectionSubtitle, { color: colors.foreground }]}>Social Profiles</Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Twitter / X URL</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={twitterUrl} onChangeText={setTwitterUrl}
            placeholder="https://x.com/username" placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none" keyboardType="url"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Facebook URL</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={facebookUrl} onChangeText={setFacebookUrl}
            placeholder="https://facebook.com/username" placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none" keyboardType="url"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>LinkedIn URL</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={linkedinUrl} onChangeText={setLinkedinUrl}
            placeholder="https://linkedin.com/in/username" placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none" keyboardType="url"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Instagram URL</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={instagramUrl} onChangeText={setInstagramUrl}
            placeholder="https://instagram.com/username" placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none" keyboardType="url"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>GitHub URL</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={githubUrl} onChangeText={setGithubUrl}
            placeholder="https://github.com/username" placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none" keyboardType="url"
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.destructive }]}
            onPress={() => Alert.alert("Sign Out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: logout },
            ])}
            activeOpacity={0.85}
          >
            <Text style={[styles.logoutBtnText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAuthText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 40, fontFamily: "Inter_700Bold" },
  avatarNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  row: { flexDirection: "row", gap: 10 },
  halfField: { flex: 1 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 90 },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  actions: { marginHorizontal: 16, marginTop: 20, gap: 12 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  logoutBtn: { padding: 16, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  logoutBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  colonyBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  colonyName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  badgeVerified: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgePending: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, color: "#fff", fontFamily: "Inter_700Bold" },
  separator: { borderTopWidth: 1, marginTop: 20, marginBottom: 12 },
  sectionSubtitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
});
