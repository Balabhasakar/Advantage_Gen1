import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wand2,
  History,
  User,
  LogOut,
} from "lucide-react";
import useAuthStore from "../context/useAuthStore";

export default function Navbar() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout(); // clears token + localStorage + zustand state
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `relative flex items-center gap-2 px-4 py-2 rounded-lg
     text-sm font-medium transition-all duration-300
     ${
       isActive
         ? "text-white bg-gradient-to-r from-violet-500/40 to-cyan-500/40 shadow-sm"
         : "text-gray-400 hover:text-white hover:bg-white/10"
     }`;

  return (
    <nav
      className="w-full border-b border-white/10
      bg-gradient-to-r from-[#05060a] via-[#0c0f1a] to-[#05060a]
      px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* NAV LINKS */}
        <div className="flex items-center gap-2">
          <NavLink to="/dashboard" className={linkClass}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>

          <NavLink to="/ad-studio" className={linkClass}>
            <Wand2 size={16} />
            Ad Studio
          </NavLink>

          <NavLink to="/history" className={linkClass}>
            <History size={16} />
            History
          </NavLink>

          <NavLink to="/profile" className={linkClass}>
            <User size={16} />
            Profile
          </NavLink>
        </div>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
          text-sm font-medium
          text-red-400
          bg-gradient-to-r from-red-500/10 to-pink-500/10
          border border-red-500/20
          hover:text-white
          hover:bg-gradient-to-r hover:from-red-500/30 hover:to-pink-500/30
          transition-all duration-300"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </nav>
  );
}