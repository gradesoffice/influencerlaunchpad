import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const PUBLIC_PATHS = ["/login", "/pricing"];

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") navigate("/login");
      if (event === "SIGNED_IN" && location.pathname === "/login") {
        // Redirect to saved path or home after login
        const returnTo = sessionStorage.getItem("returnTo") || "/";
        sessionStorage.removeItem("returnTo");
        navigate(returnTo);
      }
      setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const path = location.pathname;
      if (!session && !PUBLIC_PATHS.includes(path)) {
        sessionStorage.setItem("returnTo", path);
        navigate("/login");
      } else if (session && path === "/login") {
        navigate("/");
      }
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
