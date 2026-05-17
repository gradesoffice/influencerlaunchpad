import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") navigate("/login");
      setReady(true);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const path = window.location.pathname;
      if (!session && path !== "/login" && path !== "/pricing") {
        navigate("/login");
      } else if (session && path === "/login") {
        navigate("/");
      }
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
