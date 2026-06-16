import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { HeartHandshake } from "lucide-react";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <img src="/logo.png" alt="Connecting Neighbors Logo" className="mx-auto w-16 h-16 rounded-2xl shadow-lg shadow-primary/10 object-cover" />
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Welcome to the neighborhood.
            </h1>
            <p className="text-lg text-muted-foreground max-w-sm mx-auto">
              Connect with locals, share resources, and build a stronger community together.
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <Button size="lg" className="w-full text-base font-semibold" onClick={() => login()}>
              Join your neighborhood
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Securely authenticate with Replit to verify you're a real neighbor.
            </p>

            <div className="mt-6 pt-6 border-t border-muted-foreground/10 space-y-3">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Quick Test Account
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs hover:bg-muted" 
                  onClick={() => {
                    const pwd = prompt("Enter admin password:");
                    if (pwd === "Admin@1234") {
                      window.location.href = `/api/auth/dev-login?role=admin&password=${encodeURIComponent(pwd)}`;
                    } else if (pwd !== null) {
                      alert("Incorrect admin password");
                    }
                  }}
                >
                  Login as Admin
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs hover:bg-muted" 
                  onClick={() => window.location.href = "/api/auth/dev-login?role=resident"}
                >
                  Login as Resident
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
