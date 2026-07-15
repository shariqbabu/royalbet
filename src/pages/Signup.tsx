import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Trophy,
  Mail,
  Lock,
  User,
  Phone,
  Hash,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { signUp } from '../firebase/auth';
import toast from 'react-hot-toast';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(10, 'Enter valid phone number').max(15),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export const Signup: React.FC = () => {
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { referralCode: refCode },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await signUp(
        data.email,
        data.password,
        data.name,
        data.phone,
        data.referralCode
      );
      toast.success('Account created! Welcome to RoyalBet!');
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'Email already in use'
          : err.message || 'Sign up failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputs = [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      icon: User,
      placeholder: 'John Doe',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      icon: Mail,
      placeholder: 'your@email.com',
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      icon: Phone,
      placeholder: '+91 9876543210',
    },
    {
      name: 'referralCode',
      label: 'Referral Code',
      type: 'text',
      icon: Hash,
      placeholder: 'ABC12345',
      optional: true,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background glow */}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.1 }}
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
              Create Account
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              Join the arena and start playing
            </p>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-xl sm:p-6"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="relative space-y-4"
            >
              {inputs.map(({ name, label, type, icon: Icon, placeholder, optional }) => (
                <div key={name}>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">
                    {label}
                    {optional && (
                      <span className="ml-1 font-medium normal-case tracking-normal text-gray-600">
                        (Optional)
                      </span>
                    )}
                  </label>

                  <div className="group relative">
                    <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-yellow-400" />

                    <input
                      {...register(name as keyof FormData)}
                      type={type}
                      placeholder={placeholder}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pl-10 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-yellow-500/45 focus:bg-black/35"
                    />
                  </div>

                  {errors[name as keyof FormData] && (
                    <p className="mt-1.5 text-xs font-medium text-red-400">
                      {errors[name as keyof FormData]?.message as string}
                    </p>
                  )}
                </div>
              ))}

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

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">
                  Confirm Password
                </label>

                <div className="group relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-yellow-400" />

                  <input
                    {...register('confirmPassword')}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pl-10 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-yellow-500/45 focus:bg-black/35"
                  />
                </div>

                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs font-medium text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-gray-400">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <span>
                  Your account is protected. Use a strong password and keep your
                  login details private.
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
                {loading ? 'Creating Account...' : 'Create Account'}
              </motion.button>

              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-bold text-yellow-400 transition-colors hover:text-yellow-300"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
