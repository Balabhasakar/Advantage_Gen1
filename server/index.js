const express  = require("express");
const cloudinary = require("cloudinary").v2;
const cors     = require("cors");
const axios    = require("axios");
const Groq     = require("groq-sdk");
const { Pool } = require("pg");
const sharp    = require("sharp");
const multer   = require("multer");
const path     = require("path");
require("dotenv").config();

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(cors());

/* ─────────────────────────────────────────
   MULTER — logo uploads (memory storage)
───────────────────────────────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    cb(null, allowed.includes(file.mimetype));
  },
});

/* ─────────────────────────────────────────
   CLOUDINARY
───────────────────────────────────────── */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ─────────────────────────────────────────
   GROQ
───────────────────────────────────────── */
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function askGroq(prompt) {
  const completion = await groq.chat.completions.create({
    model:       "llama-3.3-70b-versatile",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens:  512,
  });
  return completion.choices[0].message.content.trim();
}

/* ─────────────────────────────────────────
   POSTGRESQL
───────────────────────────────────────── */
const pool = new Pool({
  host:     process.env.PG_HOST     || "localhost",
  port:     process.env.PG_PORT     || 5432,
  database: process.env.PG_DATABASE || "advantage_gen",
  user:     process.env.PG_USER     || "postgres",
  password: process.env.PG_PASSWORD,
});

pool.connect()
  .then(() => console.log("🐘 PostgreSQL connected!"))
  .catch(err => console.error("❌ PostgreSQL connection failed:", err.message));

