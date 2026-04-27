import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import Dashboard from "../pages/dashboard/Dashboard";
import AdStudio from "../pages/studio/AdStudio";
import History from "../pages/history/History";
import Variants from "../pages/variants/Variants";
import Profile from "../pages/profile/Profile";
import NotFound from "../pages/NotFound";

import MainLayout from "../layout/MainLayout";
import useAuthStore from "../context/useAuthStore";
import { Outlet } from "react-router-dom";

function PublicRoute({ children }) {
  const tokenInStorage = (() => { 
    try { 
      const s = JSON.parse(localStorage.getItem("advantage-auth"));
      return s?.state?.token;
    } catch { return null; }
  })();
  if (tokenInStorage) return <Navigate to="/dashboard" replace />;
  return children;
}

function ProtectedRoute() {
  // Check both zustand store AND localStorage directly
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tokenInStorage = localStorage.getItem("token") || 
    (() => { 
      try { 
        const s = JSON.parse(localStorage.getItem("advantage-auth"));
        return s?.state?.token;
      } catch { return null; }
    })();

  if (!isAuthenticated && !tokenInStorage) return <Navigate to="/" replace />;

  return <MainLayout />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/"       element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ad-studio" element={<AdStudio />} />
        <Route path="/history"   element={<History />} />
        <Route path="/variants"  element={<Variants />} />
        <Route path="/profile"   element={<Profile />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}