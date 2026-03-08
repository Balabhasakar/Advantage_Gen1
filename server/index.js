const express  = require("express");
const cloudinary = require("cloudinary").v2;
const cors     = require("cors");
const axios    = require("axios");
const Groq     = require("groq-sdk");
const { Pool } = require("pg");
const sharp    = require("sharp");
const multer   = require("multer");
const path     = require("path");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));

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
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { host: "localhost", port: 5432, database: "advantage_gen", user: "postgres", password: process.env.PG_PASSWORD }
);

pool.connect()
  .then(() => console.log("🐘 PostgreSQL connected!"))
  .catch(err => console.error("❌ PostgreSQL connection failed:", err.message));


/* ─────────────────────────────────────────
   JWT AUTH MIDDLEWARE
───────────────────────────────────────── */
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "advantage_secret_key");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

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
/* ─────────────────────────────────────────
   POLLINATIONS.AI — Free image generation
   No API key needed!
───────────────────────────────────────── */
async function generateImage(prompt) {
  console.log("🎨 Generating image via FLUX...");
  const response = await axios({
    url:    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    method: "POST",
    headers: {
      Authorization:  `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/json",
      Accept:         "image/png",
    },
    data:         { inputs: prompt.slice(0, 500) },
    responseType: "arraybuffer",
    timeout:      120000,
  });
  console.log(`✅ FLUX responded, size: ${response.data.byteLength} bytes`);
  return Buffer.from(response.data, "binary");
}

async function enhancePrompt(userPrompt) {
  try {
    const result = await askGroq(
      `You are an expert AI image prompt engineer.
       Rewrite this short prompt into a highly detailed, visually rich description 
       optimized for an AI image generator like FLUX.
       Focus on: lighting, mood, color palette, composition, style, atmosphere.
       Keep it under 120 words. Return ONLY the enhanced prompt, no quotes, no markdown.
       User prompt: "${userPrompt}"`
    );
    // Strip any surrounding quotes the LLM may have added
    return result.replace(/^["']|["']$/g, "").trim();
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
    const imgBuffer   = await generateImage(enhancedPrompt);
    const base64Image = imgBuffer.toString("base64");
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
app.post("/api/generate-all", authMiddleware, async (req, res) => {
  try {
    const { prompt, voice = "professional", platform = "instagram", ctaText = "", logoUrl = "" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    console.log("⚡ Enhancing prompt...");
    const enhancedPrompt = await enhancePrompt(prompt);

    console.log("⚡ Running parallel generation...");
    const [imageResult, copyResult] = await Promise.allSettled([

      // ── Image generation ──
      generateImage(enhancedPrompt).then(async (imageBuffer) => {

        let logoBuffer = null;
        if (logoUrl) {
          try {
            const logoRes = await axios.get(logoUrl, { responseType: "arraybuffer" });
            logoBuffer    = Buffer.from(logoRes.data);
          } catch (e) { console.warn("⚠️  Logo fetch failed:", e.message); }
        }

        const composited = await compositeImage({
          imageBuffer, platform, logoBuffer, ctaText: ctaText || null,
        });

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
           { "headline": "...", "caption": "...", "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"] }
           Rules:
           - headline: a catchy 3-6 word PRODUCT/BRAND name or ad title that perfectly matches the product being advertised. Make it memorable, specific to the product, like "Brew Bold. Live Green." or "Speed Meets Style" or "Taste the Wild". NO generic phrases like "Your Headline Here"
           - caption: 2-3 sentences, no hashtags
           - hashtags: exactly 8`
        );
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
      })(),
    ]);

    const imageUrl = imageResult.status === "fulfilled" ? imageResult.value.imageUrl : null;
    const caption  = copyResult.status  === "fulfilled" ? copyResult.value.caption   : null;
    const hashtags = copyResult.status  === "fulfilled" ? copyResult.value.hashtags  : [];
    const headline = copyResult.status  === "fulfilled" ? copyResult.value.headline  : null;

    // Debug logs
    console.log("🖼️  imageResult status:", imageResult.status);
    if (imageResult.status === "rejected") console.error("❌ Image failed:", imageResult.reason?.message);
    console.log("📝 copyResult status:", copyResult.status);
    console.log("🔗 imageUrl:", imageUrl);

    if (imageUrl) {
      await pool.query(
        `INSERT INTO ads (prompt, image_url, caption, hashtags, headline, voice, platform, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [prompt, imageUrl, caption, hashtags, headline, voice, platform, req.user?.id || null]
      );
      console.log("💾 Saved to PostgreSQL!");
    } else {
      console.error("❌ imageUrl is null — image generation failed silently");
    }

    console.log("✅ All done!");
    res.json({ imageUrl, caption, hashtags, headline, enhancedPrompt });

  } catch (error) {
    console.error("❌ Generate-all error:", error.message);
    res.status(500).json({ error: "Generation failed", details: error.message });
  }
});


/* ─────────────────────────────────────────
   ROUTE 3B: POST /api/generate-variants
   ⚡ Generates 3 A/B variants in parallel
   Each variant: different image style + voice
───────────────────────────────────────── */
app.post("/api/generate-variants", authMiddleware, async (req, res) => {
  try {
    const { prompt, platform = "instagram", ctaText = "", logoUrl = "", voice = "professional" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    console.log("⚡ Generating 3 A/B variants in parallel...");

    // All 4 voices with matching visual styles
    const ALL_VOICES = {
      professional:  "clean minimal aesthetic, bright lighting, premium product photography, polished corporate feel",
      witty:         "bold vibrant colors, playful dynamic composition, fun eye-catching modern design",
      urgent:        "dramatic dark moody lighting, cinematic high contrast, intense powerful atmosphere",
      inspirational: "warm golden hour lighting, uplifting serene composition, soft dreamy emotional atmosphere",
    };

    // Always show the other 3 voices excluding the one user already selected
    const selectedVoice = voice || "professional";
    const remainingVoices = Object.keys(ALL_VOICES).filter(v => v !== selectedVoice);

    const VARIANTS = remainingVoices.map((v, i) => ({
      id:        ["A","B","C"][i],
      voice:     v,
      styleHint: ALL_VOICES[v],
    }));

    console.log(`🎯 User selected "${selectedVoice}" on Dashboard — generating variants for: ${remainingVoices.join(", ")}`);

    // Enhance base prompt once
    const enhancedBase = await enhancePrompt(prompt);

    // Generate variants sequentially
    const variantResults = [];
    for (const variant of VARIANTS) {
      console.log(`\n🎨 Starting Variant ${variant.id} (${variant.voice})...`);
      try {
        // Each variant gets its OWN enhanced prompt with different style
        const styledPrompt = await askGroq(
          `You are an expert AI image prompt engineer.
           Rewrite this prompt for an AI image generator with a ${variant.styleHint} style.
           Make it VERY different visually from other versions.
           Keep under 100 words. Return ONLY the prompt, no quotes.
           Original: "${prompt}"`
        );
        console.log(`✨ Variant ${variant.id} prompt: ${styledPrompt.slice(0, 80)}...`);

        // ── Step 1: Generate image ──
        console.log(`📡 Generating image for Variant ${variant.id}...`);
        let imageBuffer = await generateImage(styledPrompt);
        let imageUrl    = null;

        // ── Step 2: Composite + Upload ──
        let logoBuffer = null;
        if (logoUrl) {
          try {
            const lr = await axios.get(logoUrl, { responseType: "arraybuffer" });
            logoBuffer = Buffer.from(lr.data);
          } catch (e) { console.warn("⚠️ Logo fetch failed"); }
        }
        const composited = await compositeImage({
          imageBuffer, platform, logoBuffer, ctaText: ctaText || null,
        });
        const upload = await cloudinary.uploader.upload(
          `data:image/png;base64,${composited.toString("base64")}`,
          { folder: "advantage_variants" }
        );
        imageUrl = upload.secure_url;
        console.log(`✅ Variant ${variant.id} image ready:`, imageUrl);

        // ── Step 5: Generate copy ──
        const vp  = VOICE_PROMPTS[variant.voice];
        const raw = await askGroq(
          `${vp}
           Based on: "${prompt}"
           Return ONLY JSON, no markdown:
           { "headline": "...", "caption": "...", "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"] }
           Rules:
           - headline: a catchy 3-6 word PRODUCT/BRAND name or ad title that perfectly matches the product. Make it memorable and specific like "Brew Bold. Live Green." or "Speed Meets Style". NO generic phrases
           - caption: 2-3 sentences, no hashtags
           - hashtags: exactly 8`
        );
        const copy = JSON.parse(raw.replace(/```json|```/g, "").trim());

        // ── Step 6: NOT saving to DB here — only save when user picks a winner ──
        variantResults.push({
          id:       variant.id,
          voice:    variant.voice,
          imageUrl,
          headline: copy.headline || null,
          caption:  copy.caption  || null,
          hashtags: copy.hashtags || [],
        });

      } catch(e) {
        const errDetail = e.response?.data
          ? Buffer.isBuffer(e.response.data)
            ? Buffer.from(e.response.data).toString()
            : JSON.stringify(e.response.data)
          : e.message;
        console.error(`❌ Variant ${variant.id} FAILED:`, errDetail);
      }

      // Delay between variants
      if (variant.id !== "C") await new Promise(r => setTimeout(r, 1000));
    }

    const variants = variantResults; // already filtered — only successful ones pushed

    console.log(`✅ Generated ${variants.length}/3 variants!`);
    if (variants.length === 0) {
      return res.status(500).json({ error: "All variants failed — check HF token and rate limits" });
    }
    res.json({ variants, enhancedBase });

  } catch (error) {
    console.error("❌ Variants error:", error.message);
    res.status(500).json({ error: "Variant generation failed", details: error.message });
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
app.get("/api/ads", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM ads WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [req.user.id]
    );
    const rows = result.rows.map(row => ({
      ...row,
      headline: row.headline || null,
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
app.delete("/api/ads/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM ads WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Delete error:", error.message);
    res.status(500).json({ error: "Failed to delete ad" });
  }
});

/* ─────────────────────────────────────────
   ROUTE: POST /api/save-ad
   Save a selected variant to DB
───────────────────────────────────────── */
app.post("/api/save-ad", authMiddleware, async (req, res) => {
  try {
    const { prompt, imageUrl, caption, hashtags, headline, voice, platform } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

    await pool.query(
      `INSERT INTO ads (prompt, image_url, caption, hashtags, headline, voice, platform, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [prompt, imageUrl, caption, hashtags || [], headline || null, voice, platform, req.user?.id || null]
    );
    console.log("💾 Variant saved to PostgreSQL!");
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Save ad error:", error.message);
    res.status(500).json({ error: "Failed to save ad" });
  }
});

