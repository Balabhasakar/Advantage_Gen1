import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, RefreshCw, ChevronLeft, Wand2,
  Copy, CheckCheck, Edit3, Download,
  Instagram, Linkedin, Smartphone, Square, Upload, X
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../../context/useAuthStore";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, ratio: "1:1"    },
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,  ratio: "1.91:1" },
  { id: "story",     label: "Story",     icon: Smartphone,ratio: "9:16"   },
  { id: "square",    label: "Square",    icon: Square,    ratio: "1:1"    },
];

const VOICE_STYLES = {
  professional:  { color: "text-blue-300",   bg: "bg-blue-500/10",   border: "border-blue-500/25",   label: "Professional"  },
  witty:         { color: "text-yellow-300", bg: "bg-yellow-500/10", border: "border-yellow-500/25", label: "Witty"         },
  urgent:        { color: "text-red-300",    bg: "bg-red-500/10",    border: "border-red-500/25",    label: "Urgent"        },
  inspirational: { color: "text-emerald-300",bg: "bg-emerald-500/10",border: "border-emerald-500/25",label: "Inspirational" },
};

const VARIANT_LABELS = {
  A: { name: "Variant A", desc: "Clean & Professional",   accent: "from-blue-500 to-violet-500"   },
  B: { name: "Variant B", desc: "Bold & Witty",           accent: "from-yellow-500 to-orange-500" },
  C: { name: "Variant C", desc: "Dramatic & Urgent",      accent: "from-red-500 to-pink-500"      },
  D: { name: "Variant D", desc: "Warm & Inspirational",   accent: "from-emerald-500 to-cyan-500"  },
};

