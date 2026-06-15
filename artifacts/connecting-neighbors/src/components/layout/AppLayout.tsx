import { useAuth } from "@workspace/replit-auth-web";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  MessageSquare, 
  ShoppingBag, 
  Calendar, 
  AlertTriangle, 
  HeartHandshake, 
  Users, 
  User as UserIcon,
  LogOut,
  Menu,
  Sun,
  Moon,
  MessageCircle,
  Sparkles,
  Heart,
  Milestone,
  Hotel,
  BookOpen
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useGetRecentActivity, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "next-themes";

interface AppLayoutProps {
  children: React.ReactNode;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-md transition-colors"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <Sun className="h-5 w-5 hidden dark:block text-amber-500" />
      <Moon className="h-5 w-5 dark:hidden" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  // Notification and Audio Chime Logic
  const pageLoadTime = useRef(new Date());
  const seenIds = useRef<Set<string>>(new Set());

  // Poll for recent activity every 5 seconds to generate alerts
  const { data: recentActivity } = useGetRecentActivity({
    query: {
      enabled: !!user,
      refetchInterval: 5000,
      queryKey: getGetRecentActivityQueryKey(),
    }
  });

  useEffect(() => {
    // Request permission on load
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!recentActivity || recentActivity.length === 0) return;

    recentActivity.forEach((activity: any) => {
      const activityTime = new Date(activity.createdAt);
      if (activityTime > pageLoadTime.current && !seenIds.current.has(activity.id)) {
        seenIds.current.add(activity.id);

        // Show browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          const typeLabel = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
          new Notification(`New ${typeLabel}: ${activity.title}`, {
            body: `${activity.actorName}: ${activity.description}`,
          });

          // Play programmatic high-quality notification chime
          try {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioCtx = new AudioContextClass();
            const now = audioCtx.currentTime;
            
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(880, now);
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.1, now + 0.03);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.start(now);
            osc1.stop(now + 0.45);

            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(1109.73, now + 0.08);
            gain2.gain.setValueAtTime(0, now + 0.08);
            gain2.gain.linearRampToValueAtTime(0.08, now + 0.11);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.55);
          } catch (e) {
            console.warn("Failed to play notification audio chime", e);
          }
        }
      }
    });
  }, [recentActivity]);

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Feed", href: "/feed", icon: MessageSquare },
    { name: "Messages", href: "/chat", icon: MessageCircle },
    { name: "Colony Hub", href: "/colonies", icon: Milestone },
    { name: "Marketplace", href: "/marketplace", icon: ShoppingBag },
    { name: "Hostels", href: "/hostels", icon: Hotel },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Alerts", href: "/alerts", icon: AlertTriangle },
    { name: "Resources", href: "/resources", icon: HeartHandshake },
    { name: "Members", href: "/members", icon: Users },
    { name: "AI Guide", href: "/assistant", icon: Sparkles },
    { name: "Guidelines", href: "/guidelines", icon: BookOpen },
    { name: "Feedback", href: "/feedback", icon: Heart },
  ];

  const NavLinks = () => (
    <div className="space-y-1">
      {navigation.map((item) => {
        const isActive = location === item.href;
        const Icon = item.icon;
        return (
          <Link key={item.name} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Button>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 border-b">
          <img src="/logo.png" alt="Connecting Neighbors" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-semibold text-lg tracking-tight">Neighbors</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavLinks />
        </div>
        <div className="p-4 border-t space-y-2">
          <Link href="/profile">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span className="truncate flex-1 text-left">{user?.name || "Profile"}</span>
            </Button>
          </Link>
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 rounded-lg border border-muted/50">
            <span className="text-xs font-medium text-muted-foreground">Appearance</span>
            <ThemeToggle />
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground mt-2" onClick={() => logout()}>
            <LogOut className="h-5 w-5" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b bg-card h-16 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Connecting Neighbors" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-semibold">Neighbors</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div className="p-6 border-b">
                <span className="font-semibold text-lg">Connecting Neighbors</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <NavLinks />
              </div>
              <div className="p-4 border-t space-y-2">
                <Link href="/profile">
                  <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
                    <UserIcon className="h-5 w-5" />
                    Profile
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={() => logout()}>
                  <LogOut className="h-5 w-5" />
                  Log out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
