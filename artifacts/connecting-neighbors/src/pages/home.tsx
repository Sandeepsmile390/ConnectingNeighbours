import { 
  useGetFeedStats, 
  useGetRecentActivity, 
  getGetFeedStatsQueryKey, 
  getGetRecentActivityQueryKey,
  useGetMe,
  getGetMeQueryKey,
  useListAlerts,
  getListAlertsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, ShoppingBag, Calendar, AlertTriangle, HeartHandshake, Sparkles, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export default function Home() {
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: alerts } = useListAlerts({ query: { queryKey: getListAlertsQueryKey() } });
  const { data: stats, isLoading: statsLoading } = useGetFeedStats({ query: { queryKey: getGetFeedStatsQueryKey() } });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });

  const statCards = [
    { title: "Members", value: stats?.totalMembers, icon: Users, href: "/members", color: "text-blue-500" },
    { title: "Posts", value: stats?.totalPosts, icon: MessageSquare, href: "/feed", color: "text-green-500" },
    { title: "Listings", value: stats?.activeListings, icon: ShoppingBag, href: "/marketplace", color: "text-purple-500" },
    { title: "Events", value: stats?.upcomingEvents, icon: Calendar, href: "/events", color: "text-orange-500" },
    { title: "Alerts", value: stats?.activeAlerts, icon: AlertTriangle, href: "/alerts", color: "text-red-500" },
    { title: "Resources", value: stats?.availableResources, icon: HeartHandshake, href: "/resources", color: "text-teal-500" },
  ];

  const chartData = [
    { name: "Members", count: stats?.totalMembers || 0, color: "#3B82F6" },
    { name: "Posts", count: stats?.totalPosts || 0, color: "#10B981" },
    { name: "Listings", count: stats?.activeListings || 0, color: "#8B5CF6" },
    { name: "Events", count: stats?.upcomingEvents || 0, color: "#F97316" },
    { name: "Alerts", count: stats?.activeAlerts || 0, color: "#EF4444" },
    { name: "Resources", count: stats?.availableResources || 0, color: "#0D9488" },
  ];

  const activeEmergencyAlerts = alerts?.filter(a => !a.isResolved && (a.severity === "emergency" || a.severity === "high"));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Village Square</h1>
          <p className="text-muted-foreground mt-2">What's happening in the neighborhood right now.</p>
        </div>
      </div>

      {/* Critical Status Alerts & Colony Joining */}
      <div className="space-y-4">
        {user && !user.colonyId && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3.5 items-start">
            <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-blue-600 text-sm">Join a Colony</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You haven't joined a colony yet. Register or join a colony in the Colony Hub to connect with neighbors, share PG slots, and see alerts.
              </p>
              <Link href="/colonies">
                <Button variant="link" className="text-xs p-0 h-auto font-bold text-blue-600 hover:text-blue-700">Go to Colony Hub &rarr;</Button>
              </Link>
            </div>
          </div>
        )}

        {user && user.colonyId && !user.isVerified && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3.5 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-amber-600 text-sm">Residency Verification Pending</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your residency is pending verification by the administrator. You can browse and participate, but your profile will show as unverified until approved.
              </p>
              <Link href="/colonies">
                <Button variant="link" className="text-xs p-0 h-auto font-bold text-amber-600 hover:text-amber-700">Go to Colony Hub &rarr;</Button>
              </Link>
            </div>
          </div>
        )}

        {activeEmergencyAlerts && activeEmergencyAlerts.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <AlertTriangle className="h-4.5 w-4.5 text-red-500 animate-bounce" />
              <h3 className="font-bold text-red-600 text-sm">CRITICAL EMERGENCY ALERTS</h3>
            </div>
            <div className="space-y-2">
              {activeEmergencyAlerts.map(alert => (
                <div key={alert.id} className="text-xs border-l-2 border-red-500 pl-3 py-1 bg-background/25 rounded-r-lg">
                  <p className="font-bold text-foreground">{alert.title}</p>
                  <p className="text-muted-foreground mt-0.5">{alert.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Dashboard Launcher */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/alerts">
            <button className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border bg-card hover:border-red-500/30 hover:bg-red-500/[0.01] transition-all gap-2 shadow-sm text-center">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs">Report Alert</span>
              <span className="text-[10px] text-muted-foreground">Emergency trigger</span>
            </button>
          </Link>
          <Link href="/colonies">
            <button className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border bg-card hover:border-primary/30 hover:bg-primary/[0.01] transition-all gap-2 shadow-sm text-center">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs">Colony Hub</span>
              <span className="text-[10px] text-muted-foreground">Switch / Manage</span>
            </button>
          </Link>
          <Link href="/assistant">
            <button className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border bg-card hover:border-indigo-500/30 hover:bg-indigo-500/[0.01] transition-all gap-2 shadow-sm text-center">
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs">AI Assistant</span>
              <span className="text-[10px] text-muted-foreground">Ask anything</span>
            </button>
          </Link>
          <Link href="/hostels">
            <button className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border bg-card hover:border-orange-500/30 hover:bg-orange-500/[0.01] transition-all gap-2 shadow-sm text-center">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs">Browse PGs</span>
              <span className="text-[10px] text-muted-foreground">Rentals directory</span>
            </button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : (
          statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover-elevate cursor-pointer transition-all border-muted/50 bg-card hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value || 0}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>The latest updates from your neighbors.</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-6">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 text-sm">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {item.type === 'post' && <MessageSquare className="h-4 w-4" />}
                      {item.type === 'listing' && <ShoppingBag className="h-4 w-4" />}
                      {item.type === 'event' && <Calendar className="h-4 w-4" />}
                      {item.type === 'alert' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      {item.type === 'resource' && <HeartHandshake className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-semibold">{item.actorName}</span> added a new {item.type}
                      </p>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-muted-foreground line-clamp-1">{item.description}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto opacity-20 mb-4" />
                <p>It's quiet here. Be the first to post something!</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <Link href="/feed"><Button variant="outline">Create a Post</Button></Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Activity Breakdown</CardTitle>
            <CardDescription>Overview of active items in the village.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[280px] flex items-center justify-center">
            {statsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border rounded-lg p-2.5 shadow-md text-xs font-semibold">
                            <p className="text-foreground">{payload[0].name}: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* About the App Section */}
      <Card className="border-muted/50 bg-gradient-to-r from-purple-500/[0.02] via-indigo-500/[0.02] to-blue-500/[0.02] shadow-sm overflow-hidden mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
            About Connecting Neighbors
          </CardTitle>
          <CardDescription>
            Learn how this platform helps build a stronger, safer, and more collaborative local community.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2.5 p-4 rounded-xl bg-card border border-muted/50 hover:border-indigo-500/20 hover:scale-[1.01] transition-all duration-300">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-sm">What is the portal?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A secure digital square for verified residents of our community. It connects neighbors for conversations, local announcements, resources sharing, and direct messaging.
            </p>
          </div>

          <div className="space-y-2.5 p-4 rounded-xl bg-card border border-muted/50 hover:border-indigo-500/20 hover:scale-[1.01] transition-all duration-300">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-sm">What problems does it solve?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Shatters physical isolation by making local connections easy, simplifies resource/tool sharing to eliminate waste, and establishes immediate awareness of local safety emergencies.
            </p>
          </div>

          <div className="space-y-2.5 p-4 rounded-xl bg-card border border-muted/50 hover:border-indigo-500/20 hover:scale-[1.01] transition-all duration-300">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-bold text-sm">Why should you use it?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Find support when you need a hand, buy or trade items locally with trust, borrow utility tools from verified neighbors, and contribute to building a vibrant, connected environment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
