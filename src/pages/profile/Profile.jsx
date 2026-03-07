import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Mail, Calendar, ImageIcon, Zap, CreditCard,
  LogOut, Instagram, Linkedin, Smartphone, Square,
  Smile, Briefcase, AlertTriangle, Star, ChevronRight
} from "lucide-react";
import useAuthStore from "../../context/useAuthStore";
import toast from "react-hot-toast";

const VOICE_ICONS = {
  professional:  { icon: Briefcase,     color: "text-blue-400",    bg: "bg-blue-500/10"    },
  witty:         { icon: Smile,         color: "text-yellow-400",  bg: "bg-yellow-500/10"  },
  urgent:        { icon: AlertTriangle, color: "text-red-400",     bg: "bg-red-500/10"     },
  inspirational: { icon: Star,          color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

const PLATFORM_ICONS = {
  instagram: { icon: Instagram, color: "text-pink-400",   bg: "bg-pink-500/10"   },
  linkedin:  { icon: Linkedin,  color: "text-blue-400",   bg: "bg-blue-500/10"   },
  story:     { icon: Smartphone,color: "text-purple-400", bg: "bg-purple-500/10" },
  square:    { icon: Square,    color: "text-cyan-400",   bg: "bg-cyan-500/10"   },
};

export default function Profile() {
  const navigate          = useNavigate();
  const location          = useLocation();
  const { user, logout }  = useAuthStore();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:5000/api/profile/stats", {
      headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
    })
      .then(r => r.json())
      .then(data => {
        console.log("📊 Profile stats:", JSON.stringify(data, null, 2));
        setStats(data);
        setLoading(false);
      })
      .catch(e => { console.error("Profile fetch error:", e); setLoading(false); });
  }, [location.key]); // refetch every time page is visited

  const handleLogout = () => {
    logout();
    toast.success("Logged out!");
    navigate("/login");
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  });

  const creditPercent = stats ? (stats.stats.credits / stats.stats.maxCredits) * 100 : 0;
  const creditColor   = creditPercent > 50 ? "bg-emerald-500" : creditPercent > 20 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-[#05060a] text-white px-6 py-8 relative overflow-hidden">
      {/* Blobs */}
      <div className="absolute w-[400px] h-[400px] bg-violet-600 rounded-full blur-[120px] opacity-20 -top-20 -right-20" />
      <div className="absolute w-[300px] h-[300px] bg-cyan-500 rounded-full blur-[120px] opacity-15 bottom-10 left-10" />

      <div className="relative z-10 max-w-4xl mx-auto">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-8">
          <motion.h1 initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            My Profile
          </motion.h1>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
            <LogOut size={14} /> Logout
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── PROFILE CARD ── */}
            <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500
                  flex items-center justify-center text-2xl font-bold text-white shrink-0">
                  {(stats?.user?.name || user?.name || "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">
                    {stats?.user?.name || user?.name || "User"}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                    <Mail size={13} />
                    <span className="truncate">{stats?.user?.email || user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs mt-1">
                    <Calendar size={11} />
                    <span>Member since {stats?.user?.created_at ? formatDate(stats.user.created_at) : "—"}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold
                    bg-violet-500/15 text-violet-300 border border-violet-500/25">
                    Free Plan
                  </span>
                </div>
              </div>
            </motion.div>

            {/* ── STATS ROW ── */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Ads Generated", value: stats?.stats?.totalAds ?? 0,    icon: ImageIcon,   color: "text-violet-400", bg: "bg-violet-500/10" },
                { label: "Ad Copies",     value: stats?.stats?.totalAds ?? 0,    icon: Zap,         color: "text-cyan-400",   bg: "bg-cyan-500/10"   },
                { label: "Credits Left",  value: stats?.stats?.credits  ?? 100,  icon: CreditCard,  color: "text-emerald-400",bg: "bg-emerald-500/10"},
              ].map(({ label, value, icon: Icon, color, bg }, i) => (
                <motion.div key={label}
                  initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                    <Icon size={16} className={color} />
                  </div>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </motion.div>
              ))}
            </div>

            {/* ── CREDITS BAR ── */}
            <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <CreditCard size={14} className="text-emerald-400" /> Credits Usage
                </p>
                <span className="text-xs text-gray-400">
                  {stats?.stats?.credits ?? 100} / {stats?.stats?.maxCredits ?? 100} remaining
                </span>
              </div>
              <div className="h-2.5 bg-white/8 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${creditPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${creditColor}`} />
              </div>
              <p className="text-[11px] text-gray-600 mt-2">
                Each image generation uses 1 credit · Resets monthly
              </p>
            </motion.div>

            {/* ── VOICE + PLATFORM BREAKDOWN ── */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* By Voice */}
              <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                <p className="text-sm font-semibold text-white mb-4">Brand Voice Usage</p>
                {stats?.stats?.byVoice?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.stats.byVoice.map(({ voice, count }) => {
                      const cfg  = VOICE_ICONS[voice] || VOICE_ICONS.professional;
                      const Icon = cfg.icon;
                      const pct  = Math.round((count / stats.stats.totalAds) * 100);
                      return (
                        <div key={voice}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                                <Icon size={11} className={cfg.color} />
                              </div>
                              <span className="text-xs text-gray-300 capitalize">{voice}</span>
                            </div>
                            <span className="text-xs text-gray-500">{count} ads · {pct}%</span>
                          </div>
                          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${cfg.bg.replace("bg-","bg-").replace("/10","")}`}
                              style={{ width: `${pct}%`, background: "currentColor" }}
                              className={cfg.color} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 text-center py-4">No ads generated yet</p>
                )}
              </motion.div>

              {/* By Platform */}
              <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.4 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                <p className="text-sm font-semibold text-white mb-4">Platform Breakdown</p>
                {stats?.stats?.byPlatform?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.stats.byPlatform.map(({ platform, count }) => {
                      const cfg  = PLATFORM_ICONS[platform] || PLATFORM_ICONS.instagram;
                      const Icon = cfg.icon;
                      const pct  = Math.round((count / stats.stats.totalAds) * 100);
                      return (
                        <div key={platform} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                            <Icon size={14} className={cfg.color} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-gray-300 capitalize">{platform}</span>
                              <span className="text-xs text-gray-500">{count}</span>
                            </div>
                            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 text-center py-4">No ads generated yet</p>
                )}
              </motion.div>
            </div>

            {/* ── RECENT ADS ── */}
            {stats?.stats?.recentAds?.length > 0 && (
              <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.5 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-white">Recent Ads</p>
                  <button onClick={() => navigate("/history")}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition">
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {stats.stats.recentAds.map(ad => (
                    <motion.div key={ad.id} whileHover={{ scale: 1.03 }}
                      onClick={() => navigate("/history")}
                      className="rounded-xl overflow-hidden border border-white/8 cursor-pointer group">
                      <div className="h-24 bg-white/5 overflow-hidden">
                        {ad.image_url
                          ? <img src={ad.image_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={20} className="text-gray-600" /></div>
                        }
                      </div>
                      {ad.headline && (
                        <div className="px-2 py-1.5 bg-[#0d0d14]">
                          <p className="text-[10px] text-gray-300 truncate font-medium">{ad.headline}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}