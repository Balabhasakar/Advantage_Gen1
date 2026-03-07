import React, { useState, useEffect } from "react";
import useAuthStore from "../../context/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Image as ImageIcon, FileText, CreditCard,
  Wand2, Copy, CheckCheck, ChevronRight, Zap, RefreshCw,
  Instagram, Linkedin, Smartphone, Square, Upload, X, Layers
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

/* ── Background Blob ── */
const Blob = ({ className }) => (
  <div className={`absolute rounded-full blur-[120px] opacity-30 animate-pulse ${className}`} />
);

/* ── Glass Card ── */
const Card = ({ children, className = "" }) => (
  <motion.div
    whileHover={{ y: -3 }}
    transition={{ type: "spring", stiffness: 200 }}
    className={`bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl
    hover:border-violet-400/30 hover:shadow-lg hover:shadow-violet-500/10 transition-all ${className}`}
  >
    {children}
  </motion.div>
);

/* ── Brand Voice Options ── */
const VOICES = [
  { id: "witty",         label: "Witty",         emoji: "😄", desc: "Clever & fun"       },
  { id: "professional",  label: "Professional",   emoji: "💼", desc: "Clean & polished"   },
  { id: "urgent",        label: "Urgent",         emoji: "⚡", desc: "FOMO-driven"        },
  { id: "inspirational", label: "Inspirational",  emoji: "🌟", desc: "Uplifting & bold"   },
];

