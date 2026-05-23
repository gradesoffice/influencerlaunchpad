import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";

import RootLayout from "./pages/RootLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import PricingPage from "./pages/PricingPage";
import StrategiesPage from "./pages/StrategiesPage";
import LegalPage from "./pages/LegalPage";
import AdminPage from "./pages/AdminPage";

function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f7] p-6">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">😵</p>
        <h1 className="text-xl font-bold mb-2">Oops, ada yang salah</h1>
        <p className="text-sm text-muted-foreground mb-6">Coba refresh halaman atau kembali ke home.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">Refresh</button>
          <a href="/" className="px-4 py-2 rounded-lg border text-sm font-medium">Home</a>
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "strategies", element: <StrategiesPage /> },
      { path: "legal", element: <LegalPage /> },
      { path: "admin", element: <AdminPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
