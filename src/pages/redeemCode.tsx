// src/pages/wallet/RedeemCode.tsx
import React, { useState } from 'react';
import { Gift, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { redeemCode } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';

const RedeemCode: React.FC = () => {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, firebaseUser } = useAuth();
  const displayName = firebaseUser?.displayName ?? "";
    
  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter redeem code');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setSuccess(false);

    try {
      const data = await redeemCode.checkCode(
       code.trim().toUpperCase(),
        Number(amount),
        displayName,
      );

      setSuccess(true);
      setMessage(`₹${data.amount} added to your wallet successfully!`);
      setCode('');
      setAmount('');

      setTimeout(() => {
        setSuccess(false);
        setMessage('');
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Redeem Code</h1>
          <p className="text-gray-400 mt-2 text-sm">Enter code & amount to credit your wallet</p>
        </div>

        {/* Main Card */}
        <div className="bg-[#111113] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleRedeem} className="space-y-5">
            
            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Redeem Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className="w-full bg-[#1a1a1f] border border-white/10 focus:border-purple-500/50 text-white text-xl font-mono tracking-[4px] placeholder:text-gray-600 rounded-2xl px-6 py-4 outline-none transition-all"
                disabled={loading}
                maxLength={19}
              />
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-6 top-4 text-gray-500 text-xl">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#1a1a1f] border border-white/10 focus:border-purple-500/50 text-white text-xl font-semibold pl-12 pr-6 py-4 rounded-2xl outline-none transition-all"
                  disabled={loading}
                  min="1"
                />
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading || !code.trim() || !amount}
              className="w-full h-14 mt-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.985] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redeeming...
                </>
              ) : (
                'Redeem Now'
              )}
            </button>
          </form>

          {/* Success Message */}
          {success && message && (
            <div className="mt-6 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-4 rounded-2xl">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-4 rounded-2xl">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Code is valid only for your account • Instant credit
        </p>
      </div>
    </div>
  );
};

export default RedeemCode;