/* ── Platform Presets ── */
const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, size: "1080×1080", ratio: "1:1",      w: 500, h: 500  },
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,  size: "1200×628",  ratio: "1.91:1",   w: 500, h: 262  },
  { id: "story",     label: "Story",     icon: Smartphone,size: "1080×1920", ratio: "9:16",     w: 281, h: 500  },
  { id: "square",    label: "Square",    icon: Square,    size: "800×800",   ratio: "1:1",      w: 500, h: 500  },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const getAuth = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${useAuthStore.getState().token}` });
  const navigate   = useNavigate();

  /* generation state */
  const [prompt,       setPrompt]       = useState("");
  const [voice,        setVoice]        = useState("professional");
  const [platform,     setPlatform]     = useState("instagram");
  const [loadingImg,   setLoadingImg]   = useState(false);
  const [loadingCopy,  setLoadingCopy]  = useState(false);
  const [headline,     setHeadline]     = useState("");
  const [generatedImg, setGeneratedImg] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("lastImg")) || null; } catch { return null; }
  });
  const [adCopy, setAdCopy] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("lastCopy")) || null; } catch { return null; }
  });
  const [copied,       setCopied]       = useState(false);
  const [recentAds,    setRecentAds]    = useState([]);
  const [totalAds,     setTotalAds]     = useState(0);
  const [credits,      setCredits]      = useState(100);
  const [ctaText,      setCtaText]      = useState("Shop Now");
  const [logoUrl,      setLogoUrl]      = useState("");
  const [logoFile,     setLogoFile]     = useState(null);
  const [logoPreview,  setLogoPreview]  = useState(null);
  const [uploadingLogo,setUploadingLogo]= useState(false);

  /* Clear preview on fresh mount (after login) */
  useEffect(() => {
    const storedUser = sessionStorage.getItem("previewUser");
    const currentUser = user?.email || user?.name || "guest";
    if (storedUser !== currentUser) {
      // Different user — clear old preview
      sessionStorage.removeItem("lastImg");
      sessionStorage.removeItem("lastCopy");
      sessionStorage.setItem("previewUser", currentUser);
    }
  }, [user]);

  /* fetch recent ads */
  useEffect(() => {
    fetch("http://localhost:5000/api/ads", {
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` }
      })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setTotalAds(d.length);
          setCredits(Math.max(0, 100 - d.length));
          setRecentAds(d.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  /* ── MAIN GENERATE (parallel image + copy + composite) ── */
  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error("Describe your ad first!");

    setLoadingImg(true);
    setLoadingCopy(true);
    setGeneratedImg(null);
    setAdCopy(null);

    try {
      const res  = await fetch("http://localhost:5000/api/generate-all", {
        method: "POST",
        headers: getAuth(),
        body: JSON.stringify({ prompt, voice, platform, ctaText, logoUrl }),
      });
      const data = await res.json();

      if (data.imageUrl) {
        setGeneratedImg(data.imageUrl);
        sessionStorage.setItem("lastImg", JSON.stringify(data.imageUrl));
      } else {
        toast.error("Image generation failed");
      }

      if (data.caption) {
        const copy = { headline: data.headline, caption: data.caption, hashtags: data.hashtags };
        setAdCopy(copy);
        setHeadline(data.headline || "");
        sessionStorage.setItem("lastCopy", JSON.stringify(copy));
      }
    } catch {
      toast.error("Server not reachable");
    } finally {
      setLoadingImg(false);
      setLoadingCopy(false);
    }
  };

  /* copy caption to clipboard */
  const handleCopyCopy = () => {
    if (!adCopy) return;
    const text = `${adCopy.caption}\n\n${adCopy.hashtags.join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  /* upload logo */
  const handleLogoUpload = async (file) => {
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res  = await fetch("http://localhost:5000/api/upload-logo", { method: "POST", body: formData });
      const data = await res.json();
      if (data.logoUrl) { setLogoUrl(data.logoUrl); toast.success("Logo uploaded!"); }
      else toast.error("Logo upload failed");
    } catch { toast.error("Server not reachable"); }
    finally { setUploadingLogo(false); }
  };

  const removeLogo = () => { setLogoFile(null); setLogoPreview(null); setLogoUrl(""); };

  /* go to studio */
  const goToStudio = () => {
    if (!generatedImg) return toast.error("Generate an image first!");
    const p = PLATFORMS.find(pl => pl.id === platform);
    navigate("/ad-studio", {
      state: {
        image: generatedImg,
        copy:  { ...adCopy, headline },
        platform: { id: p.id, label: p.label, size: p.size, ratio: p.ratio, w: p.w, h: p.h },
      },
    });
  };

  const selectedPlatform = PLATFORMS.find(p => p.id === platform);
  const isGenerating     = loadingImg || loadingCopy;

  return (
    <div className="relative min-h-screen bg-[#05060a] text-white px-6 py-8 overflow-hidden">
      <Blob className="w-[420px] h-[420px] bg-violet-600 -top-20 -left-20" />
      <Blob className="w-[360px] h-[360px] bg-cyan-500 bottom-10 right-10" />

      {/* ── HEADER ── */}
      <div className="relative z-10 mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          AdVantage Gen
        </motion.h1>
        <p className="text-gray-400 mt-2 text-sm">
          Welcome back, <span className="text-white font-medium">{user?.name || "Marketer"}</span> 👋
        </p>
      </div>

      {/* ── STATS ── */}
      <div className="relative z-10 grid md:grid-cols-3 gap-5 mb-10">
        {[
          { icon: ImageIcon,  label: "Images Generated", value: totalAds,  color: "text-violet-400" },
          { icon: FileText,   label: "Ad Copies",        value: totalAds,  color: "text-cyan-400"   },
          { icon: CreditCard, label: "Credits Left",     value: credits,   color: "text-emerald-400"},
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="p-5">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
              <Icon size={13} /> {label}
            </p>
          </Card>
        ))}
      </div>

      {/* ── MAIN GENERATOR ── */}
      <div className="relative z-10 grid lg:grid-cols-2 gap-6 mb-10">

        {/* LEFT — inputs */}
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2 text-base">
            <Wand2 size={16} className="text-violet-400" /> Create Campaign
          </h2>

          {/* Prompt */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Ad Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder='e.g. "Eco-friendly coffee cup in a rainy café, sustainability focus"'
              className="w-full h-28 p-4 bg-black/40 rounded-xl border border-white/10 outline-none
              focus:border-violet-400 transition-all text-sm placeholder-gray-600 resize-none"
            />
          </div>

          {/* Brand Voice */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Brand Voice</label>
            <div className="grid grid-cols-2 gap-2">
              {VOICES.map(v => (
                <button key={v.id} onClick={() => setVoice(v.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all text-left
                    ${voice === v.id
                      ? "bg-violet-500/20 border-violet-500/50 text-white shadow-lg shadow-violet-500/10"
                      : "bg-white/4 border-white/8 text-gray-400 hover:bg-white/8 hover:text-white hover:border-white/15"
                    }`}>
                  <span className="text-lg leading-none">{v.emoji}</span>
                  <div>
                    <p className="font-semibold text-xs leading-none mb-0.5">{v.label}</p>
                    <p className="text-[10px] text-gray-500">{v.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Platform Format</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => {
                const Icon = p.icon;
                return (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all text-left
                      ${platform === p.id
                        ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                        : "bg-white/4 border-white/8 text-gray-400 hover:bg-white/8 hover:text-white"
                      }`}>
                    <Icon size={14} className={platform === p.id ? "text-cyan-400" : ""} />
                    <div>
                      <p className="font-semibold leading-none mb-0.5">{p.label}</p>
                      <p className="text-[10px] text-gray-600">{p.ratio} · {p.size}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA Badge Text */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">
              CTA Button Text <span className="text-gray-600 normal-case">(overlaid on image)</span>
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={e => setCtaText(e.target.value)}
              placeholder="e.g. Shop Now, Learn More, Get Started"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 placeholder-gray-600 transition"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">
              Brand Logo <span className="text-gray-600 normal-case">(overlaid bottom-right)</span>
            </label>
            {logoPreview ? (
              <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded-xl">
                <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white/5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{logoFile?.name}</p>
                  <p className="text-[10px] text-emerald-400">{uploadingLogo ? "Uploading..." : "✓ Ready"}</p>
                </div>
                <button onClick={removeLogo} className="text-gray-500 hover:text-red-400 transition">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 bg-black/40 border border-dashed border-white/15 rounded-xl cursor-pointer hover:border-violet-500/40 hover:bg-white/5 transition">
                <Upload size={16} className="text-gray-500" />
                <span className="text-sm text-gray-500">Click to upload logo (PNG/SVG)</span>
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden" onChange={e => e.target.files[0] && handleLogoUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Generate button */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2
            bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/25
            disabled:opacity-60 disabled:cursor-not-allowed transition-all">
            {isGenerating
              ? <><RefreshCw size={15} className="animate-spin" /> Generating...</>
              : <><Sparkles size={15} /> Generate Image + Copy</>
            }
          </motion.button>
        </Card>

        {/* RIGHT — preview + copy output */}
        <div className="space-y-4">

          {/* Image Preview */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider">Preview</label>
              {selectedPlatform && (
                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  {selectedPlatform.label} · {selectedPlatform.ratio}
                </span>
              )}
            </div>

            <div className="rounded-xl bg-black/40 border border-white/8 overflow-hidden flex items-center justify-center"
              style={{ height: "180px" }}>
              <AnimatePresence mode="wait">
                {loadingImg ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-500">Generating image...</p>
                  </motion.div>
                ) : generatedImg ? (
                  <motion.img key="img" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    src={generatedImg} alt="Generated" className="w-full h-full object-contain" />
                ) : (
                  <motion.div key="empty" className="flex flex-col items-center gap-2 text-gray-600">
                    <ImageIcon size={28} />
                    <p className="text-xs">Preview appears here</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {generatedImg && (
              <div className="flex gap-2 mt-3">
                <motion.button
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={goToStudio}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                  bg-white/8 border border-white/10 hover:bg-white/14 hover:border-violet-400/30 transition-all">
                  Edit in Studio <ChevronRight size={14} />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/variants", { state: { prompt, voice, platform, ctaText, logoUrl } })}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                  bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-violet-300 transition-all">
                  <Layers size={14} /> A/B Variants
                </motion.button>
              </div>
            )}
          </Card>

          {/* AI Copy Output */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={11} /> AI Copy
              </label>
              {adCopy && (
                <button onClick={handleCopyCopy}
                  className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/8">
                  {copied ? <><CheckCheck size={12} className="text-green-400" /> Copied!</> : <><Copy size={12} /> Copy all</>}
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {loadingCopy ? (
                <motion.div key="loading-copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-2">
                  {[80, 60, 90, 40].map((w, i) => (
                    <div key={i} className="h-3 rounded-full bg-white/8 animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </motion.div>
              ) : adCopy ? (
                <motion.div key="copy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  {adCopy.headline && (
                    <p className="text-base font-bold text-white mb-2">{adCopy.headline}</p>
                  )}
                  <p className="text-sm text-gray-200 leading-relaxed mb-3">{adCopy.caption}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {adCopy.hashtags.map(tag => (
                      <span key={tag}
                        className="text-[11px] bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-600">
                    <Zap size={10} className="text-yellow-500" />
                    Voice: <span className="text-gray-400 capitalize">{voice}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty-copy" className="flex flex-col items-center gap-2 text-gray-600 py-4">
                  <FileText size={24} />
                  <p className="text-xs text-center">AI caption & hashtags will appear here after generation</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>

      {/* ── RECENT WORK ── */}
      {recentAds.length > 0 && (
        <div className="relative z-10">
          <h3 className="font-semibold mb-4 text-sm text-gray-300">Recent Campaigns</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {recentAds.map((ad, i) => (
              <motion.div key={i} whileHover={{ scale: 1.05 }}
                className="aspect-square rounded-xl bg-white/5 border border-white/8 overflow-hidden cursor-pointer"
                onClick={() => navigate("/ad-studio", { state: { image: ad.image_url, copy: { caption: ad.caption, hashtags: ad.hashtags } } })}>
                <img src={ad.image_url} alt="Recent" className="w-full h-full object-cover opacity-70 hover:opacity-100 transition" />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}