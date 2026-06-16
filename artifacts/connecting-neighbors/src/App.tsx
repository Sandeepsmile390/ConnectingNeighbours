import { useState, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@workspace/replit-auth-web";
import { Toaster } from "@/components/ui/toaster";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListColonies, 
  useCreateColony, 
  useJoinColony,
  getListColoniesQueryKey,
  useGetMe,
  getGetMeQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Milestone, Plus, Search, ArrowRight, LogOut, Building, Users } from "lucide-react";

const Login = lazy(() => import("@/pages/login"));
const Home = lazy(() => import("@/pages/home"));
const Feed = lazy(() => import("@/pages/feed"));
const Marketplace = lazy(() => import("@/pages/marketplace"));
const Events = lazy(() => import("@/pages/events"));
const Alerts = lazy(() => import("@/pages/alerts"));
const Resources = lazy(() => import("@/pages/resources"));
const Members = lazy(() => import("@/pages/members"));
const Profile = lazy(() => import("@/pages/profile"));
const Chat = lazy(() => import("@/pages/chat"));
const Feedback = lazy(() => import("@/pages/feedback"));
const Assistant = lazy(() => import("@/pages/assistant"));
const Colonies = lazy(() => import("@/pages/colonies"));
const Hostels = lazy(() => import("@/pages/hostels"));
const Guidelines = lazy(() => import("@/pages/guidelines"));
const NotFound = lazy(() => import("@/pages/not-found"));

function ColonyOnboarding() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"choose" | "admin" | "resident">("choose");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Create Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  const { data: colonies, isLoading: coloniesLoading } = useListColonies();
  const createColony = useCreateColony();
  const joinColony = useJoinColony();

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
        toast({ title: "Colony Registered!", description: "You are now the administrator of this colony." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListColoniesQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to register colony", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleJoin = (colId: number) => {
    joinColony.mutate({
      data: { colonyId: colId }
    }, {
      onSuccess: () => {
        toast({ title: "Request Submitted", description: "You have requested to join. Pending admin approval." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to join colony", description: err.message, variant: "destructive" });
      }
    });
  };

  const filteredColonies = colonies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-6">
      {/* Header bar */}
      <div className="flex justify-between items-center max-w-4xl w-full mx-auto mb-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Connecting Neighbors" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-bold text-xl tracking-tight">Neighbors</span>
        </div>
        <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center max-w-4xl w-full mx-auto my-auto">
        <div className="w-full space-y-6">
          {activeTab === "choose" && (
            <div className="space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="space-y-3">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  Choose your role to get started
                </h1>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                  Every user must belong to a colony. Tell us if you are registering a new colony as an administrator, or joining an existing one as a resident.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4">
                {/* Admin Card */}
                <Card 
                  className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-md bg-card border flex flex-col justify-between"
                  onClick={() => setActiveTab("admin")}
                >
                  <CardHeader className="p-6 text-left">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Building className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-bold">Colony Admin</CardTitle>
                    <CardDescription className="text-sm mt-2">
                      Register a new colony. You will manage residency requests, post safety announcements, and maintain the neighborhood.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 text-left">
                    <Button className="w-full gap-2 group-hover:bg-primary/95">
                      Register Colony
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Resident Card */}
                <Card 
                  className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-md bg-card border flex flex-col justify-between"
                  onClick={() => setActiveTab("resident")}
                >
                  <CardHeader className="p-6 text-left">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-bold">Colony Resident</CardTitle>
                    <CardDescription className="text-sm mt-2">
                      Find and join your neighborhood colony. Access the community feed, chat with neighbors, browse the marketplace, and RSVP to events.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 text-left">
                    <Button variant="secondary" className="w-full gap-2">
                      Join as Resident
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "admin" && (
            <Card className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Register your Colony
                </CardTitle>
                <CardDescription>Enter details to establish a new colony on the network.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="cName">Colony Name</Label>
                    <Input id="cName" placeholder="e.g. Greenwood Residency" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cAddress">Address / Location</Label>
                    <Input id="cAddress" placeholder="e.g. Phase 2, Sector 12" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cDesc">Short Description</Label>
                    <Textarea id="cDesc" placeholder="e.g. Safe, quiet neighborhood of 150 apartments." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[85px] resize-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setActiveTab("choose")}>
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={createColony.isPending}>
                      {createColony.isPending ? "Creating..." : "Submit Registration"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "resident" && (
            <Card className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Find and Join Colony
                </CardTitle>
                <CardDescription>Search for your local society to send a join request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or address..." 
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
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {filteredColonies.map((colony) => (
                      <div key={colony.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-muted/10 gap-4 hover:border-primary/25 transition-all">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-foreground truncate">{colony.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{colony.address}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{colony.description}</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => handleJoin(colony.id)} className="shrink-0 gap-1 self-end sm:self-center">
                          Join
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Milestone className="h-8 w-8 mx-auto opacity-20 mb-2" />
                    <p className="text-sm">No colonies match your search.</p>
                  </div>
                )}

                <div className="pt-2">
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab("choose")}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-muted-foreground max-w-4xl w-full mx-auto mt-8 border-t pt-4">
        Connecting Neighbors · Build a stronger community
      </div>
    </div>
  );
}

function RouteLoading() {
  return (
    <div className="w-full space-y-6 p-1 animate-pulse">
      <style>{`
        @keyframes loading-progress {
          0% { left: -30%; width: 30%; }
          50% { left: 30%; width: 40%; }
          100% { left: 100%; width: 30%; }
        }
        .animate-progress-bar {
          position: absolute;
          animation: loading-progress 1.5s infinite linear;
        }
      `}</style>
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted/30 overflow-hidden z-50">
        <div className="h-full bg-gradient-to-r from-primary/80 to-primary animate-progress-bar" />
      </div>
      
      {/* Modern Page Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-muted/60" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted/60 rounded w-1/4" />
            <div className="h-3 bg-muted/40 rounded w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="h-32 rounded-xl bg-muted/40 border border-muted/20" />
          <div className="h-32 rounded-xl bg-muted/40 border border-muted/20" />
          <div className="h-32 rounded-xl bg-muted/40 border border-muted/20" />
        </div>
        <div className="h-48 rounded-xl bg-muted/30 border border-muted/10 mt-6" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/feed" component={Feed} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/events" component={Events} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/resources" component={Resources} />
        <Route path="/members" component={Members} />
        <Route path="/profile" component={Profile} />
        <Route path="/chat" component={Chat} />
        <Route path="/feedback" component={Feedback} />
        <Route path="/assistant" component={Assistant} />
        <Route path="/colonies" component={Colonies} />
        <Route path="/hostels" component={Hostels} />
        <Route path="/guidelines" component={Guidelines} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center" />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center" />}>
        <Login />
      </Suspense>
    );
  }

  // Intercept and enforce colony onboarding choice right after sign-in
  if (user && !user.colonyId) {
    return (
      <>
        <ColonyOnboarding />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <AppLayout>
        <Router />
      </AppLayout>
      <Toaster />
    </>
  );
}
