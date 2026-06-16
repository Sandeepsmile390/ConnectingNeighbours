import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Modal, Image
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListColonies,
  useCreateColony,
  useJoinColony,
  useListPendingMembers,
  useVerifyColonyMember,
  getListColoniesQueryKey,
  getListPendingMembersQueryKey,
  useUpdateColony,
  useListPosts,
  getListPostsQueryKey,
  useListListings,
  getListListingsQueryKey,
  useListEvents,
  getListEventsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const FALLBACK_EVENT_IMAGES = [
  { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80", title: "Community Block Party", desc: "Meet your neighbors and enjoy food and games!", location: "Community Center", date: "" },
  { url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80", title: "Yoga in the Park", desc: "Weekly outdoor wellness session for all levels.", location: "Central Park Lawn", date: "" },
  { url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80", title: "HOA & Neighborhood Meeting", desc: "Discussing local safety, projects, and plans.", location: "Club House Hall", date: "" },
  { url: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80", title: "Neighborhood Safety Watch", desc: "Coordinating safety patrols and alert channels.", location: "Locality Patrol office", date: "" }
];

const FALLBACK_GALLERY = [
  { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", title: "Modern Locality Townhomes", type: "Locality", author: "Neighborhood View" },
  { url: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=600&q=80", title: "Community Garden & Blossoms", type: "Social Space", author: "Green Committee" },
  { url: "https://images.unsplash.com/photo-1576016770956-debb63d90029?auto=format&fit=crop&w=600&q=80", title: "Children's Playground Park", type: "Recreation", author: "Family Watch" },
  { url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80", title: "Cozy Library & Club Room", type: "Amenities", author: "Club House" }
];

export default function ColoniesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Edit / Form States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Create Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  const { data: colonies, isLoading: coloniesLoading } = useListColonies();
  
  // Only query pending members if the user is a colony admin
  const { data: pendingMembers } = useListPendingMembers({
    query: {
      enabled: !!(user?.isColonyAdmin && user?.colonyId),
      queryKey: getListPendingMembersQueryKey(),
    }
  });

  // Queries for Gallery and Carousel
  const { data: posts } = useListPosts(undefined, { query: { enabled: !!user?.colonyId, queryKey: getListPostsQueryKey() } });
  const { data: listings } = useListListings(undefined, { query: { enabled: !!user?.colonyId, queryKey: getListListingsQueryKey() } });
  const { data: events } = useListEvents({ query: { enabled: !!user?.colonyId, queryKey: getListEventsQueryKey() } });

  const createColony = useCreateColony();
  const joinColony = useJoinColony();
  const verifyMember = useVerifyColonyMember();
  const updateColony = useUpdateColony();

  // Find user's active colony details
  const myColony = colonies?.find(c => c.id === user?.colonyId);
  const filteredColonies = colonies?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prefill edit form
  useEffect(() => {
    if (myColony) {
      setEditName(myColony.name);
      setEditAddress(myColony.address);
      setEditDesc(myColony.description);
    }
  }, [myColony]);

  // Construct Event carousel items: priority to user-created events with images, then fallbacks
  const customEventsWithImages = events?.filter(e => e.imageUrl) || [];
  const carouselItems = customEventsWithImages.length > 0 
    ? customEventsWithImages.map(e => ({
        url: e.imageUrl!,
        title: e.title,
        desc: e.description,
        location: e.location,
        date: e.startsAt
      }))
    : (events || []).map((e, index) => ({
        url: FALLBACK_EVENT_IMAGES[index % FALLBACK_EVENT_IMAGES.length].url,
        title: e.title,
        desc: e.description,
        location: e.location,
        date: e.startsAt
      }));

  const finalCarouselItems = carouselItems.length > 0 ? carouselItems : FALLBACK_EVENT_IMAGES;

  // Construct Gallery items: collect posts and listings images
  const galleryItems: { url: string; title: string; type: string; author: string }[] = [];
  
  posts?.forEach(p => {
    if (p.imageUrl) {
      galleryItems.push({
        url: p.imageUrl,
        title: p.title || "Shared Post",
        type: "Post",
        author: p.author.name
      });
    }
  });

  listings?.forEach(l => {
    if (l.imageUrl) {
      galleryItems.push({
        url: l.imageUrl,
        title: l.title,
        type: "Marketplace",
        author: l.seller.name
      });
    }
  });

  events?.forEach(e => {
    if (e.imageUrl) {
      galleryItems.push({
        url: e.imageUrl,
        title: e.title,
        type: "Event",
        author: e.organizer.name
      });
    }
  });

  const finalGalleryItems = galleryItems.length > 0 ? [...galleryItems, ...FALLBACK_GALLERY] : FALLBACK_GALLERY;

  // Carousel Auto-rotation effect
  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    if (finalCarouselItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % finalCarouselItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [finalCarouselItems.length]);

  const [lightboxImg, setLightboxImg] = useState<any | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim() || !address.trim()) {
      Alert.alert("Missing Fields", "Please fill in all colony fields");
      return;
    }

    try {
      await createColony.mutateAsync({
        data: {
          name: name.trim(),
          description: description.trim(),
          address: address.trim()
        }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Colony Created! You are the administrator.");
      setName("");
      setDescription("");
      setAddress("");
      setIsRegistering(false);
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: getListColoniesQueryKey() });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create colony");
    }
  };

  const handleJoin = (colId: number) => {
    Alert.alert(
      colId === 0 ? "Leave Colony" : "Join Colony",
      colId === 0 ? "Are you sure you want to leave your current colony?" : "Do you want to send a join request to this colony?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await joinColony.mutateAsync({
                data: { colonyId: colId }
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Request Sent",
                colId === 0 ? "You left the colony." : "Requested successfully. An administrator must verify your account."
              );
              await refetchUser();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to submit request");
            }
          }
        }
      ]
    );
  };

  const handleVerify = async (memberId: number) => {
    try {
      await verifyMember.mutateAsync({
        data: { memberId }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Neighbor verified successfully!");
      queryClient.invalidateQueries({ queryKey: getListPendingMembersQueryKey() });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to verify member");
    }
  };

  const handleEditSubmit = async () => {
    if (!user?.colonyId) return;
    if (!editName.trim() || !editAddress.trim() || !editDesc.trim()) {
      Alert.alert("Missing Fields", "Please fill in all colony fields");
      return;
    }
    try {
      await updateColony.mutateAsync({
        id: user.colonyId,
        data: {
          name: editName.trim(),
          address: editAddress.trim(),
          description: editDesc.trim(),
        }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Colony updated successfully!");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: getListColoniesQueryKey() });
      await refetchUser();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update colony");
    }
  };

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="shield" size={40} color={colors.mutedForeground} />
        <Text style={[styles.noAuthText, { color: colors.mutedForeground }]}>Sign in to view Colony Hub</Text>
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
        {user.colonyId && myColony ? (
          <View style={styles.colonyContainer}>
            {/* Active Colony Card */}
            <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.badgeRow}>
                <View style={[styles.tabBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.tabBadgeText, { color: colors.primary }]}>ACTIVE COLONY</Text>
                </View>
                {user.isVerified ? (
                  <View style={[styles.statusBadge, { backgroundColor: "#10B98120" }]}>
                    <Feather name="check" size={12} color="#10B981" />
                    <Text style={[styles.statusText, { color: "#10B981" }]}>Verified Resident</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: "#F59E0B20" }]}>
                    <Feather name="alert-circle" size={12} color="#F59E0B" />
                    <Text style={[styles.statusText, { color: "#F59E0B" }]}>Pending Verification</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.colonyTitle, { color: colors.foreground }]}>{myColony.name}</Text>
              
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{myColony.address}</Text>
              </View>

              <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground, marginTop: 12 }]}>About the Colony</Text>
              <Text style={[styles.description, { color: colors.foreground }]}>{myColony.description}</Text>

              {!user.isVerified && (
                <View style={[styles.alertNotice, { backgroundColor: "#F59E0B10", borderColor: "#F59E0B30" }]}>
                  <Feather name="alert-triangle" size={16} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>Verification Required</Text>
                    <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
                      An admin of this colony needs to confirm your details. Once approved, you will get a checkmark badge.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Locality Event Highlights Carousel */}
            <View style={styles.carouselContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="camera" size={18} color={colors.primary} />
                <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Event Highlights</Text>
              </View>

              <View style={[styles.carouselCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {/* Carousel Image */}
                <Image source={{ uri: finalCarouselItems[activeSlide]?.url }} style={styles.carouselImg} />
                <View style={styles.carouselOverlay} />
                
                {/* Carousel Content details */}
                <View style={styles.carouselDetails}>
                  <View style={[styles.carouselBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.carouselBadgeText}>LOCALITY EVENT</Text>
                  </View>
                  <Text style={styles.carouselTitle}>{finalCarouselItems[activeSlide]?.title}</Text>
                  <Text style={styles.carouselDesc} numberOfLines={2}>{finalCarouselItems[activeSlide]?.desc}</Text>
                  
                  {finalCarouselItems[activeSlide]?.location ? (
                    <View style={styles.carouselMeta}>
                      <Feather name="map-pin" size={10} color="#FFFFFFB0" />
                      <Text style={styles.carouselMetaText}>{finalCarouselItems[activeSlide]?.location}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Left/Right manual arrows overlay */}
                {finalCarouselItems.length > 1 && (
                  <View style={styles.carouselControls}>
                    <TouchableOpacity
                      onPress={() => setActiveSlide(prev => (prev - 1 + finalCarouselItems.length) % finalCarouselItems.length)}
                      style={styles.carouselArrow}
                      activeOpacity={0.7}
                    >
                      <Feather name="chevron-left" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setActiveSlide(prev => (prev + 1) % finalCarouselItems.length)}
                      style={styles.carouselArrow}
                      activeOpacity={0.7}
                    >
                      <Feather name="chevron-right" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Slide indicator dots */}
                {finalCarouselItems.length > 1 && (
                  <View style={styles.carouselIndicators}>
                    {finalCarouselItems.map((_, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setActiveSlide(idx)}
                        style={[
                          styles.carouselDot,
                          idx === activeSlide ? { backgroundColor: colors.primary, width: 12 } : { backgroundColor: "#FFFFFF50" }
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Photo Gallery Grid */}
            <View style={styles.galleryContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="image" size={18} color={colors.primary} />
                <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Colony Gallery</Text>
              </View>
              
              <View style={[styles.galleryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.galleryGrid}>
                  {finalGalleryItems.slice(0, 6).map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setLightboxImg(item)}
                      style={[styles.galleryItem, { borderColor: colors.border }]}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: item.url }} style={styles.galleryImg} />
                      <View style={styles.galleryTypeBadge}>
                        <Text style={styles.galleryTypeText}>{item.type}</Text>
                      </View>
                      <View style={styles.galleryOverlay}>
                        <Text style={styles.galleryOverlayTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.galleryOverlayAuthor} numberOfLines={1}>By {item.author}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Admin Dashboard */}
            {user.isColonyAdmin && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.adminHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Feather name="users" size={18} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Admin Dashboard</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.primary + "12" }]}
                    onPress={() => setIsEditOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={14} color={colors.primary} />
                    <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit Colony</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>Approve residency requests from neighbors.</Text>

                {pendingMembers && pendingMembers.length > 0 ? (
                  <View style={styles.pendingList}>
                    {pendingMembers.map((member) => (
                      <View key={member.id} style={[styles.memberItem, { borderColor: colors.border }]}>
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
                          <Text style={[styles.memberMeta, { color: colors.mutedForeground }]}>
                            @{member.username} {member.apartment && `• Flat ${member.apartment}`}
                          </Text>
                          {member.phone && <Text style={[styles.memberPhone, { color: colors.mutedForeground }]}>Phone: {member.phone}</Text>}
                        </View>
                        <TouchableOpacity
                          style={[styles.approveBtn, { backgroundColor: "#10B981" }]}
                          onPress={() => handleVerify(member.id)}
                          activeOpacity={0.85}
                        >
                          <Feather name="check" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Feather name="smile" size={24} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>All verified! No pending requests.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Leave / Switch buttons */}
            <TouchableOpacity
              style={[styles.leaveButton, { borderColor: colors.destructive }]}
              onPress={() => handleJoin(0)}
              activeOpacity={0.8}
            >
              <Text style={[styles.leaveText, { color: colors.destructive }]}>Leave Colony / Switch Colony</Text>
              <Feather name="arrow-right" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.unassociatedContainer}>
            {/* Search/Join or Register Options */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleTab, !isRegistering ? { borderBottomColor: colors.primary, borderBottomWidth: 2 } : {}]}
                onPress={() => setIsRegistering(false)}
              >
                <Text style={[styles.toggleText, { color: !isRegistering ? colors.primary : colors.mutedForeground }]}>Find & Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleTab, isRegistering ? { borderBottomColor: colors.primary, borderBottomWidth: 2 } : {}]}
                onPress={() => setIsRegistering(true)}
              >
                <Text style={[styles.toggleText, { color: isRegistering ? colors.primary : colors.mutedForeground }]}>Register Colony</Text>
              </TouchableOpacity>
            </View>

            {!isRegistering ? (
              <View style={styles.findSection}>
                <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Feather name="search" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Search by colony name or address..."
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                {coloniesLoading ? (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
                ) : filteredColonies && filteredColonies.length > 0 ? (
                  <View style={styles.colonyList}>
                    {filteredColonies.map((colony) => (
                      <View key={colony.id} style={[styles.colonyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.itemName, { color: colors.foreground }]}>{colony.name}</Text>
                          <Text style={[styles.itemAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {colony.address}
                          </Text>
                          <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {colony.description}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                          onPress={() => handleJoin(colony.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.joinBtnText, { color: colors.primaryForeground }]}>Join</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Feather name="map" size={30} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No matching colonies found.</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Register New Colony</Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground, marginBottom: 16 }]}>
                  Become the administrator of a new colony directory.
                </Text>

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Colony Name</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={name} onChangeText={setName}
                  placeholder="e.g. Skyline Residency" placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Address / Sector</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={address} onChangeText={setAddress}
                  placeholder="e.g. Sector 5, Dwarka" placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
                <TextInput
                  style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={description} onChangeText={setDescription}
                  placeholder="Society details, number of blocks..." placeholderTextColor={colors.mutedForeground}
                  multiline textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreate}
                  disabled={createColony.isPending}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                    {createColony.isPending ? "Registering..." : "Create & Manage"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Gallery Lightbox Modal */}
      <Modal
        visible={!!lightboxImg}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLightboxImg(null)}
      >
        <View style={styles.lightboxOverlay}>
          <Image source={{ uri: lightboxImg?.url }} style={styles.lightboxImg} />
          
          <TouchableOpacity
            style={[styles.lightboxCloseBtn, { top: insets.top + 10 }]}
            onPress={() => setLightboxImg(null)}
            activeOpacity={0.7}
          >
            <Feather name="x" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.lightboxDetails}>
            <View style={styles.lightboxDetailsRow}>
              <View>
                <Text style={styles.lightboxTitle}>{lightboxImg?.title}</Text>
                <Text style={styles.lightboxAuthor}>Shared by {lightboxImg?.author}</Text>
              </View>
              <View style={[styles.lightboxBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.lightboxBadgeText}>{lightboxImg?.type}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Colony Information Modal */}
      <Modal
        visible={isEditOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditOpen(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={[styles.editModalContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? insets.top : 0 }]}>
            <View style={[styles.editModalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setIsEditOpen(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.editModalTitle, { color: colors.foreground }]}>Edit Colony Info</Text>
              <TouchableOpacity onPress={handleEditSubmit} disabled={updateColony.isPending} activeOpacity={0.8}>
                <Text style={[styles.editModalSaveBtn, { color: colors.primary }]}>
                  {updateColony.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editModalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Colony Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Colony Name"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Address / Sector *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Sector address"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Description *</Text>
              <TextInput
                style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Society description..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAuthText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  colonyContainer: { gap: 16 },
  activeCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 8 },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  tabBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tabBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  colonyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionSubtitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 4 },
  alertNotice: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 16 },
  alertTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#B45309" },
  alertText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 2 },
  
  // Carousel Highlights Styles
  carouselContainer: { marginVertical: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionHeading: { fontSize: 17, fontFamily: "Inter_700Bold" },
  carouselCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden", height: 210, position: "relative" },
  carouselImg: { width: "100%", height: "100%" },
  carouselOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  carouselDetails: { position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 10, gap: 4 },
  carouselBadge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 2 },
  carouselBadgeText: { color: "#FFF", fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  carouselTitle: { color: "#FFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  carouselDesc: { color: "#FFFDF0D0", fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  carouselMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  carouselMetaText: { color: "#FFFDF099", fontSize: 10, fontFamily: "Inter_500Medium" },
  carouselControls: { ...StyleSheet.absoluteFillObject, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8 },
  carouselArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  carouselIndicators: { position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 4, zIndex: 10, backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  carouselDot: { width: 6, height: 6, borderRadius: 3 },

  // Gallery Styles
  galleryContainer: { marginVertical: 8 },
  galleryCard: { borderWidth: 1, borderRadius: 16, padding: 12 },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  galleryItem: { width: "48%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", position: "relative", borderWidth: 1 },
  galleryImg: { width: "100%", height: "100%" },
  galleryTypeBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 10 },
  galleryTypeText: { color: "#FFF", fontSize: 8, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  galleryOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)", padding: 8 },
  galleryOverlayTitle: { color: "#FFF", fontSize: 10, fontFamily: "Inter_700Bold" },
  galleryOverlayAuthor: { color: "#FFFFFFB0", fontSize: 8, fontFamily: "Inter_400Regular", marginTop: 1 },

  // Lightbox overlay styles
  lightboxOverlay: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  lightboxImg: { width: "100%", height: "70%", resizeMode: "contain" },
  lightboxCloseBtn: { position: "absolute", right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  lightboxDetails: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.85)", padding: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  lightboxDetailsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lightboxTitle: { color: "#FFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  lightboxAuthor: { color: "#FFFFFFB0", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  lightboxBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  lightboxBadgeText: { color: "#FFF", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },

  // General Card Styles
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 8 },
  adminHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2, gap: 10 },
  editButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  editButtonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  pendingList: { gap: 10, marginTop: 10 },
  memberItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, paddingBottom: 10 },
  memberInfo: { flex: 1, marginRight: 8 },
  memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  memberPhone: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  approveBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  approveBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  leaveButton: { borderWidth: 1, padding: 14, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginVertical: 12 },
  leaveText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  unassociatedContainer: { gap: 16 },
  toggleRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EBE8E0", marginBottom: 8 },
  toggleTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  toggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  findSection: { gap: 14 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  colonyList: { gap: 10 },
  colonyItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 14 },
  itemName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  itemAddress: { fontSize: 12, fontFamily: "Inter_400Regular" },
  itemDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  joinBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyContainer: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 90 },
  submitBtn: { padding: 16, borderRadius: 14, alignItems: "center", marginTop: 16 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },

  // Edit Colony Modal styles
  editModalContainer: { flex: 1 },
  editModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  editModalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  editModalSaveBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  editModalBody: { padding: 16 },
});
