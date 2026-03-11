import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trash2, Wand2, Copy, CheckCheck, Clock, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

export default function History() {
  const navigate = useNavigate();
  const [ads,     setAds]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(null);

  /* ── fetch ads ── */
  useEffect(() => {
    api.get("/api/ads")
      .then(r => { setAds(r.data); setLoading(false); })
      .catch(() => { toast.error("Could not load history"); setLoading(false); });
  }, []);

  /* ── delete ad ── */
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/ads/${id}`);
      setAds(prev => prev.filter(a => a.id !== id));
      toast.success("Deleted!");
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── copy caption ── */
  const handleCopy = (ad) => {
    const text = `${ad.caption}\n\n${ad.hashtags?.join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(ad.id);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  /* ── format date ── */
  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const VOICE_COLORS = {
    witty:         "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    professional:  "bg-blue-500/10 text-blue-300 border-blue-500/20",
    urgent:        "bg-red-500/10 text-red-300 border-red-500/20",
    inspirational: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  };

  return (
    <div className="min-h-screen bg-[#05060a] text-white px-6 py-10">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Campaign History
        </motion.h1>
        <p className="mt-2 text-sm text-gray-400">
          {ads.length} campaign{ads.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      <div className="max-w-6xl mx-auto">

        {/* LOADING */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-white/5" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-white/8 rounded-full w-3/4" />
                  <div className="h-3 bg-white/8 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && ads.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon size={28} className="text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No campaigns yet</h2>
            <p className="text-sm text-gray-500 mb-6">Generate your first ad to see it here.</p>
            <button onClick={() => navigate("/dashboard")}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-cyan-500">
              Create Campaign →
            </button>
          </motion.div>
        )}

        {/* ADS GRID */}
        {!loading && ads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {ads.map((ad, i) => (
                <motion.div
                  key={ad.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden hover:border-violet-400/30 hover:shadow-lg hover:shadow-violet-500/10 transition-all group"
                >
                  {/* IMAGE */}
                  <div className="relative h-48 overflow-hidden bg-black/40 cursor-pointer"
                    onClick={() => navigate("/ad-studio", { state: { image: ad.image_url, copy: { headline: ad.headline, caption: ad.caption, hashtags: ad.hashtags } } })}>
                    <img src={ad.image_url} alt="Ad"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-center pb-3">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Wand2 size={12} /> Edit in Studio
                      </span>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="p-4">

                    {/* Meta row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Clock size={11} />
                        {formatDate(ad.created_at)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {ad.voice && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize
                            ${VOICE_COLORS[ad.voice] || VOICE_COLORS.professional}`}>
                            {ad.voice}
                          </span>
                        )}
                        {ad.platform && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-cyan-500/10 text-cyan-300 border-cyan-500/20 capitalize">
                            {ad.platform}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prompt */}
                    <p className="text-xs text-gray-500 mb-2 truncate">
                      🔮 {ad.prompt}
                    </p>

                    {/* Caption */}
                    {ad.caption && (
                      <p className="text-xs text-gray-300 leading-relaxed mb-3 line-clamp-2">
                        {ad.caption}
                      </p>
                    )}
                    {!ad.caption && (
                      <p className="text-xs text-gray-600 italic mb-3">No caption saved</p>
                    )}

                    {/* Hashtags — handle both array and PostgreSQL string format */}
                    {(() => {
                      // PostgreSQL may return {#tag1,#tag2} as string — parse it
                      let tags = ad.hashtags;
                      if (typeof tags === "string") {
                        tags = tags.replace(/[{}]/g, "").split(",").filter(Boolean);
                      }
                      if (!tags || tags.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {tags.slice(0, 4).map(tag => (
                            <span key={tag}
                              className="text-[10px] bg-violet-500/10 text-violet-300 border border-violet-500/15 px-1.5 py-0.5 rounded-full font-mono">
                              {tag}
                            </span>
                          ))}
                          {tags.length > 4 && (
                            <span className="text-[10px] text-gray-600">+{tags.length - 4} more</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => navigate("/ad-studio", { state: { image: ad.image_url, copy: { headline: ad.headline, caption: ad.caption, hashtags: ad.hashtags } } })}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/25 hover:from-violet-500/35 hover:to-cyan-500/35 flex items-center justify-center gap-1.5 transition">
                        <Wand2 size={12} /> Edit
                      </button>
                      <button onClick={() => handleCopy(ad)}
                        className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/8 hover:bg-white/10 flex items-center gap-1.5 text-gray-300 transition">
                        {copied === ad.id ? <CheckCheck size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                      <button onClick={() => handleDelete(ad.id)}
                        className="px-3 py-2 rounded-lg text-xs bg-red-500/8 border border-red-500/15 hover:bg-red-500/20 text-red-400 transition">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}