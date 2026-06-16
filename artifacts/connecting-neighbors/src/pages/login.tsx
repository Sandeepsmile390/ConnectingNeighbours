import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [isAdminPasswordView, setIsAdminPasswordView] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAdminVerify = () => {
    if (password === "Admin@1234") {
      localStorage.setItem("intended_role", "admin");
      login();
    } else {
      setError("Incorrect administrator password.");
    }
  };

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
            {!isAdminPasswordView ? (
              <>
                <Button 
                  size="lg" 
                  className="w-full text-base font-semibold" 
                  onClick={() => setIsAdminPasswordView(true)}
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
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center gap-1.5 text-left mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
                    <ShieldAlert className="h-4 w-4" />
                    Admin Verification
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please enter the administrator password to log in.
                  </p>
                </div>
                <Input 
                  type="password" 
                  placeholder="Enter admin password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdminVerify();
                  }}
                  autoFocus
                />
                {error && <p className="text-xs text-destructive text-left font-medium">{error}</p>}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setIsAdminPasswordView(false);
                      setPassword("");
                      setError("");
                    }}
                  >
                    Back
                  </Button>
                  <Button 
                    className="flex-1 font-semibold"
                    onClick={handleAdminVerify}
                  >
                    Verify & Sign In
                  </Button>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Securely authenticate with Google to verify you're a real neighbor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
