import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  Platform, RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListUsers } from "@workspace/api-client-react";
import { MemberCard } from "@/components/MemberCard";
import { EmptyState } from "@/components/EmptyState";

export default function MembersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: users = [], isLoading, refetch } = useListUsers();

  const webBotPad = Platform.OS === "web" ? 34 : 0;

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.apartment ?? "").toLowerCase().includes(q) ||
        (u.bio ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      data={isLoading ? [] : filtered}
      keyExtractor={(u) => String(u.id)}
      numColumns={2}
      columnWrapperStyle={{ gap: 10, paddingHorizontal: 16, marginBottom: 10 }}
      renderItem={({ item }) => <MemberCard user={item} />}
      ListHeaderComponent={
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search neighbors..."
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="search"
            />
            {!!query && (
              <Feather name="x" size={16} color={colors.mutedForeground} onPress={() => setQuery("")} />
            )}
          </View>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered.length} {filtered.length === 1 ? "member" : "members"}
          </Text>
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
            icon="users"
            title="No members found"
            description="Try a different search or be the first to join!"
          />
        )
      }
      contentContainerStyle={{ paddingBottom: 40 + webBotPad, paddingTop: 8 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  count: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 8, textAlign: "right" },
  skeletonCard: { height: 160, borderRadius: 14, flex: 1 },
});
