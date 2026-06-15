import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatDistanceToNow } from "date-fns";

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  emergency: { label: "Emergency", color: "#EF4444", icon: "alert-octagon" },
  high: { label: "High", color: "#F97316", icon: "alert-triangle" },
  medium: { label: "Medium", color: "#EAB308", icon: "alert-triangle" },
  low: { label: "Low", color: "#3B82F6", icon: "alert-circle" },
};

interface Alert {
  id: number;
  reporter: { name: string };
  title: string;
  description: string;
  severity: string;
  isResolved: boolean;
  createdAt: string;
}

export function AlertCard({ alert }: { alert: Alert }) {
  const colors = useColors();
  const conf = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: conf.color }]}>
      <View style={[styles.iconCol, { backgroundColor: conf.color + "18" }]}>
        <Feather name={conf.icon} size={20} color={conf.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{alert.title}</Text>
          {alert.isResolved && (
            <View style={[styles.resolvedBadge, { backgroundColor: "#22C55E18" }]}>
              <Text style={[styles.resolvedText, { color: "#22C55E" }]}>Resolved</Text>
            </View>
          )}
        </View>
        <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
          {alert.description}
        </Text>
        <View style={styles.footer}>
          <View style={[styles.severityBadge, { backgroundColor: conf.color + "18" }]}>
            <Text style={[styles.severityText, { color: conf.color }]}>{conf.label}</Text>
          </View>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {alert.reporter.name} · {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 1,
    borderLeftWidth: 4, marginHorizontal: 16, marginBottom: 10,
    flexDirection: "row", overflow: "hidden",
  },
  iconCol: { width: 48, alignItems: "center", justifyContent: "flex-start", padding: 14 },
  content: { flex: 1, padding: 12 },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  resolvedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
  resolvedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 8 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  severityText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
