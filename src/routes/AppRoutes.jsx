import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import Dashboard from "../pages/dashboard/Dashboard";
import AdStudio from "../pages/studio/AdStudio";
import History from "../pages/history/History";
import Profile from "../pages/profile/Profile";
import NotFound from "../pages/NotFound";

import MainLayout from "../layout/MainLayout";
import useAuthStore from "../context/useAuthStore";
import { Outlet } from "react-router-dom";

// ✅ FIXED ProtectedRoute — inline with console.log debug
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  console.log("🔐 ProtectedRoute check — isAuthenticated:", isAuthenticated);

  if (!isAuthenticated) {
    console.log("🚫 NOT authenticated — redirecting to login!");
    return <Navigate to="/" replace />;
  }

  console.log("✅ Authenticated — rendering page");
  return (
    <>
      <MainLayout />
    </>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/"       element={<Login />} />
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ad-studio" element={<AdStudio />} />
        <Route path="/history"   element={<History />} />
        <Route path="/profile"   element={<Profile />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}