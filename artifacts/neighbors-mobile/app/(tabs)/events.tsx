import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Platform, Alert, RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListEvents, useCreateEvent, useRsvpEvent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { isAuthenticated, login } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: events = [], isLoading, refetch } = useListEvents();
  const createMutation = useCreateEvent();
  const rsvpMutation = useRsvpEvent();

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim() || !location.trim() || !startsAt.trim()) {
      Alert.alert("Missing fields", "Please fill in all required fields");
      return;
    }
    try {
      const dt = new Date(startsAt);
      if (isNaN(dt.getTime())) { Alert.alert("Invalid date", "Please enter a valid date"); return; }
      await createMutation.mutateAsync({ data: { title: title.trim(), description: description.trim(), location: location.trim(), startsAt: dt.toISOString() } });
      await qc.invalidateQueries();
      setShowCreate(false);
      setTitle(""); setDescription(""); setLocation(""); setStartsAt("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to create event");
    }
  };

  const handleRsvp = async (id: number) => {
    if (!isAuthenticated) { login(); return; }
    try {
      await rsvpMutation.mutateAsync({ id });
      await qc.invalidateQueries();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={isLoading ? [] : events}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => <EventCard event={item} onRsvp={handleRsvp} />}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + webTopPad + 12 }}>
            <View style={styles.topBar}>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>Events</Text>
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
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 24, gap: 10 }}>
              {[...Array(3)].map((_, i) => <View key={i} style={[styles.skeleton, { backgroundColor: colors.muted }]} />)}
            </View>
          ) : (
            <EmptyState
              icon="calendar"
              title="No events yet"
              description="Host an event to bring the community together."
              actionLabel={isAuthenticated ? "Create Event" : undefined}
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Event</Text>
              <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.8}>
                <Text style={[styles.postBtn, { color: colors.primary }]}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {[
                { label: "Title *", value: title, set: setTitle, placeholder: "Event name" },
                { label: "Location *", value: location, set: setLocation, placeholder: "Where is it?" },
                { label: "Date & Time * (e.g. 2024-06-15 18:00)", value: startsAt, set: setStartsAt, placeholder: "YYYY-MM-DD HH:MM" },
              ].map((f) => (
                <View key={f.label}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    value={f.value}
                    onChangeText={f.set}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              ))}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Description *</Text>
              <TextInput
                style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell people about this event..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
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
  skeleton: { height: 96, borderRadius: 14, marginHorizontal: 16, marginBottom: 10 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  postBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 100 },
});