/* ─────────────────────────────────────────
   PLATFORM DIMENSIONS
───────────────────────────────────────── */
const PLATFORMS = {
  instagram: { w: 1080, h: 1080, label: "Instagram Square"   },
  linkedin:  { w: 1200, h: 628,  label: "LinkedIn Banner"    },
  story:     { w: 1080, h: 1920, label: "Story / Reels 9:16" },
  twitter:   { w: 1200, h: 675,  label: "Twitter / X"        },
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
async function enhancePrompt(userPrompt) {
  try {
    return await askGroq(
      `You are an expert AI image prompt engineer.
       Rewrite this short prompt into a highly detailed, visually rich description 
       optimized for an AI image generator like FLUX.
       Focus on: lighting, mood, color palette, composition, style, atmosphere.
       Keep it under 120 words. Return ONLY the enhanced prompt, nothing else.
       User prompt: "${userPrompt}"`
    );
  } catch (err) {
    console.log("⚠️  Prompt enhancement failed, using original");
    return userPrompt;
  }
}

const VOICE_PROMPTS = {
  witty:         "You are a witty, clever copywriter. Use wordplay, humor, and unexpected angles.",
  professional:  "You are a professional B2B copywriter. Focus on value, credibility, and clear benefits.",
  urgent:        "You are a direct-response copywriter. Use power words, time pressure, and strong CTAs.",
  inspirational: "You are an inspirational brand copywriter. Write uplifting, emotionally resonant copy.",
};

/* ─────────────────────────────────────────
   SHARP COMPOSITING PIPELINE
   Resizes image to platform dims,
   overlays logo (bottom-right) + CTA badge
───────────────────────────────────────── */
async function compositeImage({ imageBuffer, platform = "instagram", logoBuffer = null, ctaText = null }) {
  const dims   = PLATFORMS[platform] || PLATFORMS.instagram;
  const { w, h } = dims;

  console.log(`🖼️  Compositing for ${platform} (${w}×${h})...`);

  // Step 1: Resize base image to platform dimensions (cover crop)
  let pipeline = sharp(imageBuffer)
    .resize(w, h, { fit: "cover", position: "centre" });

  const compositeOps = [];

  // Step 2: CTA Badge (bottom-left)
  if (ctaText && ctaText.trim()) {
    const badgeW    = Math.min(320, Math.floor(w * 0.35));
    const badgeH    = Math.floor(h * 0.07);
    const fontSize  = Math.floor(badgeH * 0.42);
    const padding   = Math.floor(badgeH * 0.25);

    // SVG badge with gradient background
    const ctaSvg = `
      <svg width="${badgeW}" height="${badgeH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#7c3aed"/>
            <stop offset="100%" style="stop-color:#06b6d4"/>
          </linearGradient>
        </defs>
        <rect width="${badgeW}" height="${badgeH}" rx="${Math.floor(badgeH * 0.3)}" fill="url(#g)"/>
        <text
          x="${badgeW / 2}" y="${badgeH / 2 + fontSize * 0.35}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
        >${ctaText}</text>
      </svg>`;

    const ctaBuffer = Buffer.from(ctaSvg);
    const margin    = Math.floor(w * 0.04);

    compositeOps.push({
      input: ctaBuffer,
      left:  margin,
      top:   h - badgeH - margin,
    });

    console.log(`✅ CTA badge: "${ctaText}"`);
  }

  // Step 3: Logo overlay (bottom-right, 18% of image width, 0.85 opacity)
  if (logoBuffer) {
    try {
      const logoMaxW = Math.floor(w * 0.18);
      const logoMaxH = Math.floor(h * 0.10);
      const margin   = Math.floor(w * 0.04);

      // Resize logo preserving aspect ratio
      const resizedLogo = await sharp(logoBuffer)
        .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();

      // Get actual size after resize
      const meta = await sharp(resizedLogo).metadata();

      compositeOps.push({
        input:   resizedLogo,
        left:    w - meta.width  - margin,
        top:     h - meta.height - margin,
        blend:   "over",
      });

      console.log(`✅ Logo overlaid (${meta.width}×${meta.height})`);
    } catch (e) {
      console.warn("⚠️  Logo overlay failed:", e.message);
    }
  }

  // Apply all composites
  if (compositeOps.length > 0) {
    pipeline = sharp(await pipeline.toBuffer()).composite(compositeOps);
  }

  return pipeline.png().toBuffer();
}

/* ─────────────────────────────────────────
   ROUTE 1: POST /api/generate-image
───────────────────────────────────────── */
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    console.log("🔮 Enhancing prompt...");
    const enhancedPrompt = await enhancePrompt(prompt);
    console.log("✨ Enhanced:", enhancedPrompt);

    console.log("🎨 Generating image...");
    const response = await axios({
      url:     "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
        Accept:         "image/png",
      },
      data:         { inputs: enhancedPrompt },
      responseType: "arraybuffer",
    });

    const base64Image = Buffer.from(response.data, "binary").toString("base64");
    const uploadRes   = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64Image}`,
      { folder: "advantage_ads" }
    );

    console.log("✅ Image ready!");
    res.json({ imageUrl: uploadRes.secure_url, enhancedPrompt });

  } catch (error) {
    const msg = error.response?.data instanceof Buffer
      ? Buffer.from(error.response.data).toString()
      : error.message;
    console.error("❌ Image error:", msg);
    res.status(500).json({ error: "Image generation failed", details: msg });
  }
});

/* ─────────────────────────────────────────
   ROUTE 2: POST /api/generate-copy
───────────────────────────────────────── */
app.post("/api/generate-copy", async (req, res) => {
  try {
    const { prompt, voice = "professional" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const voiceInstruction = VOICE_PROMPTS[voice] || VOICE_PROMPTS.professional;
    console.log(`✍️  Generating ${voice} copy...`);

    const rawText = await askGroq(
      `${voiceInstruction}
       Based on this ad description: "${prompt}"
       Generate:
       1. A compelling social media caption (2-3 sentences, no hashtags)
       2. Exactly 8 relevant hashtags
       Respond in EXACT JSON only, no markdown:
       { "caption": "...", "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"] }`
    );

    const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    console.log("✅ Copy ready!");
    res.json(parsed);

  } catch (error) {
    console.error("❌ Copy error:", error.message);
    res.status(500).json({ error: "Copy generation failed", details: error.message });
  }
});

/* ─────────────────────────────────────────
   ROUTE 3: POST /api/generate-all
   ⚡ Parallel image + copy + composite + save
───────────────────────────────────────── */
app.post("/api/generate-all", async (req, res) => {
  try {
    const { prompt, voice = "professional", platform = "instagram", ctaText = "", logoUrl = "" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    console.log("⚡ Enhancing prompt...");
    const enhancedPrompt = await enhancePrompt(prompt);

    console.log("⚡ Running parallel generation...");
    const [imageResult, copyResult] = await Promise.allSettled([

      // ── Image generation ──
      axios({
        url:     "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
          Accept:         "image/png",
        },
        data:         { inputs: enhancedPrompt },
        responseType: "arraybuffer",
      }).then(async (r) => {
        let imageBuffer = Buffer.from(r.data, "binary");

        // ── Fetch logo if provided ──
        let logoBuffer = null;
        if (logoUrl) {
          try {
            const logoRes = await axios.get(logoUrl, { responseType: "arraybuffer" });
            logoBuffer    = Buffer.from(logoRes.data);
          } catch (e) {
            console.warn("⚠️  Logo fetch failed:", e.message);
          }
        }

        // ── Sharp compositing: resize + logo + CTA ──
        const composited = await compositeImage({
          imageBuffer,
          platform,
          logoBuffer,
          ctaText: ctaText || null,
        });

        // ── Upload composited image ──
        const upload = await cloudinary.uploader.upload(
          `data:image/png;base64,${composited.toString("base64")}`,
          { folder: "advantage_ads" }
        );

        return { imageUrl: upload.secure_url };
      }),

      // ── Copy generation ──
      (async () => {
        const vp  = VOICE_PROMPTS[voice] || VOICE_PROMPTS.professional;
        const raw = await askGroq(
          `${vp}
           Based on: "${prompt}"
           Return ONLY JSON, no markdown:
           { "caption": "...", "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"] }`
        );
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
      })(),
    ]);

    const imageUrl = imageResult.status === "fulfilled" ? imageResult.value.imageUrl : null;
    const caption  = copyResult.status  === "fulfilled" ? copyResult.value.caption   : null;
    const hashtags = copyResult.status  === "fulfilled" ? copyResult.value.hashtags  : [];

    if (imageUrl) {
      await pool.query(
        `INSERT INTO ads (prompt, image_url, caption, hashtags, voice, platform)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [prompt, imageUrl, caption, hashtags, voice, platform]
      );
      console.log("💾 Saved to PostgreSQL!");
    }

    console.log("✅ All done!");
    res.json({ imageUrl, caption, hashtags, enhancedPrompt });

  } catch (error) {
    console.error("❌ Generate-all error:", error.message);
    res.status(500).json({ error: "Generation failed", details: error.message });
  }
});

