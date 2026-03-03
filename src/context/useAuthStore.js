import { create } from "zustand";
import { persist } from "zustand/middleware";  // ← ADD THIS

const useAuthStore = create(
  persist(                                      // ← WRAP WITH PERSIST
    (set) => ({
      isAuthenticated: false,
      user: null,

      login: (user) => set({ isAuthenticated: true, user }),

      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    { name: "advantage-auth" }                  // ← localStorage key
  )
);

export default useAuthStore;