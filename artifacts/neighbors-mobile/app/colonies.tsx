import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListColonies,
  useCreateColony,
  useJoinColony,
  useListPendingMembers,
  useVerifyColonyMember,
  getListColoniesQueryKey,
  getListPendingMembersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function ColoniesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  const { data: colonies, isLoading: coloniesLoading } = useListColonies();
  
  // Only query pending members if the user is a colony admin
  const { data: pendingMembers } = useListPendingMembers({
    query: {
      enabled: !!(user?.isColonyAdmin && user?.colonyId),
      queryKey: getListPendingMembersQueryKey(),
    }
  });

  const createColony = useCreateColony();
  const joinColony = useJoinColony();
  const verifyMember = useVerifyColonyMember();

  const handleCreate = async () => {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Colony Created! You are the administrator.");
      setName("");
      setDescription("");
      setAddress("");
      setIsRegistering(false);
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: getListColoniesQueryKey() });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create colony");
    }
  };

  const handleJoin = (colId: number) => {
    Alert.alert(
      colId === 0 ? "Leave Colony" : "Join Colony",
      colId === 0 ? "Are you sure you want to leave your current colony?" : "Do you want to send a join request to this colony?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await joinColony.mutateAsync({
                data: { colonyId: colId }
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Request Sent",
                colId === 0 ? "You left the colony." : "Requested successfully. An administrator must verify your account."
              );
              await refetchUser();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to submit request");
            }
          }
        }
      ]
    );
  };

  const handleVerify = async (memberId: number) => {
    try {
      await verifyMember.mutateAsync({
        data: { memberId }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Neighbor verified successfully!");
      queryClient.invalidateQueries({ queryKey: getListPendingMembersQueryKey() });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to verify member");
    }
  };

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="shield" size={40} color={colors.mutedForeground} />
        <Text style={[styles.noAuthText, { color: colors.mutedForeground }]}>Sign in to view Colony Hub</Text>
      </View>
    );
  }

  const myColony = colonies?.find(c => c.id === user.colonyId);
  const filteredColonies = colonies?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const webBotPad = Platform.OS === "web" ? 34 : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + webBotPad }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {user.colonyId && myColony ? (
          <View style={styles.colonyContainer}>
            {/* Active Colony Card */}
            <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.badgeRow}>
                <View style={[styles.tabBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.tabBadgeText, { color: colors.primary }]}>ACTIVE COLONY</Text>
                </View>
                {user.isColonyApproved ? (
                  <View style={[styles.statusBadge, { backgroundColor: "#10B98120" }]}>
                    <Feather name="check" size={12} color="#10B981" />
                    <Text style={[styles.statusText, { color: "#10B981" }]}>Verified Resident</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: "#F59E0B20" }]}>
                    <Feather name="alert-circle" size={12} color="#F59E0B" />
                    <Text style={[styles.statusText, { color: "#F59E0B" }]}>Pending Verification</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.colonyTitle, { color: colors.foreground }]}>{myColony.name}</Text>
              
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{myColony.address}</Text>
              </View>

              <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground, marginTop: 12 }]}>About the Colony</Text>
              <Text style={[styles.description, { color: colors.foreground }]}>{myColony.description}</Text>

              {!user.isColonyApproved && (
                <View style={[styles.alertNotice, { backgroundColor: "#F59E0B10", borderColor: "#F59E0B30" }]}>
                  <Feather name="alert-triangle" size={16} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>Verification Required</Text>
                    <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
                      An admin of this colony needs to confirm your details. Once approved, you will get a checkmark badge.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Admin Dashboard */}
            {user.isColonyAdmin && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
                <View style={styles.adminHeader}>
                  <Feather name="users" size={18} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Admin Dashboard</Text>
                </View>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>Approve residency requests from neighbors.</Text>

                {pendingMembers && pendingMembers.length > 0 ? (
                  <View style={styles.pendingList}>
                    {pendingMembers.map((member) => (
                      <View key={member.id} style={[styles.memberItem, { borderColor: colors.border }]}>
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
                          <Text style={[styles.memberMeta, { color: colors.mutedForeground }]}>
                            @{member.username} {member.apartment && `• Flat ${member.apartment}`}
                          </Text>
                          {member.phone && <Text style={[styles.memberPhone, { color: colors.mutedForeground }]}>Phone: {member.phone}</Text>}
                        </View>
                        <TouchableOpacity
                          style={[styles.approveBtn, { backgroundColor: "#10B981" }]}
                          onPress={() => handleVerify(member.id)}
                          activeOpacity={0.85}
                        >
                          <Feather name="check" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Feather name="smile" size={24} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>All verified! No pending requests.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Leave / Switch buttons */}
            <TouchableOpacity
              style={[styles.leaveButton, { borderColor: colors.destructive }]}
              onPress={() => handleJoin(0)}
              activeOpacity={0.8}
            >
              <Text style={[styles.leaveText, { color: colors.destructive }]}>Leave Colony / Switch Colony</Text>
              <Feather name="arrow-right" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.unassociatedContainer}>
            {/* Search/Join or Register Options */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleTab, !isRegistering ? { borderBottomColor: colors.primary, borderBottomWidth: 2 } : {}]}
                onPress={() => setIsRegistering(false)}
              >
                <Text style={[styles.toggleText, { color: !isRegistering ? colors.primary : colors.mutedForeground }]}>Find & Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleTab, isRegistering ? { borderBottomColor: colors.primary, borderBottomWidth: 2 } : {}]}
                onPress={() => setIsRegistering(true)}
              >
                <Text style={[styles.toggleText, { color: isRegistering ? colors.primary : colors.mutedForeground }]}>Register Colony</Text>
              </TouchableOpacity>
            </View>

            {!isRegistering ? (
              <View style={styles.findSection}>
                <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Feather name="search" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Search by colony name or address..."
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                {coloniesLoading ? (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
                ) : filteredColonies && filteredColonies.length > 0 ? (
                  <View style={styles.colonyList}>
                    {filteredColonies.map((colony) => (
                      <View key={colony.id} style={[styles.colonyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.itemName, { color: colors.foreground }]}>{colony.name}</Text>
                          <Text style={[styles.itemAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {colony.address}
                          </Text>
                          <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {colony.description}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                          onPress={() => handleJoin(colony.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.joinBtnText, { color: colors.primaryForeground }]}>Join</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Feather name="map" size={30} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No matching colonies found.</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Register New Colony</Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground, marginBottom: 16 }]}>
                  Become the administrator of a new colony directory.
                </Text>

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Colony Name</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={name} onChangeText={setName}
                  placeholder="e.g. Skyline Residency" placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Address / Sector</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={address} onChangeText={setAddress}
                  placeholder="e.g. Sector 5, Dwarka" placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
                <TextInput
                  style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={description} onChangeText={setDescription}
                  placeholder="Society details, number of blocks..." placeholderTextColor={colors.mutedForeground}
                  multiline textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreate}
                  disabled={createColony.isPending}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                    {createColony.isPending ? "Registering..." : "Create & Manage"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAuthText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  colonyContainer: { gap: 16 },
  activeCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  tabBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tabBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  colonyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionSubtitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 4 },
  alertNotice: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 16 },
  alertTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#B45309" },
  alertText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  adminHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  pendingList: { gap: 10, marginTop: 10 },
  memberItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, paddingBottom: 10 },
  memberInfo: { flex: 1, marginRight: 8 },
  memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  memberPhone: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  approveBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  approveBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  leaveButton: { borderWidth: 1, padding: 14, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginVertical: 12 },
  leaveText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  unassociatedContainer: { gap: 16 },
  toggleRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EBE8E0", marginBottom: 8 },
  toggleTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  toggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  findSection: { gap: 14 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  colonyList: { gap: 10 },
  colonyItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 14 },
  itemName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  itemAddress: { fontSize: 12, fontFamily: "Inter_400Regular" },
  itemDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  joinBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyContainer: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 90 },
  submitBtn: { padding: 16, borderRadius: 14, alignItems: "center", marginTop: 16 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
