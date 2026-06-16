import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useListConversations, 
  useListPendingMembers, 
  useListAlerts,
  getListConversationsQueryKey,
  getListPendingMembersQueryKey,
  getListAlertsQueryKey
} from "@workspace/api-client-react";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="feed">
        <Icon sf={{ default: "bubble.left", selected: "bubble.left.fill" }} />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="market">
        <Icon sf={{ default: "bag", selected: "bag.fill" }} />
        <Label>Market</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="events">
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
        <Label>Events</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }} />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const { user, isAuthenticated } = useAuth();

  // Fetch count states
  const { data: conversations } = useListConversations({
    query: {
      enabled: isAuthenticated && !!user,
      refetchInterval: 5000,
      queryKey: getListConversationsQueryKey()
    }
  });

  const { data: pendingMembers } = useListPendingMembers({
    query: {
      enabled: isAuthenticated && !!user && user.isColonyAdmin === true,
      refetchInterval: 5000,
      queryKey: getListPendingMembersQueryKey()
    }
  });

  const { data: alerts } = useListAlerts({
    query: {
      enabled: isAuthenticated && !!user,
      refetchInterval: 5000,
      queryKey: getListAlertsQueryKey()
    }
  });

  const unreadMessagesCount = conversations?.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0) || 0;
  const pendingRequestsCount = user?.isColonyAdmin ? (pendingMembers?.length || 0) : 0;
  const activeAlertsCount = alerts?.filter((a: any) => !a.isResolved && (a.severity === "emergency" || a.severity === "high")).length || 0;

  const totalUnseen = unreadMessagesCount + pendingRequestsCount + activeAlertsCount;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={24} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="bubble.left" tintColor={color} size={24} /> : <Feather name="message-circle" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: "Market",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="bag" tintColor={color} size={24} /> : <Feather name="shopping-bag" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="calendar" tintColor={color} size={24} /> : <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="ellipsis.circle" tintColor={color} size={24} /> : <Feather name="more-horizontal" size={22} color={color} />,
          tabBarBadge: totalUnseen > 0 ? totalUnseen : undefined,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