/* ─────────────────────────────────────────
   ROUTE 4: POST /api/composite
   Apply logo + CTA to an existing image URL
   (used from AdStudio for existing ads)
───────────────────────────────────────── */
app.post("/api/composite", async (req, res) => {
  try {
    const { imageUrl, platform = "instagram", ctaText = "", logoUrl = "" } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

    // Download base image
    const imgRes     = await axios.get(imageUrl, { responseType: "arraybuffer" });
    let imageBuffer  = Buffer.from(imgRes.data);

    // Download logo if provided
    let logoBuffer = null;
    if (logoUrl) {
      try {
        const logoRes = await axios.get(logoUrl, { responseType: "arraybuffer" });
        logoBuffer    = Buffer.from(logoRes.data);
      } catch (e) {
        console.warn("⚠️  Logo fetch failed:", e.message);
      }
    }

    const composited = await compositeImage({ imageBuffer, platform, logoBuffer, ctaText: ctaText || null });

    const upload = await cloudinary.uploader.upload(
      `data:image/png;base64,${composited.toString("base64")}`,
      { folder: "advantage_ads_composited" }
    );

    console.log("✅ Composite applied!");
    res.json({ imageUrl: upload.secure_url });

  } catch (error) {
    console.error("❌ Composite error:", error.message);
    res.status(500).json({ error: "Composite failed", details: error.message });
  }
});

/* ─────────────────────────────────────────
   ROUTE 5: POST /api/upload-logo
   Upload logo to Cloudinary, return URL
───────────────────────────────────────── */
app.post("/api/upload-logo", upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log("📤 Uploading logo...");
    const uploadRes = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "advantage_logos", use_filename: true }
    );

    console.log("✅ Logo uploaded:", uploadRes.secure_url);
    res.json({ logoUrl: uploadRes.secure_url });

  } catch (error) {
    console.error("❌ Logo upload error:", error.message);
    res.status(500).json({ error: "Logo upload failed" });
  }
});

/* ─────────────────────────────────────────
   ROUTE 6: GET /api/ads
───────────────────────────────────────── */
app.get("/api/ads", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM ads ORDER BY created_at DESC LIMIT 20"
    );
    const rows = result.rows.map(row => ({
      ...row,
      hashtags: Array.isArray(row.hashtags)
        ? row.hashtags
        : typeof row.hashtags === "string"
          ? row.hashtags.replace(/[{}]/g, "").split(",").filter(Boolean)
          : [],
    }));
    res.json(rows);
  } catch (error) {
    console.error("❌ Fetch ads error:", error.message);
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

/* ─────────────────────────────────────────
   ROUTE 7: DELETE /api/ads/:id
───────────────────────────────────────── */
app.delete("/api/ads/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM ads WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Delete error:", error.message);
    res.status(500).json({ error: "Failed to delete ad" });
  }
});

/* ─────────────────────────────────────────
   HEALTH CHECK
───────────────────────────────────────── */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    services: {
      cloudinary:  !!process.env.CLOUDINARY_NAME,
      huggingface: !!process.env.HF_TOKEN,
      groq:        !!process.env.GROQ_API_KEY,
      postgres:    !!process.env.PG_PASSWORD,
    },
    platforms: Object.keys(PLATFORMS),
  });
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 SERVER READY ON PORT ${process.env.PORT || 5000}`)
);