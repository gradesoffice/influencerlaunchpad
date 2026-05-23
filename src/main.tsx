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
  const errorMsg = (window as any).__LAST_ERROR_MSG || "Unknown error";
  const errorPage = window.location.pathname;
  const errorTime = new Date().toLocaleString("id-ID");
  const waText = encodeURIComponent(`🚨 Bug Report\n\nHalaman: ${errorPage}\nWaktu: ${errorTime}\nError: ${errorMsg}\n\nTolong diperbaiki ya!`);
  const waGroupLink = "https://chat.whatsapp.com/Kznf2GI2eux3537fIcq3xn";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f7] p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center mb-4"><span className="text-2xl">⚠️</span></div>
        <h1 className="text-xl font-bold mb-2">Oops, ada yang salah</h1>
        <p className="text-sm text-muted-foreground mb-6">Coba refresh halaman atau laporkan error ini ke tim kami.</p>
        <div className="flex gap-3 justify-center mb-4">
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">Refresh</button>
          <a href="/" className="px-4 py-2 rounded-lg border text-sm font-medium">Home</a>
        </div>
        <a href={`${waGroupLink}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.476A11.929 11.929 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.115 0-4.09-.57-5.793-1.564l-.415-.247-2.742.876.876-2.688-.271-.431A9.71 9.71 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
          Laporkan Error
        </a>
        <p className="text-[10px] text-muted-foreground mt-3">Error: {errorMsg.slice(0, 100)}</p>
      </div>
    </div>
  );
}

// Capture last error for error boundary reporting
window.addEventListener("error", (e) => { (window as any).__LAST_ERROR_MSG = e.message || "Unknown error"; });
window.addEventListener("unhandledrejection", (e) => { (window as any).__LAST_ERROR_MSG = e.reason?.message || "Unhandled promise rejection"; });

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
