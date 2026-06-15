import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Modal
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitFeedback } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function FeedbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const submitFeedback = useSubmitFeedback();

  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<"bug" | "suggestion" | "complaint" | "other">("suggestion");
  const [comment, setComment] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert("Missing Comment", "Please write a comment before submitting.");
      return;
    }

    try {
      await submitFeedback.mutateAsync({
        data: {
          category,
          rating,
          comment: comment.trim()
        }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Feedback Submitted", "Thank you for helping us improve our neighborhood portal!");
      setComment("");
      setRating(5);
      setCategory("suggestion");
    } catch {
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    }
  };

  const categoryLabels = {
    suggestion: "Idea or Suggestion",
    bug: "Report a Bug",
    complaint: "Complaint",
    other: "Other"
  };

  const ratingLabel = () => {
    if (rating === 5) return "Excellent!";
    if (rating === 4) return "Good";
    if (rating === 3) return "Average";
    if (rating === 2) return "Below Average";
    return "Poor";
  };

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="heart" size={40} color={colors.mutedForeground} />
        <Text style={[styles.noAuthText, { color: colors.mutedForeground }]}>Sign in to submit feedback</Text>
      </View>
    );
  }

  const webBotPad = Platform.OS === "web" ? 34 : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + webBotPad }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Feather name="heart" size={32} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>App Feedback</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Share your thoughts, suggestions, or report bugs to help us build a better community experience.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Share Your Experience</Text>

          {/* Category Selector */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>What is this feedback about?</Text>
          <TouchableOpacity
            style={[styles.pickerTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setIsPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={{ color: colors.foreground, fontSize: 15 }}>
              {categoryLabels[category]}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Rating */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>How would you rate your experience?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  setRating(star);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
                style={styles.starTouch}
              >
                <Feather
                  name="star"
                  size={28}
                  color={star <= rating ? "#F59E0B" : colors.muted}
                  style={star <= rating ? styles.filledStar : {}}
                />
              </TouchableOpacity>
            ))}
            <Text style={[styles.ratingLabelText, { color: colors.mutedForeground }]}>
              {ratingLabel()}
            </Text>
          </View>

          {/* Comments */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>Your Comments *</Text>
          <TextInput
            style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={comment}
            onChangeText={setComment}
            placeholder="What did you like? What can we make better?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            editable={!submitFeedback.isPending}
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={submitFeedback.isPending}
            activeOpacity={0.85}
          >
            {submitFeedback.isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Picker Overlay */}
        <Modal visible={isPickerOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Category</Text>
                <TouchableOpacity onPress={() => setIsPickerOpen(false)}>
                  <Feather name="x" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setCategory(key);
                      setIsPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.foreground }]}>{categoryLabels[key]}</Text>
                    {category === key && <Feather name="check" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAuthText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  header: { alignItems: "center", paddingVertical: 16, gap: 6, textAlign: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, paddingHorizontal: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginHorizontal: 4 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  pickerTrigger: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  starTouch: { padding: 4 },
  filledStar: {
    // Fill the icon on mobile: Feather in Expo can be filled by using specific styling or fill props, but on native we can just color it
    textShadowColor: "rgba(245, 158, 11, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ratingLabelText: { fontSize: 13, fontFamily: "Inter_500Medium", marginLeft: 8 },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 120 },
  submitBtn: { padding: 16, borderRadius: 14, alignItems: "center", marginTop: 20 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "80%", borderRadius: 16, padding: 16, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EBE8E0", paddingBottom: 8 },
  modalTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
