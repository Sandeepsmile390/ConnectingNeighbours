import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { HeartHandshake } from "lucide-react";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <img src="/logo.png" alt="Connecting Neighbors" className="mx-auto w-16 h-16 rounded-2xl shadow-lg shadow-primary/10 object-cover" />
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Welcome to the neighborhood.
            </h1>
            <p className="text-lg text-muted-foreground max-w-sm mx-auto">
              Connect with locals, share resources, and build a stronger community together.
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-3">
            <Button 
              size="lg" 
              className="w-full text-base font-semibold" 
              onClick={() => {
                localStorage.setItem("intended_role", "admin");
                login();
              }}
            >
              Sign In as Colony Admin
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full text-base font-semibold" 
              onClick={() => {
                localStorage.setItem("intended_role", "resident");
                login();
              }}
            >
              Sign In as Resident
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Securely authenticate with Google to verify you're a real neighbor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
