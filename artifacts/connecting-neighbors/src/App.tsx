import { Switch, Route } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@workspace/replit-auth-web";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Feed from "@/pages/feed";
import Marketplace from "@/pages/marketplace";
import Events from "@/pages/events";
import Alerts from "@/pages/alerts";
import Resources from "@/pages/resources";
import Members from "@/pages/members";
import Profile from "@/pages/profile";
import Chat from "@/pages/chat";
import Feedback from "@/pages/feedback";
import Assistant from "@/pages/assistant";
import Colonies from "@/pages/colonies";
import Hostels from "@/pages/hostels";
import Guidelines from "@/pages/guidelines";
import NotFound from "@/pages/not-found";

function Router() {
  return (
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
  );
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center" />;
  }

  if (!isAuthenticated) {
    return <Login />;
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
