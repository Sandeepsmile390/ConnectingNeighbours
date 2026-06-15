import { useState } from "react";
import { 
  useListColonies, 
  useCreateColony, 
  useJoinColony, 
  useListPendingMembers, 
  useVerifyColonyMember,
  getListColoniesQueryKey,
  getListPendingMembersQueryKey,
  useGetMe,
  getGetMeQueryKey
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
import { Milestone, Plus, Search, Check, ShieldAlert, ArrowRight, UserCheck, Users, MapPin } from "lucide-react";
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

  // Find user's active colony details
  const myColony = colonies?.find(c => c.id === user?.colonyId);

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
                
                {user.isColonyApproved ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 px-3 py-1 text-xs font-bold rounded-lg border-0 shadow-sm shrink-0 self-start sm:self-center">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    Verified Resident
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 bg-amber-500/5 border-amber-500/30 gap-1 px-3 py-1 text-xs font-bold rounded-lg shrink-0 self-start sm:self-center">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    Pending Verification
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">About the colony</p>
                {myColony.description}
              </div>

              {!user.isColonyApproved && (
                <Alert className="border-amber-500/20 bg-amber-500/[0.02] mt-4">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-600 font-bold text-sm">Action Needed: Verify Residency</AlertTitle>
                  <AlertDescription className="text-xs mt-1 text-muted-foreground leading-relaxed">
                    You have requested to join **{myColony.name}**. An admin of this colony needs to confirm your details (your username is <span className="font-semibold text-foreground">@{user.username}</span>) before you receive a verified badge and unlock permissions.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

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
