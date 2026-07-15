import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Trophy,
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { signIn, resetPassword } from '../firebase/auth';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export const Login: React.FC = () => {
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      await signIn(data.email, data.password);
      toast.success('Welcome back!');
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please try later.'
            : err.message || 'Login failed';

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error('Enter your email');
      return;
    }

    try {
      await resetPassword(forgotEmail);
      toast.success('Password reset email sent!');
      setShowForgot(false);
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background glows */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-3 py-6 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="mb-5 text-center">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3 }}
              className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-yellow-500/25 bg-yellow-500/10 shadow-2xl shadow-yellow-500/10"
            >
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-yellow-500/20 blur-2xl" />

              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/30">
                <Trophy className="h-7 w-7 text-white" />
              </div>
            </motion.div>

            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                BetAdda Casino
              </span>
            </div>

            <h1 className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-300 bg-clip-text text-3xl font-black text-transparent sm:text-4xl">
              {showForgot ? 'Reset Password' : 'Welcome Back'}
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              {showForgot
                ? 'Enter your email to receive reset link'
                : 'Sign in to continue playing'}
            </p>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-xl sm:p-6"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

            <AnimatePresence mode="wait">
              {!showForgot ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 14 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="relative space-y-4"
                >
                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">
                      Email
                    </label>

                    <div className="group relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-yellow-400" />

                      <input
                        {...register('email')}
                        type="email"
                        placeholder="your@email.com"
                        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pl-10 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-yellow-500/45 focus:bg-black/35"
                      />
                    </div>

                    {errors.email && (
                      <p className="mt-1.5 text-xs font-medium text-red-400">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">
                      Password
                    </label>

                    <div className="group relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-yellow-400" />

                      <input
                        {...register('password')}
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pl-10 pr-11 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-yellow-500/45 focus:bg-black/35"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-yellow-400"
                      >
                        {showPass ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="mt-1.5 text-xs font-medium text-red-400">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Forgot password */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-sm font-bold text-yellow-400 transition-colors hover:text-yellow-300"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Security note */}
                  <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-gray-400">
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span>
                      Secure login enabled. Never share your password or OTP with
                      anyone.
                    </span>
                  </div>

                  {/* Submit */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 py-3.5 text-sm font-black text-black transition-all hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </motion.button>

                  <p className="text-center text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link
                      to="/signup"
                      className="font-bold text-yellow-400 transition-colors hover:text-yellow-300"
                    >
                      Sign up
                    </Link>
                  </p>
                </motion.form>
              ) : (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.25 }}
                  className="relative space-y-4"
                >
                  <button
                    onClick={() => setShowForgot(false)}
                    className="mb-1 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition-colors hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>

                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <h3 className="text-lg font-black text-white">
                      Reset Password
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Enter your registered email. We'll send you a password
                      reset link.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">
                      Email
                    </label>

                    <div className="group relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-yellow-400" />

                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pl-10 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-yellow-500/45 focus:bg-black/35"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowForgot(false)}
                      className="rounded-2xl border border-white/10 bg-white/[0.06] py-3 text-sm font-bold text-white transition-all hover:bg-white/[0.1]"
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleForgotPassword}
                      className="rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 py-3 text-sm font-black text-black transition-all hover:from-yellow-400 hover:to-orange-400"
                    >
                      Send Link
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
