import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, RefreshCw, Download, Type, Trash2,
  ChevronLeft, Copy, Bold, Italic, AlignCenter,
  AlignLeft, AlignRight, Plus
} from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ["#ffffff","#000000","#a78bfa","#06b6d4","#f59e0b","#10b981","#ef4444","#f472b6"];

const TEMPLATES = [
  { headline: "Shop Now →",      caption: "Limited time offer. Don't miss out!" },
  { headline: "Built Different.", caption: "Premium quality you can feel." },
  { headline: "Get Started Free", caption: "No credit card required. Cancel anytime." },
  { headline: "DON'T MISS OUT",   caption: "Offer ends tonight at midnight." },
];

export default function AdStudio() {
  const location = useLocation();
  const navigate = useNavigate();

  const previewRef = useRef(null);

  const [loading,   setLoading]   = useState(false);
  const [prompt,    setPrompt]    = useState("");
  const [imageUrl,  setImageUrl]  = useState(location.state?.image || null);

  // Text state
  const [headline,      setHeadline]      = useState("Your Headline Here");
  const [caption,       setCaption]       = useState(location.state?.copy?.caption || "Your caption goes here.");
  const [hashtags, setHashtags] = useState(() => {
    let tags = location.state?.copy?.hashtags;
    if (!tags) return "#YourBrand  #AdVantageGen";
    // Handle PostgreSQL string format {#tag1,#tag2}
    if (typeof tags === "string") tags = tags.replace(/[{}]/g, "").split(",").filter(Boolean);
    return Array.isArray(tags) ? tags.slice(0, 4).join("  ") : "#YourBrand  #AdVantageGen";
  });
  const [headlineSize,  setHeadlineSize]  = useState(32);
  const [captionSize,   setCaptionSize]   = useState(14);
  const [headlineColor, setHeadlineColor] = useState("#ffffff");
  const [captionColor,  setCaptionColor]  = useState("rgba(210,210,230,0.9)");
  const [textAlign,     setTextAlign]     = useState("center");
  const [activePanel,   setActivePanel]   = useState("text");

  // Overlay
  const OVERLAYS = [
    { label: "None",   value: "transparent" },
    { label: "Dark",   value: "rgba(0,0,0,0.45)" },
    { label: "Violet", value: "rgba(109,40,217,0.45)" },
    { label: "Cyan",   value: "rgba(6,182,212,0.30)" },
    { label: "Gold",   value: "rgba(245,158,11,0.35)" },
  ];
  const [overlay, setOverlay] = useState("transparent");

  /* ── Regenerate image ── */
  const handleRegenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first!");
    setLoading(true);
    try {
      const res  = await fetch("http://localhost:5000/api/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.imageUrl) { setImageUrl(data.imageUrl); toast.success("Image updated!"); }
    } catch { toast.error("Server not reachable"); }
    finally  { setLoading(false); }
  };

  /* ── Download using html2canvas ── */
  const handleDownload = async () => {
    try {
      toast.loading("Preparing download...");
      const { default: html2canvas } = await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js");
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, allowTaint: true });
      toast.dismiss();
      const link = document.createElement("a");
      link.download = "advantage-ad.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Downloaded!");
    } catch (e) {
      toast.dismiss();
      console.error(e);
      // Fallback: just download the preview as screenshot
      toast.error("Use browser screenshot as fallback");
    }
  };

  /* ── Copy to clipboard ── */
  const handleCopy = async () => {
    try {
      toast.loading("Copying...");
      const { default: html2canvas } = await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js");
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, allowTaint: true });
      toast.dismiss();
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Copied to clipboard!");
    } catch { toast.dismiss(); toast.error("Copy failed"); }
  };

  const alignClass = textAlign === "center" ? "text-center" : textAlign === "right" ? "text-right" : "text-left";

  return (
    <div className="h-screen bg-[#05060a] text-white flex flex-col overflow-hidden">

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/8 bg-[#08090f] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/8 transition">
            <ChevronLeft size={15} /> Dashboard
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm font-semibold text-violet-300">Ad Studio</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
            imageUrl ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                     : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
            {imageUrl ? "✓ Image Connected" : "No Image"}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white/6 border border-white/10 text-gray-300 hover:bg-white/12 transition">
            <Copy size={14} /> Copy
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg">
            <Download size={14} /> Download PNG
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT PANEL */}
        <div className="w-[220px] shrink-0 border-r border-white/8 bg-[#07080e] overflow-y-auto p-4">

          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-4 gap-1">
            {[["text","Text"],["style","Style"],["tmpl","Tmpl"]].map(([id, lbl]) => (
              <button key={id} onClick={() => setActivePanel(id)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition
                  ${activePanel === id ? "bg-violet-500/30 text-violet-300" : "text-gray-500 hover:text-gray-300"}`}>
                {lbl}
              </button>
            ))}
          </div>

          {activePanel === "text" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Headline</p>
              <input value={headline} onChange={e => setHeadline(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-violet-500 transition" />

              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Caption</p>
              <textarea value={caption} onChange={e => setCaption(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm mb-3 h-20 resize-none outline-none focus:border-violet-500 transition" />

              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Hashtags</p>
              <input value={hashtags} onChange={e => setHashtags(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-violet-500 transition" />

              <div className="h-px bg-white/10 my-3" />

              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Headline Size</p>
              <div className="flex items-center gap-2 mb-3">
                <input type="range" min={18} max={60} value={headlineSize}
                  onChange={e => setHeadlineSize(+e.target.value)}
                  className="flex-1 h-1 accent-violet-500 cursor-pointer" />
                <span className="text-xs text-gray-400 font-mono w-7">{headlineSize}</span>
              </div>

              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Alignment</p>
              <div className="flex gap-1.5 mb-3">
                {[["left", <AlignLeft size={12}/>],["center",<AlignCenter size={12}/>],["right",<AlignRight size={12}/>]].map(([a, icon]) => (
                  <button key={a} onClick={() => setTextAlign(a)}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center transition
                      ${textAlign === a ? "bg-violet-500/25 text-violet-300 border border-violet-500/40" : "bg-white/5 text-gray-500 border border-white/8 hover:bg-white/10"}`}>
                    {icon}
                  </button>
                ))}
              </div>

              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Headline Color</p>
              <div className="grid grid-cols-4 gap-1.5 mb-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setHeadlineColor(c)}
                    style={{ background: c }}
                    className={`h-7 rounded-lg border-2 transition hover:scale-110 ${headlineColor === c ? "border-white" : "border-transparent"}`} />
                ))}
              </div>
            </div>
          )}

          {activePanel === "style" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Image Overlay</p>
              <div className="space-y-1.5 mb-4">
                {OVERLAYS.map(o => (
                  <button key={o.label} onClick={() => setOverlay(o.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm text-left transition
                      ${overlay === o.value ? "border-violet-500/40 bg-violet-500/15 text-white" : "border-white/8 bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                    <div className="w-5 h-5 rounded shrink-0 border border-white/20"
                      style={{ background: o.value === "transparent" ? "rgba(255,255,255,0.05)" : o.value }} />
                    {o.label}
                  </button>
                ))}
              </div>

              <div className="h-px bg-white/10 my-3" />

              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Regenerate Image</p>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="Describe new image..."
                className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm h-20 resize-none outline-none focus:border-violet-500 placeholder-gray-600 transition" />
              <button onClick={handleRegenerate} disabled={loading}
                className="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/35 transition">
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading ? "Generating..." : "Regenerate"}
              </button>
            </div>
          )}

          {activePanel === "tmpl" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Quick Templates</p>
              <div className="space-y-2">
                {TEMPLATES.map((tpl, i) => (
                  <button key={i} onClick={() => { setHeadline(tpl.headline); setCaption(tpl.caption); }}
                    className="w-full text-left px-3 py-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-violet-500/30 transition">
                    <p className="text-xs font-bold text-violet-300 mb-1 truncate">{tpl.headline}</p>
                    <p className="text-[10px] text-gray-500 truncate">{tpl.caption}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── PREVIEW CENTER ── */}
        <div className="flex-1 bg-[#05060a] overflow-auto flex items-center justify-center p-8">
          <div className="relative">
            {/* glow effect */}
            <div className="absolute -inset-6 bg-gradient-to-b from-violet-600/20 to-cyan-500/10 blur-3xl rounded-3xl pointer-events-none -z-10" />

            {/* ✅ THE AD PREVIEW — pure HTML/CSS, no Fabric, no clipping */}
            <div
              ref={previewRef}
              style={{ width: 500 }}
              className="rounded-2xl overflow-hidden shadow-2xl border border-white/15"
            >
              {/* IMAGE ZONE */}
              <div className="relative" style={{ height: 320 }}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Ad"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1a1a2e] flex items-center justify-center">
                    <p className="text-gray-600 text-sm">Generate an image first</p>
                  </div>
                )}
                {/* overlay */}
                {overlay !== "transparent" && (
                  <div className="absolute inset-0" style={{ background: overlay }} />
                )}
              </div>

              {/* DIVIDER */}
              <div style={{ height: 3, background: "#7c3aed" }} />

              {/* TEXT ZONE */}
              <div className="bg-[#0d0d16] px-6 py-5" style={{ minHeight: 220 }}>
                {/* Headline */}
                <p
                  className={`font-bold leading-tight mb-3 ${alignClass}`}
                  style={{ fontSize: headlineSize, color: headlineColor }}
                >
                  {headline}
                </p>

                {/* Caption */}
                <p
                  className={`leading-relaxed mb-4 ${alignClass}`}
                  style={{ fontSize: captionSize, color: captionColor }}
                >
                  {caption}
                </p>

                {/* Hashtags */}
                <p className={`text-[11px] text-violet-400 ${alignClass}`}>
                  {hashtags}
                </p>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-gray-600 font-mono">
              500px wide · exports at 2× (1000px)
            </p>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[160px] shrink-0 border-l border-white/8 bg-[#07080e] p-4 flex flex-col gap-3 overflow-y-auto">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Export</p>
            <button onClick={handleDownload}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center gap-2 mb-2 shadow-lg">
              <Download size={14} /> PNG (2×)
            </button>
            <button onClick={handleCopy}
              className="w-full py-2 rounded-xl text-sm bg-white/5 border border-white/8 text-gray-300 hover:bg-white/10 flex items-center justify-center gap-2 transition">
              <Copy size={13} /> Copy
            </button>
          </div>

          <div className="h-px bg-white/10" />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Canvas Info</p>
            <div className="space-y-1.5 text-[11px]">
              {[["Width","500px"],["Image","320px"],["Text","220px"],["Format","PNG"]].map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-600">{k}</span>
                  <span className="text-gray-300 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Tips</p>
            <ul className="text-[10px] text-gray-600 space-y-1.5 leading-relaxed">
              <li>• Edit text directly in left panel</li>
              <li>• Try overlays for contrast</li>
              <li>• Use templates for quick start</li>
              <li>• Download exports at 2×</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}