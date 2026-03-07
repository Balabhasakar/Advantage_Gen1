import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      user:  null,
      token: null,

      login: (user, token) => {
        sessionStorage.removeItem("lastImg");
        sessionStorage.removeItem("lastCopy");
        if (token) localStorage.setItem("token", token);
        set({ isAuthenticated: true, user, token });
      },

      logout: () => {
        sessionStorage.removeItem("lastImg");
        sessionStorage.removeItem("lastCopy");
        sessionStorage.removeItem("previewUser");
        localStorage.removeItem("token");
        set({ isAuthenticated: false, user: null, token: null });
      },
    }),
    { name: "advantage-auth" }
  )
);

export default useAuthStore;