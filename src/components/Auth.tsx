import { useState, useEffect, type FC, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  Mail,
  Lock,
  User,
  LogIn,
  UserPlus,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

interface AuthProps {
  onAuthSuccess: (user: any) => void;
  theme: "light" | "dark";
}

export const Auth: FC<AuthProps> = ({ onAuthSuccess, theme }) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) return;
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        checkAuth();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const user = await res.json();
        onAuthSuccess(user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const res = await fetch("/api/auth/google/url");
      const { url } = await res.json();
      window.open(url, "google_oauth", "width=600,height=700");
    } catch (e) {
      setError("Failed to start Google Sign In");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/signup";
    const body =
      mode === "signin" ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        onAuthSuccess(data.user);
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center p-4",
        theme === "dark"
          ? "bg-brand-dark text-white"
          : "bg-gray-50 text-gray-900",
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full max-w-md p-8 rounded-3xl border shadow-2xl",
          theme === "dark"
            ? "bg-gray-900 border-gray-800"
            : "bg-white border-gray-200",
        )}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-brand-blue to-brand-purple flex items-center justify-center p-2 mb-4 shadow-xl shadow-brand-blue/20">
            <Logo className="w-full h-full text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold tracking-tight">
            Sava AI
          </h2>
          <p className="opacity-60 text-sm mt-2">
            Your universal intelligent assistant
          </p>
        </div>

        <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5 mb-8">
          <button
            onClick={() => setMode("signin")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
              mode === "signin"
                ? "bg-white dark:bg-gray-800 shadow-sm text-brand-blue"
                : "opacity-60",
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
              mode === "signup"
                ? "bg-white dark:bg-gray-800 shadow-sm text-brand-blue"
                : "opacity-60",
            )}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest opacity-40 ml-1">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/50 outline-none transition-all",
                    theme === "dark" ? "bg-gray-800" : "bg-gray-100",
                  )}
                  placeholder="Your Name"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest opacity-40 ml-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/50 outline-none transition-all",
                  theme === "dark" ? "bg-gray-800" : "bg-gray-100",
                )}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest opacity-40 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/50 outline-none transition-all",
                  theme === "dark" ? "bg-gray-800" : "bg-gray-100",
                )}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-linear-to-r from-brand-blue to-brand-purple text-white font-bold shadow-lg shadow-brand-blue/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === "signin" ? (
              <LogIn className="w-5 h-5" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800 opacity-20"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span
              className={cn(
                "px-2 opacity-40",
                theme === "dark" ? "bg-gray-900" : "bg-white",
              )}
            >
              Or continue with
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className={cn(
            "w-full py-4 rounded-xl border flex items-center justify-center gap-3 font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all",
            theme === "dark" ? "border-gray-800" : "border-gray-200",
          )}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
};