/* ─────────────────────────────────────────
   AUTH ROUTES
───────────────────────────────────────── */

// Create users table on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => console.log("✅ Users table ready"))
  .catch(e => console.error("❌ Users table error:", e.message));

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    // Check if email exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: "Email already registered" });

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Save user
    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashed]
    );
    const user = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || "advantage_secret_key",
      { expiresIn: "7d" }
    );

    console.log(`✅ New user signed up: ${email}`);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

  } catch (error) {
    console.error("❌ Signup error:", error.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    // Find user
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0)
      return res.status(400).json({ error: "Invalid email or password" });

    const user = result.rows[0];

    // Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: "Invalid email or password" });

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || "advantage_secret_key",
      { expiresIn: "7d" }
    );

    console.log(`✅ User logged in: ${email}`);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET PROFILE (protected)
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/* ─────────────────────────────────────────
   ROUTE: GET /api/profile/stats
   Returns user profile + real ad stats
───────────────────────────────────────── */
app.get("/api/profile/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user info
    const userResult = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const user = userResult.rows[0];

    // Get total ads generated
    const totalAds = await pool.query(
      "SELECT COUNT(*) FROM ads WHERE user_id = $1",
      [userId]
    );

    // Get ads by platform
    const byPlatform = await pool.query(
      "SELECT platform, COUNT(*) as count FROM ads WHERE user_id = $1 GROUP BY platform",
      [userId]
    );

    // Get ads by voice
    const byVoice = await pool.query(
      "SELECT voice, COUNT(*) as count FROM ads WHERE user_id = $1 GROUP BY voice",
      [userId]
    );

    // Get recent 3 ads
    const recentAds = await pool.query(
      "SELECT id, image_url, caption, headline, created_at FROM ads WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3",
      [userId]
    );

    // Credits: 100 free - ads generated (each ad costs 1 credit)
    const adsCount  = parseInt(totalAds.rows[0].count);
    const credits   = Math.max(0, 100 - adsCount);

    res.json({
      user,
      stats: {
        totalAds:   adsCount,
        credits,
        maxCredits: 100,
        byPlatform: byPlatform.rows,
        byVoice:    byVoice.rows,
        recentAds:  recentAds.rows,
        memberSince: user.created_at,
      },
    });
  } catch (error) {
    console.error("❌ Profile stats error:", error.message);
    res.status(500).json({ error: "Failed to fetch profile stats" });
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