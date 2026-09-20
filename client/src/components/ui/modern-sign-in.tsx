"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

interface ModernSignInProps {
  onLogin: (username: string, password: string) => void;
  error?: string;
  loading?: boolean;
}

export default function ModernSignIn({ onLogin, error, loading }: ModernSignInProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin(username, password);
    }
  };

  return (
    <div className="w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div
          className="bg-bg-secondary/80 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-xl"
          whileHover={{ borderColor: 'rgba(88,166,255,0.3)' }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(88,166,255,0.3)' }}
            >
              <span className="text-2xl font-bold text-accent">H</span>
            </motion.div>
            <motion.h1
              className="text-2xl font-bold text-text-bright"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              Welcome back
            </motion.h1>
            <motion.p
              className="text-text-muted mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              Sign in to HipHopono
            </motion.p>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.45 }}
          >
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Username
              </label>
              <motion.input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent transition-colors"
                placeholder="Enter your username"
                required
                whileFocus={{ borderColor: '#58a6ff', boxShadow: '0 0 0 3px rgba(88,166,255,0.1)' }}
              />
            </div>

            <motion.div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Password
              </label>
              <div className="relative">
                <motion.input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent transition-colors"
                  placeholder="Enter your password"
                  required
                  whileFocus={{ borderColor: '#58a6ff', boxShadow: '0 0 0 3px rgba(88,166,255,0.1)' }}
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
            </motion.div>

            {error && (
              <motion.div
                className="p-3 bg-danger/10 border border-danger/20 rounded-lg"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <p className="text-sm text-danger">{error}</p>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-bg font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: loading || !username || !password ? 1 : 1.02, boxShadow: '0 0 20px rgba(88,166,255,0.3)' }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <motion.span
                    animate={!(loading || !username || !password)
                      ? { x: [0, 3, 0] }
                      : undefined
                    }
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </>
              )}
            </motion.button>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}
