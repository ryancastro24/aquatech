import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../components/ui/card";
import logo from "@/assets/aquatech_logo.png";
import aquatec_bg from "@/assets/aquatech_bg2.jpg";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react"; // ✅ Import icons
import supabase from "@/backend/config";

/* ✅ --- Sync User Profile Helper --- */
async function syncUserProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth fetch error:", authError.message);
    return null;
  }

  if (!user) {
    console.warn("No authenticated user found.");
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        auth_id: user.id,
        email: user.email,
        full_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "Unnamed User",
        profile_picture: user.user_metadata?.avatar_url || null,
        role: "customer",
      },
      { onConflict: "auth_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("Error syncing user:", error.message);
    return null;
  }

  return data;
}

const LoginPage = () => {
  const [showSignup, setShowSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<
    "google" | "facebook" | null
  >(null);
  const [signupData, setSignupData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // ✅ States to toggle password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* --- Handle OAuth Sign-In --- */
  const handleOAuthLogin = async (provider: "google" | "facebook") => {
    try {
      setOauthLoading(provider);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard/dashboard_main`,
        },
      });
      if (error) console.error("OAuth error:", error);
    } finally {
      setOauthLoading(null);
    }
  };

  /* --- Handle Email/Password Sign In --- */
  const handleLogin = async () => {
    const { email, password } = loginData;
    if (!email || !password) {
      alert("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          alert("Please verify your email before logging in.");
        } else {
          alert(error.message);
        }
        return;
      }

      if (data.session) {
        await syncUserProfile();
        window.location.href = "/dashboard/dashboard_main";
      }
    } finally {
      setLoading(false);
    }
  };

  /* --- Handle Email/Password Sign Up --- */
  const handleSignUp = async () => {
    const { full_name, email, password, confirmPassword } = signupData;

    if (!full_name || !email || !password || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } },
      });

      if (error) {
        alert(error.message);
        return;
      }

      if (data.user) {
        await supabase.from("users").insert({
          auth_id: data.user.id,
          full_name,
          email,
          role: "customer",
        });

        alert("Registration successful! Please verify your email.");
        setShowSignup(false);
      }
    } finally {
      setLoading(false);
    }
  };

  /* --- Handle Auth State Change --- */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await syncUserProfile();
        window.location.href = "/dashboard/dashboard_main";
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${aquatec_bg})` }}
    >
      <div className="absolute inset-0 "></div>

      <Card className="w-[380px] shadow-lg relative z-10 bg-white/95 backdrop-blur-sm">
        <CardHeader className="flex items-center justify-center">
          <img src={logo} alt="aquatech logo" className="w-44" />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={loginData.email}
              onChange={(e) =>
                setLoginData({ ...loginData, email: e.target.value })
              }
            />
          </div>

          {/* ✅ Password with toggle */}
          <div className="space-y-2 relative">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showLoginPassword ? "text" : "password"}
                placeholder="••••••••"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                onClick={() => setShowLoginPassword((prev) => !prev)}
              >
                {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>

          <div className="relative flex items-center justify-center py-2">
            <span className="absolute inset-x-0 top-1/2 border-t" />
            <span className="bg-white px-2 text-gray-500 text-sm z-10">or</span>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() => handleOAuthLogin("google")}
              disabled={oauthLoading === "google" || loading}
            >
              {oauthLoading === "google" ? (
                <span>Connecting to Google...</span>
              ) : (
                <>
                  <FcGoogle size={20} /> Continue with Google
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don’t have an account?{" "}
            <button
              onClick={() => setShowSignup(true)}
              className="text-blue-600 hover:underline"
            >
              Sign up
            </button>
          </p>
        </CardContent>
      </Card>

      {/* --- SIGN UP DIALOG --- */}
      <Dialog open={showSignup} onOpenChange={setShowSignup}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Full Name</Label>
              <Input
                value={signupData.full_name}
                onChange={(e) =>
                  setSignupData({ ...signupData, full_name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={signupData.email}
                onChange={(e) =>
                  setSignupData({ ...signupData, email: e.target.value })
                }
                placeholder="you@example.com"
              />
            </div>

            {/* ✅ Signup Password with toggle */}
            <div className="relative">
              <Label>Password</Label>
              <Input
                type={showSignupPassword ? "text" : "password"}
                value={signupData.password}
                onChange={(e) =>
                  setSignupData({ ...signupData, password: e.target.value })
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
                onClick={() => setShowSignupPassword((prev) => !prev)}
              >
                {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* ✅ Confirm Password with toggle */}
            <div className="relative">
              <Label>Confirm Password</Label>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={signupData.confirmPassword}
                onChange={(e) =>
                  setSignupData({
                    ...signupData,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSignup(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSignUp} disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
