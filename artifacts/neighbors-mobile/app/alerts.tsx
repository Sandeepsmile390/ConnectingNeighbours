import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Platform, Alert, RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListAlerts, useCreateAlert, useResolveAlert } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCard } from "@/components/AlertCard";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

const SEVERITIES = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "emergency", label: "Emergency" },
];
const SEV_COLORS: Record<string, string> = {
  low: "#3B82F6", medium: "#EAB308", high: "#F97316", emergency: "#EF4444",
};

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { isAuthenticated, login, user } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("low");
  const [refreshing, setRefreshing] = useState(false);

  const { data: alerts = [], isLoading, refetch } = useListAlerts();
  const createMutation = useCreateAlert();
  const resolveMutation = useResolveAlert();

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
      await createMutation.mutateAsync({ data: { title: title.trim(), description: description.trim(), severity: severity as any } });
      await qc.invalidateQueries();
      setShowCreate(false);
      setTitle(""); setDescription(""); setSeverity("low");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      Alert.alert("Error", "Failed to create alert");
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await resolveMutation.mutateAsync({ id });
      await qc.invalidateQueries();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to resolve alert");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={isLoading ? [] : alerts}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => (
          <AlertCard 
            alert={item} 
            currentUserId={user?.id} 
            isColonyAdmin={user?.isColonyAdmin} 
            onResolve={handleResolve} 
          />
        )}
        ListHeaderComponent={
          <View style={[styles.bannerHeader, { backgroundColor: "#EF444412", borderBottomColor: "#EF444430" }]}>
            <View style={styles.bannerLeft}>
              <Feather name="shield" size={20} color="#EF4444" />
              <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Safety Alerts</Text>
            </View>
            {isAuthenticated ? (
              <TouchableOpacity
                style={[styles.reportBtn, { backgroundColor: "#EF4444" }]}
                onPress={() => setShowCreate(true)}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color="#fff" />
                <Text style={styles.reportBtnText}>Report</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.reportBtn, { backgroundColor: "#EF4444" }]} onPress={login} activeOpacity={0.8}>
                <Text style={styles.reportBtnText}>Sign in</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 24, gap: 10 }}>
              {[...Array(3)].map((_, i) => <View key={i} style={[styles.skeleton, { backgroundColor: colors.muted }]} />)}
            </View>
          ) : (
            <EmptyState
              icon="shield"
              title="No active alerts"
              description="Your neighborhood is safe. Report incidents to keep neighbors informed."
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 40 + webBotPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EF4444" />}
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Report Issue</Text>
              <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.8}>
                <Text style={[styles.postBtn, { color: "#EF4444" }]}>
                  {createMutation.isPending ? "Reporting..." : "Report"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Severity</Text>
              <View style={styles.sevGrid}>
                {SEVERITIES.map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.sevBtn, {
                      backgroundColor: severity === s.key ? SEV_COLORS[s.key] : SEV_COLORS[s.key] + "18",
                    }]}
                    onPress={() => setSeverity(s.key)}
                  >
                    <Text style={[styles.sevBtnText, { color: severity === s.key ? "#fff" : SEV_COLORS[s.key] }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Title *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={title} onChangeText={setTitle}
                placeholder="Brief summary of the issue" placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Description *</Text>
              <TextInput
                style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={description} onChangeText={setDescription}
                placeholder="Provide details about the incident..." placeholderTextColor={colors.mutedForeground}
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
    padding: 16, borderBottomWidth: 1, marginBottom: 8,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  bannerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  reportBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4 },
  reportBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  skeleton: { height: 80, borderRadius: 14, marginHorizontal: 16, marginBottom: 10 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  postBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 16 },
  sevGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sevBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sevBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 100 },
});
