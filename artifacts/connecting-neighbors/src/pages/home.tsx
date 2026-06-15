import { useGetFeedStats, useGetRecentActivity, getGetFeedStatsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, ShoppingBag, Calendar, AlertTriangle, HeartHandshake } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export default function Home() {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Village Square</h1>
        <p className="text-muted-foreground mt-2">What's happening in the neighborhood right now.</p>
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
    </div>
  );
}
