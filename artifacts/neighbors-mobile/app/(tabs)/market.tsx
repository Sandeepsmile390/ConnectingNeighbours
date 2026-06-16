import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Platform, Alert, RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListListings, useCreateListing, useDeleteListing } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

const TYPES = [
  { key: "", label: "All" },
  { key: "sell", label: "For Sale" },
  { key: "free", label: "Free" },
  { key: "rent", label: "For Rent" },
];

const CATEGORIES = ["electronics", "furniture", "clothing", "books", "groceries", "appliances", "other"];

export default function MarketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user, isAuthenticated, login } = useAuth();

  const [typeFilter, setTypeFilter] = useState<"sell" | "free" | "rent" | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [listingType, setListingType] = useState<"sell" | "free" | "rent">("sell");
  const [listingCat, setListingCat] = useState("other");
  const [refreshing, setRefreshing] = useState(false);

  const { data: listings = [], isLoading, refetch } = useListListings({ type: typeFilter });
  const createMutation = useCreateListing();
  const deleteMutation = useDeleteListing();

  const webTopPad = Platform.OS === "web" ? 67 : 0;
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
      await createMutation.mutateAsync({
        data: {
          title: title.trim(),
          description: description.trim(),
          type: listingType,
          category: listingCat as any,
          price: listingType !== "free" && price ? parseFloat(price) : undefined,
        }
      });
      await qc.invalidateQueries();
      setShowCreate(false);
      setTitle(""); setDescription(""); setPrice("");
      setListingType("sell"); setListingCat("other");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to create listing");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Remove Listing", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try { await deleteMutation.mutateAsync({ id }); await qc.invalidateQueries(); } catch {}
        },
      },
    ]);
  };

  const numCols = 2;
  const currentUserId = user?.id;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={isLoading ? [] : listings}
        keyExtractor={(l) => String(l.id)}
        numColumns={numCols}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16, marginBottom: 10 }}
        renderItem={({ item }) => (
          <ListingCard listing={item} currentUserId={currentUserId} onDelete={handleDelete} />
        )}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + webTopPad + 12 }}>
            <View style={styles.topBar}>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>Market</Text>
              {isAuthenticated && (
                <TouchableOpacity
                  style={[styles.newBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowCreate(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.filterChip, { backgroundColor: typeFilter === (t.key || undefined) ? colors.primary : colors.muted }]}
                  onPress={() => setTypeFilter((t.key || undefined) as "sell" | "free" | "rent" | undefined)}
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
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {[...Array(2)].map((_, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[styles.skeletonCard, { backgroundColor: colors.muted }]} />
                  <View style={[styles.skeletonCard, { backgroundColor: colors.muted }]} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="shopping-bag"
              title="Nothing listed yet"
              description="Share items with your neighbors — sell, give away, or rent."
              actionLabel={isAuthenticated ? "Add Listing" : undefined}
              onAction={() => setShowCreate(true)}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 100 + webBotPad, paddingTop: 8 }}
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Listing</Text>
              <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.8}>
                <Text style={[styles.postBtn, { color: colors.primary }]}>
                  {createMutation.isPending ? "Listing..." : "List"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
              <View style={styles.segRow}>
                {(["sell", "free", "rent"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.seg, { backgroundColor: listingType === t ? colors.primary : colors.muted, flex: 1 }]}
                    onPress={() => setListingType(t)}
                  >
                    <Text style={{ color: listingType === t ? "#fff" : colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium", textTransform: "capitalize" }}>
                      {t === "sell" ? "For Sale" : t === "free" ? "Free" : "For Rent"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Title *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={title} onChangeText={setTitle}
                placeholder="What are you listing?" placeholderTextColor={colors.mutedForeground}
              />
              {listingType !== "free" && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Price (₹)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    value={price} onChangeText={setPrice}
                    placeholder="0" placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </>
              )}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.filterChip, { backgroundColor: listingCat === c ? colors.primary : colors.muted, marginRight: 8 }]}
                    onPress={() => setListingCat(c)}
                  >
                    <Text style={[styles.filterChipText, { color: listingCat === c ? "#fff" : colors.foreground, textTransform: "capitalize" }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Description *</Text>
              <TextInput
                style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={description} onChangeText={setDescription}
                placeholder="Describe the item..." placeholderTextColor={colors.mutedForeground}
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
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  newBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  filterBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  skeletonCard: { height: 160, borderRadius: 14, flex: 1 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  postBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 16 },
  segRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  seg: { paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 100 },
});
