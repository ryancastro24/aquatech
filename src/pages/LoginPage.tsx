import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
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
import { FaFacebook } from "react-icons/fa";
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
  const [loading, setLoading] = useState(false); // ✅ Global loading for login & signup
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

  /* --- Handle OAuth Sign-In --- */
  const handleOAuthLogin = async (provider: "google" | "facebook") => {
    try {
      setOauthLoading(provider);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard/dashboard_main`, // ✅ redirect directly
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
          alert(
            "Please verify your email before logging in. Check your inbox."
          );
        } else {
          alert(error.message);
        }
        console.error("Login error:", error);
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
        console.error("Sign-up error:", error);
        alert(error.message);
        return;
      }

      if (data.user) {
        const { error: insertError } = await supabase.from("users").insert({
          auth_id: data.user.id,
          full_name,
          email,
          role: "customer",
        });

        if (insertError) {
          console.error("Error saving user:", insertError);
        } else {
          alert("Registration successful! Please check your email to verify.");
          setShowSignup(false);
        }
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[380px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Welcome Back
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email / Password Login */}
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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({ ...loginData, password: e.target.value })
              }
            />
          </div>

          {/* ✅ Login Button with Loading */}
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>

          <div className="relative flex items-center justify-center py-2">
            <span className="absolute inset-x-0 top-1/2 border-t" />
            <span className="bg-white px-2 text-gray-500 text-sm z-10">or</span>
          </div>

          {/* ✅ OAuth Buttons with Loading */}
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

            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() => handleOAuthLogin("facebook")}
              disabled={oauthLoading === "facebook" || loading}
            >
              {oauthLoading === "facebook" ? (
                <span>Connecting to Facebook...</span>
              ) : (
                <>
                  <FaFacebook size={20} className="text-blue-600" /> Continue
                  with Facebook
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
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={signupData.password}
                onChange={(e) =>
                  setSignupData({ ...signupData, password: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={signupData.confirmPassword}
                onChange={(e) =>
                  setSignupData({
                    ...signupData,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="••••••••"
              />
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
