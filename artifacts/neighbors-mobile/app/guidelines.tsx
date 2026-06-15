import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

interface GuidelineSection {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bgColor: string;
  desc: string;
  bullets: string[];
}

export default function GuidelinesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const sections: GuidelineSection[] = [
    {
      title: "Colony Verification & Badges",
      icon: "shield",
      color: "#6366F1",
      bgColor: "#6366F112",
      desc: "How we maintain safety and authenticity in the portal.",
      bullets: [
        "Every member must choose and request to join their specific colony/neighborhood.",
        "Your account starts as 'Pending' upon joining a colony.",
        "A designated Colony Admin will review and verify your membership based on apartment details or physical residency.",
        "Once verified, you will receive a verified badge (check icon) next to your profile, unlocking community-wide posting and sharing permissions."
      ]
    },
    {
      title: "Community Standards",
      icon: "clipboard",
      color: "#8B5CF6",
      bgColor: "#8B5CF612",
      desc: "Rules for a friendly, neighborly environment.",
      bullets: [
        "Be kind and respectful. Harassment, hate speech, or abuse will lead to immediate ban.",
        "Keep posts relevant to the local colony or immediate surrounding neighborhood.",
        "Strictly no spamming, commercial marketing campaigns, or unauthorized advertisements.",
        "Resolve personal conflicts privately through Direct Messaging rather than public feed arguments."
      ]
    },
    {
      title: "Marketplace & Resource Sharing",
      icon: "users",
      color: "#14B8A6",
      bgColor: "#14B8A612",
      desc: "Best practices for local trading and lending.",
      bullets: [
        "List items honestly with accurate descriptions and pricing (or mark as Free).",
        "Borrow shared tools and resources responsibly. Return them on time and in the same condition.",
        "Arrange handovers and transactions in public, safe, or well-lit spaces within the colony.",
        "Commercial selling or bulk resale of wholesale items is prohibited."
      ]
    }
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + webBotPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Feather name="book-open" size={32} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>Community Guidelines</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Welcome to Connecting Neighbors. Please read our guidelines to help maintain a supportive, collaborative, and safe neighborhood environment.
        </Text>
      </View>

      {/* Notice Banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
        <Feather name="alert-circle" size={18} color={colors.primary} style={styles.bannerIcon} />
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Important Notice on Trust</Text>
          <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>
            We require physical verification of residents to protect against outsiders. Make sure you select the correct colony on your profile page to request verification from your local colony administrator.
          </Text>
        </View>
      </View>

      {/* Guidelines Sections */}
      {sections.map((section, idx) => (
        <View key={idx} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: section.bgColor }]}>
              <Feather name={section.icon} size={20} color={section.color} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{section.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{section.desc}</Text>
            </View>
          </View>
          <View style={styles.bulletsContainer}>
            {section.bullets.map((bullet, bulletIdx) => (
              <View key={bulletIdx} style={styles.bulletRow}>
                <Text style={[styles.bulletPoint, { color: colors.primary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.mutedForeground }]}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Terms Summary Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.termsTitle, { color: colors.foreground }]}>Terms of Use Summary</Text>
        <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
          By using this application, you agree to submit true and accurate information regarding your name, apartment address, and colony association. Misrepresenting your identity or address is a violation of community guidelines and will result in revocation of access.
        </Text>
        <Text style={[styles.termsText, { color: colors.mutedForeground, marginTop: 8 }]}>
          Connecting Neighbors acts as a neutral communication portal and is not liable for transactions, items traded in the marketplace, or resources shared between individual users. Neighbors are encouraged to exercise safe and honest judgement when meeting in person.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  header: { alignItems: "center", paddingVertical: 12, gap: 6, textAlign: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, paddingHorizontal: 10 },
  banner: { flexDirection: "row", padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  bannerIcon: { marginTop: 2 },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bannerText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  bulletsContainer: { marginTop: 14, gap: 8, paddingLeft: 4 },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bulletPoint: { fontSize: 14, lineHeight: 18 },
  bulletText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  termsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  termsText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
