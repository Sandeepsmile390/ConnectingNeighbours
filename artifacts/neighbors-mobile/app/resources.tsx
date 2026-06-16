import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Platform, Alert, RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListResources, useCreateResource, useDeleteResource } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ResourceCard } from "@/components/ResourceCard";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

const TYPES = [
  { key: "", label: "All" },
  { key: "item", label: "Items" },
  { key: "service", label: "Services" },
  { key: "ride", label: "Rides" },
  { key: "childcare", label: "Childcare" },
];

export default function ResourcesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user, isAuthenticated, login } = useAuth();

  const [typeFilter, setTypeFilter] = useState<"ride" | "item" | "service" | "childcare" | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resType, setResType] = useState<"ride" | "item" | "service" | "childcare">("item");
  const [refreshing, setRefreshing] = useState(false);

  const { data: resources = [], isLoading, refetch } = useListResources({ type: typeFilter });
  const createMutation = useCreateResource();
  const deleteMutation = useDeleteResource();

  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Missing fields", "Title and description are required");
      return;
    }
    try {
      await createMutation.mutateAsync({ data: { title: title.trim(), description: description.trim(), type: resType } });
      await qc.invalidateQueries();
      setShowCreate(false);
      setTitle(""); setDescription(""); setResType("item");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to offer resource");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Remove Resource", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try { await deleteMutation.mutateAsync({ id }); await qc.invalidateQueries(); } catch {}
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={isLoading ? [] : resources}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => (
          <ResourceCard resource={item} currentUserId={user?.id} onDelete={handleDelete} />
        )}
        ListHeaderComponent={
          <View>
            <View style={[styles.bannerHeader, { backgroundColor: colors.primary + "12", borderBottomColor: colors.primary + "30" }]}>
              <View style={styles.bannerLeft}>
                <Feather name="heart" size={20} color={colors.primary} />
                <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Shared Resources</Text>
              </View>
              {isAuthenticated ? (
                <TouchableOpacity
                  style={[styles.offerBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowCreate(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.offerBtnText}>Offer</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.offerBtn, { backgroundColor: colors.primary }]} onPress={login} activeOpacity={0.8}>
                  <Text style={styles.offerBtnText}>Sign in</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.filterChip, { backgroundColor: typeFilter === (t.key || undefined) ? colors.primary : colors.muted }]}
                  onPress={() => setTypeFilter((t.key || undefined) as typeof typeFilter)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, { color: typeFilter === (t.key || undefined) ? "#fff" : colors.foreground }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 24, gap: 10 }}>
              {[...Array(3)].map((_, i) => <View key={i} style={[styles.skeleton, { backgroundColor: colors.muted }]} />)}
            </View>
          ) : (
            <EmptyState
              icon="heart"
              title="No resources yet"
              description="Share what you can offer — rides, tools, services, or childcare."
              actionLabel={isAuthenticated ? "Offer Resource" : undefined}
              onAction={() => setShowCreate(true)}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 40 + webBotPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? insets.top : 0 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Offer Resource</Text>
              <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.8}>
                <Text style={[styles.postBtn, { color: colors.primary }]}>
                  {createMutation.isPending ? "Offering..." : "Offer"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
              <View style={styles.typeGrid}>
                {(["item", "service", "ride", "childcare"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, { backgroundColor: resType === t ? colors.primary : colors.muted, flex: 1 }]}
                    onPress={() => setResType(t)}
                  >
                    <Text style={[styles.typeBtnText, { color: resType === t ? "#fff" : colors.foreground }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Title *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={title} onChangeText={setTitle}
                placeholder="What are you offering?" placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Description *</Text>
              <TextInput
                style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={description} onChangeText={setDescription}
                placeholder="Tell people more about it..." placeholderTextColor={colors.mutedForeground}
                multiline textAlignVertical="top"
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bannerHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 1,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  bannerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  offerBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4 },
  offerBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  filterBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  skeleton: { height: 80, borderRadius: 14, marginHorizontal: 16, marginBottom: 10 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  postBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 16 },
  typeGrid: { flexDirection: "row", gap: 8 },
  typeBtn: { paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  typeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 100 },
});
