import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [isAdminPasswordView, setIsAdminPasswordView] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [apkUrl, setApkUrl] = useState("https://connecting-neighbours-apiserver.vercel.app/download/app-latest.apk");
  useEffect(() => {
    fetch("/api/app-version")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.apkUrl) {
          setApkUrl(data.apkUrl);
        }
      })
      .catch(() => {});
  }, []);

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

          {/* Android APK Download Banner */}
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 text-left animate-in fade-in duration-1000 delay-300">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.5 12c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m-11 0c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5m11.33-4.5L19.2 5.2a.498.498 0 0 0-.08-.7c-.22-.16-.52-.11-.69.1L16.92 6.5C15.42 5.82 13.76 5.43 12 5.43c-1.76 0-3.42.39-4.92 1.07L5.57 4.6a.512.512 0 0 0-.7-.1c-.2.16-.25.46-.09.68L6.17 7.5C2.7 9.4 1.33 13 1.1 17h21.8c-.23-4-1.6-7.6-5.07-9.5" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-foreground">Also available on Android</h3>
                <p className="text-xs text-muted-foreground">Download the APK directly to your device</p>
              </div>
            </div>
            <a 
              href={apkUrl} 
              download 
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              Download Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
