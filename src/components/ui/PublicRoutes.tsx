// src/components/PublicRoute.tsx
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import supabase from "@/backend/config";
import LoadingUI from "../LoadingUI";
interface PublicRouteProps {
  children: ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return <LoadingUI />;

  // ✅ If already logged in, redirect to dashboard
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default PublicRoute;