export default function Variants() {
  const navigate = useNavigate();
  const location = useLocation();

  const [prompt,       setPrompt]       = useState(location.state?.prompt || "");
  const [platform,     setPlatform]     = useState(location.state?.platform || "instagram");
  const voice = location.state?.voice || "professional";
  const [ctaText,      setCtaText]      = useState(location.state?.ctaText   || "Shop Now");
  const [logoUrl,      setLogoUrl]      = useState(location.state?.logoUrl   || "");
  const [logoPreview,  setLogoPreview]  = useState(null);
  const [logoFile,     setLogoFile]     = useState(null);
  const [uploadingLogo,setUploadingLogo]= useState(false);
  const [loading,      setLoading]      = useState(false);
  const [variants,     setVariants]     = useState([]);
  const [copied,       setCopied]       = useState(null);
  const [selected,     setSelected]     = useState(null);

  /* ── Auto generate if coming from Dashboard ── */
  useEffect(() => {
    if (location.state?.prompt) {
      // Small delay so page renders first
      setTimeout(() => handleGenerate(), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Logo upload ── */
  const handleLogoUpload = async (file) => {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res  = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/upload-logo`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.logoUrl) { setLogoUrl(data.logoUrl); toast.success("Logo uploaded!"); }
    } catch { toast.error("Logo upload failed"); }
    finally  { setUploadingLogo(false); }
  };

  /* ── Generate variants ── */
  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first!");
    setLoading(true);
    setVariants([]);
    setSelected(null);
    try {
      const token = useAuthStore.getState().token;
      const res  = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/generate-variants`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ prompt, platform, ctaText, logoUrl, voice }),
      });
      const data = await res.json();
      console.log("Variants response:", JSON.stringify(data, null, 2));
      if (data.variants?.length) {
        setVariants(data.variants);
        // Check if images actually came back
        const withImages = data.variants.filter(v => v.imageUrl);
        console.log(`${withImages.length}/${data.variants.length} variants have images`);
        toast.success(`${data.variants.length} variants ready!`);
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch { toast.error("Server not reachable"); }
    finally  { setLoading(false); }
  };

  /* ── Copy caption ── */
  const handleCopy = (variant) => {
    const text = `${variant.caption}\n\n${variant.hashtags?.join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(variant.id);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  /* ── Save selected variant + open studio ── */
  const openInStudio = async (variant) => {
    try {
      // Save ONLY this selected variant to DB
      const saveToken = useAuthStore.getState().token;
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/save-ad`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${saveToken}` },
        body: JSON.stringify({
          prompt,
          imageUrl:  variant.imageUrl,
          caption:   variant.caption,
          hashtags:  variant.hashtags,
          headline:  variant.headline,
          voice:     variant.voice,
          platform,
        }),
      });
      toast.success("Saved to history!");
    } catch {
      // Don't block navigation if save fails
      console.warn("Save failed but continuing to studio");
    }
    navigate("/ad-studio", {
      state: {
        image: variant.imageUrl,
        copy:  { headline: variant.headline, caption: variant.caption, hashtags: variant.hashtags },
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#05060a] text-white">

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#08090f] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/8 transition">
            <ChevronLeft size={15} /> Dashboard
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            A/B Variant Generator
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
            3 voices · excluding {voice}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── INPUT SECTION ── */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="bg-white/4 border border-white/8 rounded-2xl p-6 mb-8">

          <h2 className="text-base font-semibold flex items-center gap-2 mb-5">
            <Wand2 size={16} className="text-violet-400" /> Configure Your Campaign
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Left — prompt + cta */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Ad Prompt</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  rows={4} placeholder='e.g. "Eco-friendly coffee cup in a rainy café"'
                  className="w-full p-4 bg-black/40 rounded-xl border border-white/10 outline-none
                    focus:border-violet-500 placeholder-gray-600 text-sm resize-none transition" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">CTA Text</label>
                <input value={ctaText} onChange={e => setCtaText(e.target.value)}
                  placeholder="Shop Now"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition" />
              </div>
            </div>

            {/* Right — platform + logo */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => {
                    const Icon = p.icon;
                    return (
                      <button key={p.id} onClick={() => setPlatform(p.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition text-left
                          ${platform === p.id
                            ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                            : "bg-white/4 border-white/8 text-gray-400 hover:bg-white/8"}`}>
                        <Icon size={13} className={platform === p.id ? "text-cyan-400" : ""} />
                        <div>
                          <p className="font-semibold">{p.label}</p>
                          <p className="text-[10px] text-gray-600">{p.ratio}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Brand Logo</label>
                {logoPreview ? (
                  <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded-xl">
                    <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white/5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{logoFile?.name}</p>
                      <p className="text-[10px] text-emerald-400">{uploadingLogo ? "Uploading..." : "✓ Ready"}</p>
                    </div>
                    <button onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoUrl(""); }}
                      className="text-gray-500 hover:text-red-400 transition">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-3 bg-black/40 border border-dashed border-white/15 rounded-xl cursor-pointer hover:border-violet-500/40 hover:bg-white/5 transition">
                    <Upload size={15} className="text-gray-500" />
                    <span className="text-sm text-gray-500">Upload logo (PNG/SVG)</span>
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden" onChange={e => e.target.files[0] && handleLogoUpload(e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={handleGenerate} disabled={loading}
            className="w-full mt-6 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2
              bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/25
              disabled:opacity-60 disabled:cursor-not-allowed transition-all">
            {loading
              ? <><RefreshCw size={15} className="animate-spin" /> Generating 3 variants...</>
              : <><Sparkles size={15} /> Generate 3 A/B Variants</>}
          </motion.button>

          {loading && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(["professional","witty","urgent","inspirational"].filter(v => v !== voice)).map((v, i) => (
                <motion.div key={v}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/4 border border-white/8">
                  <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin shrink-0" />
                  <span className="text-xs text-gray-400 capitalize">{["A","B","C"][i]} · {v}</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── VARIANTS GRID ── */}
        <AnimatePresence>
          {variants.length > 0 && (
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>

              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-200">
                  ✨ Your 3 Variants — Pick Your Winner
                </h2>
                {selected && (
                  <motion.button initial={{ opacity:0 }} animate={{ opacity:1 }}
                    onClick={() => openInStudio(variants.find(v => v.id === selected))}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                      bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg">
                    <Edit3 size={13} /> Edit Variant {selected} in Studio
                  </motion.button>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {variants.map((variant, i) => {
                  const meta    = VARIANT_LABELS[variant.id] || VARIANT_LABELS.A;
                  const vStyle  = VOICE_STYLES[variant.voice] || VOICE_STYLES.professional;
                  const isSelected = selected === variant.id;

                  return (
                    <motion.div key={variant.id}
                      initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setSelected(variant.id)}
                      className={`relative rounded-2xl border cursor-pointer transition-all duration-200
                        ${isSelected
                          ? "border-violet-400/60 shadow-xl shadow-violet-500/20 scale-[1.02]"
                          : "border-white/8 hover:border-white/20 hover:shadow-lg"}`}>

                      {/* Selected badge */}
                      {isSelected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10
                          px-3 py-1 rounded-full text-[10px] font-bold bg-violet-500 text-white shadow-lg">
                          ✓ Selected
                        </div>
                      )}

                      {/* Variant header */}
                      <div className={`rounded-t-2xl px-4 py-3 bg-gradient-to-r ${meta.accent} bg-opacity-20`}
                        style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))` }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{meta.name}</p>
                            <p className="text-[11px] text-gray-400">{meta.desc}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${vStyle.bg} ${vStyle.color} ${vStyle.border}`}>
                            {vStyle.label}
                          </span>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="bg-black/40" style={{ height: 220 }}>
                        {variant.imageUrl ? (
                          <img src={variant.imageUrl} alt={`Variant ${variant.id}`}
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                            Image failed
                          </div>
                        )}
                      </div>

                      {/* Caption */}
                      <div className="p-4 bg-[#0d0d14] rounded-b-2xl">
                        {variant.caption && (
                          <p className="text-xs text-gray-300 leading-relaxed mb-3 line-clamp-3">
                            {variant.caption}
                          </p>
                        )}

                        {/* Hashtags */}
                        {variant.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {variant.hashtags.slice(0, 4).map(tag => (
                              <span key={tag}
                                className="text-[10px] bg-violet-500/10 text-violet-300 border border-violet-500/15 px-1.5 py-0.5 rounded-full font-mono">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button onClick={e => { e.stopPropagation(); handleCopy(variant); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs
                              bg-white/5 border border-white/8 hover:bg-white/10 text-gray-400 hover:text-white transition">
                            {copied === variant.id
                              ? <><CheckCheck size={11} className="text-green-400" /> Copied!</>
                              : <><Copy size={11} /> Copy</>}
                          </button>
                          <button onClick={e => { e.stopPropagation(); openInStudio(variant); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs
                              bg-violet-500/15 border border-violet-500/25 hover:bg-violet-500/25 text-violet-300 transition">
                            <Edit3 size={11} /> Edit
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Winner CTA */}
              {selected && (
                <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                  className="mt-8 p-5 rounded-2xl border border-violet-500/25 bg-violet-500/8 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Variant {selected} selected as winner 🏆</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {VARIANT_LABELS[selected]?.desc} · {VOICE_STYLES[variants.find(v=>v.id===selected)?.voice]?.label} voice
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openInStudio(variants.find(v => v.id === selected))}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                        bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg">
                      <Edit3 size={13} /> Edit in Studio
                    </button>
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && variants.length === 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="text-center py-20 text-gray-600">
            <Sparkles size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No variants yet</p>
            <p className="text-sm">Enter a prompt above and generate 3 A/B versions in parallel</p>
          </motion.div>
        )}

      </div>
    </div>
  );
}