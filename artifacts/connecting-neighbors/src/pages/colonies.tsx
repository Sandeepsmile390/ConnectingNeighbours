import { useState, useEffect } from "react";
import { 
  useListColonies, 
  useCreateColony, 
  useJoinColony, 
  useListPendingMembers, 
  useVerifyColonyMember,
  getListColoniesQueryKey,
  getListPendingMembersQueryKey,
  useGetMe,
  getGetMeQueryKey,
  useUpdateColony,
  useListPosts,
  useListListings,
  useListEvents,
  getListPostsQueryKey,
  getListListingsQueryKey,
  getListEventsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Milestone, Plus, Search, Check, ShieldAlert, ArrowRight, UserCheck, Users, MapPin, Edit2, ChevronLeft, ChevronRight, X, Camera, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Colonies() {
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  // Edit colony form states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Media and Slideshow states
  const [activeSlide, setActiveSlide] = useState(0);
  const [lightboxImg, setLightboxImg] = useState<{ url: string; title: string; author?: string; type?: string } | null>(null);

  const { data: colonies, isLoading: coloniesLoading } = useListColonies();
  
  // Only query pending members if the user is a colony admin
  const { data: pendingMembers } = useListPendingMembers({
    query: {
      enabled: !!(user?.isColonyAdmin && user?.colonyId),
      queryKey: getListPendingMembersQueryKey(),
    }
  });

  const createColony = useCreateColony();
  const joinColony = useJoinColony();
  const verifyMember = useVerifyColonyMember();
  const updateColony = useUpdateColony();

  // Queries for Gallery and Carousel
  const { data: posts } = useListPosts(undefined, { query: { enabled: !!user?.colonyId, queryKey: getListPostsQueryKey() } });
  const { data: listings } = useListListings(undefined, { query: { enabled: !!user?.colonyId, queryKey: getListListingsQueryKey() } });
  const { data: events } = useListEvents({ query: { enabled: !!user?.colonyId, queryKey: getListEventsQueryKey() } });

  // Find user's active colony details
  const myColony = colonies?.find(c => c.id === user?.colonyId);

  // Prefill edit form
  useEffect(() => {
    if (myColony) {
      setEditName(myColony.name);
      setEditAddress(myColony.address);
      setEditDesc(myColony.description);
    }
  }, [myColony, isEditOpen]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.colonyId) return;
    if (!editName.trim() || !editAddress.trim() || !editDesc.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    updateColony.mutate({
      id: user.colonyId,
      data: {
        name: editName.trim(),
        address: editAddress.trim(),
        description: editDesc.trim(),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Colony updated successfully" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: getListColoniesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update colony", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !address.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    createColony.mutate({
      data: {
        name: name.trim(),
        description: description.trim(),
        address: address.trim()
      }
    }, {
      onSuccess: () => {
        toast({ title: "Colony Created", description: "You are now the administrator of this colony." });
        setIsCreateOpen(false);
        setName("");
        setDescription("");
        setAddress("");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListColoniesQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create colony", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleJoin = (colId: number) => {
    joinColony.mutate({
      data: { colonyId: colId }
    }, {
      onSuccess: () => {
        toast({ title: "Requested to join", description: "Colony joined. Your profile is pending admin verification." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to join colony", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleVerify = (memberId: number) => {
    verifyMember.mutate({
      data: { memberId }
    }, {
      onSuccess: () => {
        toast({ title: "Member Verified", description: "The neighbor has been approved and granted a verified badge." });
        queryClient.invalidateQueries({ queryKey: getListPendingMembersQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Verification failed", description: err.message, variant: "destructive" });
      }
    });
  };
  // Curated fallback stock images for events
  const FALLBACK_EVENT_IMAGES = [
    { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80", title: "Community Block Party", desc: "Meet your neighbors and enjoy food and games!", location: "Community Center", date: "" },
    { url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80", title: "Yoga in the Park", desc: "Weekly outdoor wellness session for all levels.", location: "Central Park Lawn", date: "" },
    { url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80", title: "HOA & Neighborhood Meeting", desc: "Discussing local safety, projects, and plans.", location: "Club House Hall", date: "" },
    { url: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80", title: "Neighborhood Safety Watch", desc: "Coordinating safety patrols and alert channels.", location: "Locality Patrol office", date: "" }
  ];

  // Curated fallback stock images for neighborhood gallery
  const FALLBACK_GALLERY = [
    { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", title: "Modern Locality Townhomes", type: "Locality", author: "Neighborhood View" },
    { url: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=600&q=80", title: "Community Garden & Blossoms", type: "Social Space", author: "Green Committee" },
    { url: "https://images.unsplash.com/photo-1576016770956-debb63d90029?auto=format&fit=crop&w=600&q=80", title: "Children's Playground Park", type: "Recreation", author: "Family Watch" },
    { url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80", title: "Cozy Library & Club Room", type: "Amenities", author: "Club House" }
  ];

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

  // If there are absolutely no events at all, show fallback slides
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

  // Blend custom images with high-quality stock fallbacks
  const finalGalleryItems = galleryItems.length > 0 ? [...galleryItems, ...FALLBACK_GALLERY] : FALLBACK_GALLERY;

  // Carousel Auto-rotation effect
  useEffect(() => {
    if (finalCarouselItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % finalCarouselItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [finalCarouselItems.length]);
  const filteredColonies = colonies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Milestone className="h-8 w-8 text-primary" />
          Colony Hub
        </h1>
        <p className="text-muted-foreground mt-1">Select your colony, invite neighbors, and manage verified residency badges.</p>
      </div>

      {/* Profile Colony Status Details */}
      {user?.colonyId && myColony ? (
        <div className="space-y-6">
          <Card className="border-primary/10 overflow-hidden shadow-sm relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs uppercase tracking-wider text-primary border-primary/20 bg-primary/5">
                    Your Active Colony
                  </Badge>
                  <CardTitle className="text-2xl font-bold pt-1">{myColony.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {myColony.address}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {user.isColonyAdmin && (
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2.5 text-xs font-semibold border-primary/20 hover:bg-primary/5 text-primary hover:text-primary">
                          <Edit2 className="h-3 w-3" />
                          Edit Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Edit Colony Details</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                          <div className="space-y-1">
                            <Label htmlFor="editName" className="text-xs">Colony Name</Label>
                            <Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="editAddress" className="text-xs">Address / Location</Label>
                            <Input id="editAddress" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="editDesc" className="text-xs">Description</Label>
                            <Textarea id="editDesc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="min-h-[100px] resize-none" />
                          </div>
                          <Button type="submit" className="w-full text-xs font-semibold" disabled={updateColony.isPending}>
                            {updateColony.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}

                  {user.isVerified ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border-0 shadow-sm shrink-0">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      Verified Resident
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-500 bg-amber-500/5 border-amber-500/30 gap-1 px-3 py-1.5 text-xs font-bold rounded-lg shrink-0">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      Pending Verification
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">About the colony</p>
                {myColony.description}
              </div>

              {!user.isVerified && (
                <Alert className="border-amber-500/20 bg-amber-500/[0.02] mt-4">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-600 font-bold text-sm">Action Needed: Verify Residency</AlertTitle>
                  <AlertDescription className="text-xs mt-1 text-muted-foreground leading-relaxed">
                    You have joined **{myColony.name}**. An admin of this colony needs to confirm your details (your username is <span className="font-semibold text-foreground">@{user.username}</span>) before you receive a verified badge.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Locality Event Highlights Carousel & Photo Gallery */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Event Highlights Slider (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-lg font-bold tracking-tight flex items-center gap-1.5 px-1">
                <Camera className="h-5 w-5 text-primary" />
                Event Highlights
              </h3>
              
              <Card className="overflow-hidden border-muted/50 bg-card/60 backdrop-blur-sm relative shadow-sm aspect-[16/9] flex items-center justify-center group">
                {/* Carousel Image Slide */}
                <div 
                  className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700 ease-in-out transform scale-100 group-hover:scale-105"
                  style={{ backgroundImage: `url(${finalCarouselItems[activeSlide]?.url})` }}
                />
                
                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
                
                {/* Slide Details Overlay (Glassmorphism bottom card) */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl border border-white/10 bg-black/45 backdrop-blur-md text-white flex flex-col justify-end min-h-[90px] shadow-lg animate-in slide-in-from-bottom-2 duration-300">
                  <Badge className="bg-primary hover:bg-primary/95 text-[10px] uppercase font-bold tracking-wider self-start mb-1 px-2 py-0.5 border-0">
                    Locality Event
                  </Badge>
                  <h4 className="text-base font-bold line-clamp-1">{finalCarouselItems[activeSlide]?.title}</h4>
                  <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{finalCarouselItems[activeSlide]?.desc}</p>
                  
                  {finalCarouselItems[activeSlide]?.location && (
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-white/70 border-t border-white/10 pt-1.5 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        {finalCarouselItems[activeSlide]?.location}
                      </span>
                    </div>
                  )}
                </div>

                {/* Left/Right Control Arrows */}
                {finalCarouselItems.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActiveSlide(prev => (prev - 1 + finalCarouselItems.length) % finalCarouselItems.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none border border-white/5"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => setActiveSlide(prev => (prev + 1) % finalCarouselItems.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none border border-white/5"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Slide indicator dots */}
                {finalCarouselItems.length > 1 && (
                  <div className="absolute top-3 right-3 flex gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full border border-white/5">
                    {finalCarouselItems.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-1.5 w-1.5 rounded-full transition-all ${idx === activeSlide ? 'bg-primary w-3' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Photo Gallery Grid (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-lg font-bold tracking-tight flex items-center gap-1.5 px-1">
                <ImageIcon className="h-5 w-5 text-primary" />
                Colony Gallery
              </h3>
              
              <Card className="border-muted/50 overflow-hidden shadow-sm flex flex-col h-[calc(100%-2.25rem)]">
                <CardContent className="p-4 flex-1">
                  <div className="grid grid-cols-2 gap-2 h-full max-h-[300px] overflow-y-auto pr-1">
                    {finalGalleryItems.slice(0, 6).map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setLightboxImg(item)}
                        className="group relative rounded-lg overflow-hidden cursor-pointer aspect-square bg-muted border border-border/40 hover:border-primary/40 transition-all shadow-sm"
                      >
                        <img 
                          src={item.url} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-2" />
                        
                        {/* Info Overlay */}
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <p className="text-[10px] font-bold text-white line-clamp-1">{item.title}</p>
                          <p className="text-[8px] text-white/75 truncate mt-0.5">By {item.author}</p>
                        </div>

                        {/* Top Right Type Tag */}
                        <Badge className="absolute top-1.5 right-1.5 bg-black/40 text-[8px] px-1 py-0 border-0 pointer-events-none uppercase text-white/90">
                          {item.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

          {/* Gallery Lightbox Modal */}
          {lightboxImg && (
            <Dialog open={!!lightboxImg} onOpenChange={(open) => !open && setLightboxImg(null)}>
              <DialogContent className="max-w-3xl p-0 bg-black overflow-hidden border-white/10">
                <div className="relative aspect-video w-full flex items-center justify-center bg-black">
                  <img 
                    src={lightboxImg.url} 
                    alt={lightboxImg.title} 
                    className="max-h-[80vh] max-w-full object-contain"
                  />
                  
                  {/* Top Close Button (overlay) */}
                  <button 
                    onClick={() => setLightboxImg(null)}
                    className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Details Bottom Bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent text-white border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-base">{lightboxImg.title}</h4>
                        <p className="text-xs text-white/60 mt-0.5">Shared by {lightboxImg.author}</p>
                      </div>
                      <Badge className="bg-primary text-xs border-0 font-bold uppercase">{lightboxImg.type}</Badge>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Admin Verification Panel */}
          {user.isColonyAdmin && (
            <Card className="shadow-sm border-muted/50">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Colony Admin Dashboard
                </CardTitle>
                <CardDescription>Verify residency requests from neighbors joining your colony.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {pendingMembers && pendingMembers.length > 0 ? (
                  <div className="space-y-4">
                    {pendingMembers.map((member) => (
                      <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-muted/50 bg-card gap-4 hover:border-primary/10 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-sm text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              @{member.username} {member.apartment && `• Apartment: ${member.apartment}`}
                            </p>
                            {member.phone && <p className="text-[10px] text-muted-foreground mt-0.5">Phone: {member.phone}</p>}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleVerify(member.id)}
                          disabled={verifyMember.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 self-end sm:self-center"
                        >
                          <Check className="h-4 w-4" />
                          Approve Member
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground space-y-2">
                    <Users className="h-10 w-10 mx-auto opacity-35" />
                    <p className="text-sm font-semibold">All caught up!</p>
                    <p className="text-xs">No pending verification requests for this colony.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Switch Colony Option */}
          <div className="text-right">
            <Button variant="ghost" className="text-xs text-muted-foreground hover:text-primary gap-1" onClick={() => handleJoin(0)}>
              Leave current colony / Switch colony
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Join Colony UI */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Find and Join your Colony</CardTitle>
                <CardDescription>Select a colony below to send a residency verification request to its administrator.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search colony by name or location..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {coloniesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse border" />
                    ))}
                  </div>
                ) : filteredColonies && filteredColonies.length > 0 ? (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {filteredColonies.map((colony) => (
                      <div key={colony.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-muted/10 gap-4 hover:border-primary/25 transition-all">
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{colony.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{colony.address}</p>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{colony.description}</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => handleJoin(colony.id)} className="self-end sm:self-center gap-1">
                          Join
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Milestone className="h-10 w-10 mx-auto opacity-20 mb-3" />
                    <p className="text-sm">No colonies match your search.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Create Colony Panel */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-dashed bg-muted/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-1.5">
                  <Plus className="h-5 w-5 text-primary" />
                  Register Colony
                </CardTitle>
                <CardDescription>If your colony is not in the list, you can register it to become its administrator.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="colonyName" className="text-xs">Colony Name</Label>
                    <Input id="colonyName" placeholder="e.g. Skyline Residency" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="colonyAddress" className="text-xs">Address / Location</Label>
                    <Input id="colonyAddress" placeholder="e.g. Sector 5, Dwarka" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="colonyDesc" className="text-xs">Short Description</Label>
                    <Textarea id="colonyDesc" placeholder="e.g. A housing society of 200 flats. Quiet and green." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px] resize-none" />
                  </div>

                  <Button type="submit" className="w-full text-xs font-semibold" disabled={createColony.isPending}>
                    {createColony.isPending ? "Creating..." : "Create Colony"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
