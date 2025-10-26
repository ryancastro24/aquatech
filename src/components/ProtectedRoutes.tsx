// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import supabase from "@/backend/config";
import LoadingUI from "./LoadingUI";
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // ✅ Check current session once
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
      setLoading(false);
    });

    // ✅ Listen for login/logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingUI />
      </div>
    );

  // ✅ Redirect if not logged in
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
