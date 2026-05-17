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

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "strategies", element: <StrategiesPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
