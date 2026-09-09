# AdVantage Gen — AI-Powered Ad Generation SaaS

> Generate professional ad creatives from a single text prompt using AI

🌐 **Live Demo:** [advantage-gen1.vercel.app](https://advantage-gen1.vercel.app)

---

## 📸 Features

- 🎨 **AI Image Generation** — Powered by HuggingFace FLUX.1-schnell
- ✍️ **AI Copywriting** — Headlines, captions & hashtags via Groq (LLaMA)
- 🖼️ **Image Compositing** — Logo overlay + CTA badge via Sharp
- 🧪 **A/B Variant Testing** — Generate 3 creative variants with different brand voices
- 🎙️ **Brand Voices** — Witty, Professional, Urgent, Inspirational
- 📐 **Multi-Platform Sizing** — Instagram, LinkedIn, Twitter, Stories
- 🔐 **JWT Authentication** — Secure signup/login with bcrypt
- 👤 **Per-User Data Isolation** — Each user sees only their own ads
- 📊 **Profile & Stats** — Credits, platform breakdown, voice analytics
- 📜 **Ad History** — View and delete past campaigns

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Vite, Tailwind CSS, Zustand |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt |
| AI Images | HuggingFace FLUX.1-schnell |
| AI Text | Groq (LLaMA 3) |
| Image Processing | Sharp |
| Cloud Storage | Cloudinary |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL or Supabase account
- HuggingFace API token
- Groq API key
- Cloudinary account

### Installation

```bash
# Clone the repo
git clone https://github.com/Balabhasakar/Advantage_Gen1.git
cd Advantage_Gen1

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
```

### Environment Variables

**Frontend** (`.env.local` at root):
```
VITE_API_URL=http://localhost:5000
```

**Backend** (`server/.env`):
```
PORT=5000
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_jwt_secret
HF_TOKEN=your_huggingface_token
GROQ_API_KEY=your_groq_api_key
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
FRONTEND_URL=http://localhost:5173
```

### Run Locally

```bash
# Run backend (from server/ folder)
node index.js

# Run frontend (from root folder)
npm run dev
```

---

## 📁 Project Structure

```
Advantage_Gen1/
├── src/
│   ├── context/          # Zustand auth store
│   ├── layout/           # Navbar, MainLayout
│   ├── lib/              # Axios API instance
│   ├── pages/
│   │   ├── auth/         # Login, Signup
│   │   ├── dashboard/    # Main generation page
│   │   ├── studio/       # Ad Studio editor
│   │   ├── variants/     # A/B variant generator
│   │   ├── history/      # Past campaigns
│   │   └── profile/      # User stats
│   └── routes/           # App routing
├── server/
│   └── index.js          # Express backend (all routes)
├── vercel.json           # Vercel SPA config
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/generate-all` | ✅ | Generate image + copy |
| POST | `/api/generate-variants` | ✅ | Generate 3 A/B variants |
| POST | `/api/generate-image` | ✅ | Regenerate image only |
| POST | `/api/generate-copy` | ✅ | Generate copy only |
| POST | `/api/composite` | ✅ | Apply logo + CTA to image |
| POST | `/api/upload-logo` | ✅ | Upload brand logo |
| POST | `/api/save-ad` | ✅ | Save variant to DB |
| GET | `/api/ads` | ✅ | Get user's ad history |
| DELETE | `/api/ads/:id` | ✅ | Delete an ad |
| GET | `/api/profile/stats` | ✅ | Get user stats |
| GET | `/api/health` | ❌ | Health check |

---

## 🌐 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [advantage-gen1.vercel.app](https://advantage-gen1.vercel.app) |
| Backend | Railway | [advantagegen1-production.up.railway.app](https://advantagegen1-production.up.railway.app) |
| Database | Supabase | PostgreSQL |
| Images | Cloudinary | CDN Storage |

---

## 👨‍💻 Author

**Bala Bhaskar Mule**
- GitHub: [@Balabhasakar](https://github.com/Balabhasakar)
- LinkedIn: [Bala Bhaskar Mule](https://www.linkedin.com/in/mule-bala-bhaskar-reddy-9234372b2/)
- Email: balamulebhaskar@gmail.com
