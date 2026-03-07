import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Sparkles, User, AlertCircle, CheckCircle } from "lucide-react";
import useAuthStore from "../../context/useAuthStore";
import toast from "react-hot-toast";

export default function Signup() {
  const navigate  = useNavigate();
  const { login } = useAuthStore();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6)   return { label: "Too short", color: "bg-red-500",    width: "25%"  };
    if (password.length < 8)   return { label: "Weak",      color: "bg-orange-500", width: "50%"  };
    if (!/[0-9]/.test(password)) return { label: "Medium",  color: "bg-yellow-500", width: "75%"  };
    return                              { label: "Strong",   color: "bg-emerald-500",width: "100%" };
  };
  const strength = passwordStrength();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirm) return setError("All fields required");
    if (password !== confirm) return setError("Passwords don't match");
    if (password.length < 6)  return setError("Password must be at least 6 characters");
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("http://localhost:5000/api/auth/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); return; }

      login(data.user, data.token);
      toast.success(`Welcome to AdVantage Gen, ${data.user.name}!`);
      navigate("/dashboard");
    } catch {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05060a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Blobs */}
      <div className="absolute w-[400px] h-[400px] bg-violet-600 rounded-full blur-[120px] opacity-20 -top-20 -left-20" />
      <div className="absolute w-[300px] h-[300px] bg-cyan-500 rounded-full blur-[120px] opacity-20 bottom-10 right-10" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              AdVantage Gen
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-gray-400 text-sm">Start generating stunning ads for free</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">

          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">

            {/* Name */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm
                    outline-none focus:border-violet-500 placeholder-gray-600 transition text-white" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm
                    outline-none focus:border-violet-500 placeholder-gray-600 transition text-white" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm
                    outline-none focus:border-violet-500 placeholder-gray-600 transition text-white" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {strength && (
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color}`}
                      style={{ width: strength.width }} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm
                    outline-none focus:border-violet-500 placeholder-gray-600 transition text-white" />
                {confirm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {confirm === password
                      ? <CheckCircle size={15} className="text-emerald-400" />
                      : <AlertCircle size={15} className="text-red-400" />}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2
                bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/25
                disabled:opacity-60 disabled:cursor-not-allowed transition-all mt-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
              ) : "Create Account"}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}