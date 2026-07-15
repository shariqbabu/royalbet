import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowUpCircle,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { walletService } from '../firebase/walletService';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const schema = z.object({
  amount: z
    .number()
    .min(100, 'Minimum withdrawal is ₹100')
    .max(10000, 'Maximum ₹10,000 per request'),
  upiId: z
    .string()
    .min(5, 'Enter valid UPI ID')
    .regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format'),
});

type FormData = z.infer<typeof schema>;

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  const Withdrawal: React.FC = () => {
  const { firebaseUser, wallet } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const userName = firebaseUser?.displayName;
  const userEmail = firebaseUser?.email;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const amount = watch('amount');
  const winningBalance = wallet?.winningBalance || 0;

  const onSubmit = async (data: FormData) => {
    if (!firebaseUser) return;

    if ((wallet?.winningBalance || 0) < data.amount) {
      toast.error('Insufficient winning balance');
      return;
    }

    setLoading(true);

    try {
      await walletService.withdraw(data.amount, data.upiId, userName, userEmail);
      setSubmitted(true);
      toast.success('Withdrawal request submitted!');
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
        <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />

        <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/20 bg-white/[0.04] p-6 text-center shadow-2xl"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border border-emerald-500/25 bg-emerald-500/10">
                <CheckCircle className="h-12 w-12 text-emerald-400" />
              </div>

              <h2 className="mb-2 text-2xl font-black text-white">
                Request Submitted!
              </h2>

              <p className="mb-6 text-sm leading-relaxed text-gray-400">
                Your withdrawal of{' '}
                <span className="font-bold text-emerald-400">
                  {formatCurrency(amount || 0)}
                </span>{' '}
                is being processed. You'll receive funds within 24 hours.
              </p>

              <button
                onClick={() => setSubmitted(false)}
                className="rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 text-sm font-black text-black transition-all hover:from-yellow-400 hover:to-orange-400 active:scale-95"
              >
                New Withdrawal
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 via-yellow-500/10 to-transparent p-4 shadow-2xl sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10">
                <ArrowUpCircle className="h-7 w-7 text-orange-400" />
              </div>

              <div>
                <h1 className="text-2xl font-black text-white sm:text-3xl">
                  Withdraw Funds
                </h1>
                <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                  Withdraw your winning balance directly to UPI
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left: Form */}
            <div className="space-y-5">
              {/* Amount */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10">
                      <ArrowUpCircle className="h-5 w-5 text-yellow-400" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">Select Amount</h3>
                      <p className="text-xs text-gray-500">
                        Minimum ₹100 · Maximum ₹10,000
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {quickAmounts.map((amt) => {
                      const active = amount === amt;
                      const disabled = winningBalance < amt;

                      return (
                        <motion.button
                          key={amt}
                          whileHover={!disabled ? { scale: 1.03, y: -2 } : undefined}
                          whileTap={!disabled ? { scale: 0.95 } : undefined}
                          type="button"
                          onClick={() => !disabled && setValue('amount', amt)}
                          disabled={disabled}
                          className={`rounded-2xl border py-3 text-sm font-black transition-all ${
                            active
                              ? 'border-orange-500/50 bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/10'
                              : disabled
                                ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600'
                                : 'border-white/10 bg-white/[0.04] text-gray-300 hover:border-orange-500/30 hover:bg-white/[0.08]'
                          }`}
                        >
                          ₹{amt}
                        </motion.button>
                      );
                    })}
                  </div>

                  <input
                    {...register('amount', { valueAsNumber: true })}
                    type="number"
                    placeholder="Enter amount"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-orange-500/45 focus:bg-black/35"
                  />

                  {errors.amount && (
                    <p className="mt-1.5 text-xs font-medium text-red-400">
                      {errors.amount.message}
                    </p>
                  )}
                </div>
              </div>

              {/* UPI ID */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
                      <ShieldCheck className="h-5 w-5 text-blue-400" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">UPI ID</h3>
                      <p className="text-xs text-gray-500">
                        Enter correct UPI ID for payout
                      </p>
                    </div>
                  </div>

                  <input
                    {...register('upiId')}
                    type="text"
                    placeholder="yourname@upi"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-orange-500/45 focus:bg-black/35"
                  />

                  {errors.upiId && (
                    <p className="mt-1.5 text-xs font-medium text-red-400">
                      {errors.upiId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit(onSubmit)}
                disabled={loading || !wallet?.winningBalance}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-500 py-4 text-base font-black text-black transition-all hover:from-orange-400 hover:to-yellow-400 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {loading ? 'Submitting...' : 'Request Withdrawal'}
              </motion.button>
            </div>

            {/* Right: Notes */}
            <div className="space-y-5">
              {/* Important Notes */}
              <div className="relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-500/20 blur-3xl" />

                <div className="relative flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/15">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-black text-yellow-300">
                      Important Notes
                    </p>

                    <ul className="space-y-1.5 text-xs leading-relaxed text-gray-400">
                      <li>• Only winning balance can be withdrawn</li>
                      <li>• Minimum withdrawal: ₹100</li>
                      <li>• Maximum withdrawal: ₹10,000 per request</li>
                      <li>• Processing time: up to 24 hours</li>
                      <li>• Ensure UPI ID is correct before submitting</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Processing */}
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />

                <div className="relative flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15">
                    <Clock className="h-5 w-5 text-emerald-400" />
                  </div>

                  <div>
                    <p className="mb-1 text-sm font-black text-emerald-300">
                      Fast Processing
                    </p>
                    <p className="text-xs leading-relaxed text-gray-400">
                      Withdrawal requests are manually verified and processed
                      within 24 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default Withdrawal;
