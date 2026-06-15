import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Platform, KeyboardAvoidingView, Linking
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListHostels,
  useCreateHostel,
  useListColonies,
  getListHostelsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function HostelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColonyFilter, setSelectedColonyFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [colonyId, setColonyId] = useState<number | null>(null);
  const [isColonyPickerOpen, setIsColonyPickerOpen] = useState(false);

  const { data: hostels, isLoading: hostelsLoading } = useListHostels();
  const { data: colonies } = useListColonies();
  const createHostel = useCreateHostel();

  const handleCreate = async () => {
    if (!name.trim() || !address.trim() || !price || !description.trim() || !contactInfo.trim() || !colonyId) {
      Alert.alert("Missing Fields", "Please fill in all listing fields");
      return;
    }

    try {
      await createHostel.mutateAsync({
        data: {
          name: name.trim(),
          address: address.trim(),
          description: description.trim(),
          contactInfo: contactInfo.trim(),
          price: Number(price),
          colonyId: colonyId
        }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Hostel listing posted successfully!");
      // Reset form
      setName("");
      setAddress("");
      setPrice("");
      setDescription("");
      setContactInfo("");
      setColonyId(null);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: getListHostelsQueryKey() });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to post listing");
    }
  };

  const handleCall = (phoneNum: string) => {
    const cleanNum = phoneNum.replace(/[^\d+]/g, "");
    Linking.openURL(`tel:${cleanNum}`).catch(() => {
      Alert.alert("Call Details", `Contact: ${phoneNum}`);
    });
  };

  const filteredHostels = hostels?.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          h.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          h.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesColony = selectedColonyFilter === "all" || h.colonyId === Number(selectedColonyFilter);

    return matchesSearch && matchesColony;
  });

  const selectedColonyName = colonies?.find(c => c.id === colonyId)?.name || "Select Colony Location";
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Search & Actions */}
        <View style={styles.header}>
          <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search rooms, PG hostels..."
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (!user) {
                Alert.alert("Sign In Required", "You must sign in to post hostel listings.");
                return;
              }
              setIsModalOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Colony Pill Filter */}
        <View style={styles.pillContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
            <TouchableOpacity
              style={[
                styles.pill,
                { backgroundColor: selectedColonyFilter === "all" ? colors.primary : colors.card, borderColor: colors.border }
              ]}
              onPress={() => setSelectedColonyFilter("all")}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, { color: selectedColonyFilter === "all" ? colors.primaryForeground : colors.mutedForeground }]}>
                All Colonies
              </Text>
            </TouchableOpacity>

            {colonies?.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.pill,
                  { backgroundColor: selectedColonyFilter === c.id.toString() ? colors.primary : colors.card, borderColor: colors.border }
                ]}
                onPress={() => setSelectedColonyFilter(c.id.toString())}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, { color: selectedColonyFilter === c.id.toString() ? colors.primaryForeground : colors.mutedForeground }]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main List */}
        {hostelsLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredHostels && filteredHostels.length > 0 ? (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + webBotPad }} showsVerticalScrollIndicator={false}>
            <View style={styles.listingsGrid}>
              {filteredHostels.map((hostel) => {
                const associatedColony = colonies?.find(c => c.id === hostel.colonyId);
                return (
                  <View key={hostel.id} style={[styles.hostelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.hostelName, { color: colors.foreground }]}>{hostel.name}</Text>
                        <View style={styles.locationRow}>
                          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                          <Text style={[styles.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {hostel.address} {associatedColony && `(${associatedColony.name})`}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.priceBadge, { backgroundColor: colors.primary + "18" }]}>
                        <Text style={[styles.priceText, { color: colors.primary }]}>₹{hostel.price}/mo</Text>
                      </View>
                    </View>

                    <Text style={[styles.descText, { color: colors.foreground }]}>{hostel.description}</Text>

                    <View style={[styles.cardFooter, { borderColor: colors.border }]}>
                      <TouchableOpacity
                        style={styles.contactRow}
                        onPress={() => handleCall(hostel.contactInfo)}
                        activeOpacity={0.7}
                      >
                        <Feather name="phone" size={13} color={colors.primary} />
                        <Text style={[styles.contactText, { color: colors.primary }]}>{hostel.contactInfo}</Text>
                      </TouchableOpacity>

                      <View style={[styles.statusBadge, { backgroundColor: hostel.isAvailable ? "#10B98118" : "#EF444418" }]}>
                        <Text style={[styles.statusText, { color: hostel.isAvailable ? "#10B981" : "#EF4444" }]}>
                          {hostel.isAvailable ? "Available" : "Filled"}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Feather name="home" size={40} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No PG or Hostel rooms found.</Text>
          </View>
        )}

        {/* Post Modal Form */}
        <Modal visible={isModalOpen} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>List Accomodation PG/Room</Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: "85%" }} keyboardShouldPersistTaps="handled">
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Hostel / PG Name *</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={name} onChangeText={setName}
                  placeholder="e.g. Skyline Girls Hostel" placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Monthly Rent (₹) *</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={price} onChangeText={setPrice}
                  placeholder="e.g. 6500" placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Colony Location *</Text>
                <TouchableOpacity
                  style={[styles.pickerTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => setIsColonyPickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: colonyId ? colors.foreground : colors.mutedForeground, fontSize: 15 }}>
                    {selectedColonyName}
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Address *</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={address} onChangeText={setAddress}
                  placeholder="e.g. Plot 12, Phase 2, Skyline Colony" placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Contact Details *</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={contactInfo} onChangeText={setContactInfo}
                  placeholder="e.g. Call Rupesh at +91 9876543210" placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Description & Amenities *</Text>
                <TextInput
                  style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={description} onChangeText={setDescription}
                  placeholder="AC, Food, Wi-Fi included. Deposit rules..." placeholderTextColor={colors.mutedForeground}
                  multiline textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreate}
                  disabled={createHostel.isPending}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                    {createHostel.isPending ? "Posting..." : "Create Listing"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Colony Picker Selector Modal */}
        <Modal visible={isColonyPickerOpen} transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Choose Colony Location</Text>
                <TouchableOpacity onPress={() => setIsColonyPickerOpen(false)}>
                  <Feather name="x" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 250 }}>
                {colonies?.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setColonyId(c.id);
                      setIsColonyPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.foreground }]}>{c.name}</Text>
                    {colonyId === c.id && <Feather name="check" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 10, alignItems: "center" },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 6 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pillContainer: { height: 42, marginBottom: 4 },
  pillScroll: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  listingsGrid: { gap: 14 },
  hostelCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  hostelName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  locationText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  priceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  priceText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  descText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  contactText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  emptyContainer: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, gap: 4 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  pickerTrigger: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12 },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 80 },
  submitBtn: { padding: 16, borderRadius: 14, alignItems: "center", marginTop: 20 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pickerOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  pickerContent: { width: "80%", borderRadius: 16, padding: 16, gap: 12 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EBE8E0", paddingBottom: 8 },
  pickerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
