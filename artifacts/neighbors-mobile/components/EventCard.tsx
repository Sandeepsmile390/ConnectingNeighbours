import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { format, isToday, isTomorrow, isPast } from "date-fns";

interface Event {
  id: number;
  organizerId: number;
  organizer: { name: string };
  title: string;
  description: string;
  location: string;
  startsAt: string;
  rsvpCount: number;
  isRsvpedByMe: boolean;
}

interface EventCardProps {
  event: Event;
  onRsvp: (id: number) => void;
}

export function EventCard({ event, onRsvp }: EventCardProps) {
  const colors = useColors();
  const startDate = new Date(event.startsAt);
  const past = isPast(startDate) && !isToday(startDate);

  let statusLabel = "Upcoming";
  let statusColor = colors.primary;
  if (past) { statusLabel = "Past"; statusColor = colors.mutedForeground; }
  else if (isToday(startDate)) { statusLabel = "Today"; statusColor = "#F97316"; }
  else if (isTomorrow(startDate)) { statusLabel = "Tomorrow"; statusColor = "#3B82F6"; }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: past ? 0.7 : 1 }]}>
      <View style={[styles.dateCol, { backgroundColor: colors.primary + "12" }]}>
        <Text style={[styles.month, { color: colors.primary }]}>{format(startDate, "MMM").toUpperCase()}</Text>
        <Text style={[styles.day, { color: colors.primary }]}>{format(startDate, "d")}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{event.title}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + "18" }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>{event.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="clock" size={11} color={colors.mutedForeground} />
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{format(startDate, "h:mm a")}</Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.rsvpInfo}>
            <Feather name="users" size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{event.rsvpCount} going</Text>
          </View>
          {!past && (
            <TouchableOpacity
              style={[styles.rsvpBtn, {
                backgroundColor: event.isRsvpedByMe ? colors.muted : colors.primary,
                borderColor: event.isRsvpedByMe ? colors.border : colors.primary,
              }]}
              onPress={() => onRsvp(event.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.rsvpBtnText, {
                color: event.isRsvpedByMe ? colors.foreground : colors.primaryForeground,
              }]}>
                {event.isRsvpedByMe ? "Cancel" : "RSVP"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 1,
    marginHorizontal: 16, marginBottom: 10,
    flexDirection: "row", overflow: "hidden",
  },
  dateCol: {
    width: 64, alignItems: "center", justifyContent: "center", padding: 12,
  },
  month: { fontSize: 11, fontFamily: "Inter_700Bold" },
  day: { fontSize: 26, fontFamily: "Inter_700Bold", lineHeight: 30 },
  content: { flex: 1, padding: 12 },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  rsvpInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  rsvpBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  rsvpBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
