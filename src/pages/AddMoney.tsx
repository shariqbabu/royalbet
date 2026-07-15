import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Upload, QrCode, CheckCircle, Loader2,
  Copy, Wallet, Shield, Info, X, FileText, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { walletService } from '../firebase/walletService';
import emailjs from '@emailjs/browser';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const ADMIN_UPI     = import.meta.env.VITE_ADMIN_UPI_ID;
const ADMIN_QR      = import.meta.env.VITE_ADMIN_QR_IMAGE;
const EMAILJS_SID   = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TID   = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_KEY   = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const ADMIN_EMAIL   = import.meta.env.VITE_ADMIN_EMAIL;

const schema = z.object({
  amount: z.number({ invalid_type_error: "Amount is required" }).min(100, 'Min ₹100').max(50000, 'Max ₹50,000'),
  utrNumber: z
    .string()
    .min(12, 'UTR must be 12 digits')
    .max(12, 'UTR must be 12 digits')
    .regex(/^\d+$/, 'Only numbers allowed'),
});

type FormData = z.infer<typeof schema>;

   const AddMoney: React.FC = () => {
  const { firebaseUser } = useAuth();
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ 
    resolver: zodResolver(schema) 
  });

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Image only'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) { setScreenshot(data.secure_url); toast.success('Screenshot uploaded!'); }
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const onSubmit = async (data: FormData) => {
  if (!screenshot) { toast.error('Please upload screenshot'); return; }
  setSubmitting(true);
  
  // Show loading toast — replaces itself with success/error
  const loadingToast = toast.loading('Sending deposit request...');
  
  try {
    await walletService.addFund(data.amount, screenshot, data.utrNumber, firebaseUser?.displayName ?? "");
    
    await emailjs.send(EMAILJS_SID, EMAILJS_TID, {
      to_email:       ADMIN_EMAIL,
      user_email:     firebaseUser?.email,                      // 🐛 tha `firebase?.email` — fixed
      user_name:      firebaseUser?.displayName ?? "User",
      amount:         `₹${data.amount}`,
      utr_number:     data.utrNumber,
      screenshot_url: screenshot,
      submitted_at:   new Date().toLocaleString("en-IN")
    }, EMAILJS_KEY);
    
    toast.dismiss(loadingToast);
    toast.success('✅ Deposit request sent! Admin will verify in 15-30 mins', {
      duration: 4000,
      style: {
        background: '#151c2c',
        color: '#fff',
        border: '1px solid #22c55e',
        padding: '14px',
      },
      iconTheme: { primary: '#22c55e', secondary: '#151c2c' },
    });
    setTimeout(() => setSubmitted(true), 1500);
  } catch (e) {
    toast.dismiss(loadingToast);
    toast.error('❌ Something went wrong. Please try again.', {
      duration: 4000,
      style: {
        background: '#151c2c',
        color: '#fff',
        border: '1px solid #ef4444',
        padding: '14px',
      },
    });
    console.error('[addFund] failed:', e);
  } finally { 
    setSubmitting(false); 
  }
};

  if (submitted) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] px-6">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-3xl bg-[#151c2c] p-8 text-center border border-gray-800">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Deposit Pending</h2>
        <p className="text-gray-400 text-sm mb-8">Admin will verify your UTR and update your balance within 15-30 minutes.</p>
        <button onClick={() => { setSubmitted(false); setScreenshot(null); reset(); }} className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white">Done</button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] pb-10 text-white">
      {/* Top Header */}
      <div className="px-6 pt-8 pb-6 text-center">
        <h1 className="text-2xl font-black italic tracking-tighter">
          BET<span className="text-yellow-500">ADDA</span>
        </h1>
        <p className="text-[10px] uppercase tracking-[3px] text-gray-500 mt-1">Premium Deposit</p>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-6">
        
        {/* 1. QR Section */}
        <section className="rounded-3xl bg-[#151c2c] p-6 border border-gray-800 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Step 1: Scan & Pay</h2>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl mb-4">
               {ADMIN_QR ? (
                 <img src={ADMIN_QR} alt="Admin QR" className="w-48 h-48 object-contain" />
               ) : (
                 <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
                    <QrCode className="h-12 w-12 text-gray-400" />
                 </div>
               )}
            </div>

            <div className="flex items-center justify-between bg-[#1e2638] p-3 rounded-xl border border-gray-700">
                <div className="overflow-hidden">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">UPI ID</p>
                    <p className="truncate font-mono text-sm text-blue-400">{ADMIN_UPI}</p>
                </div>
                <button 
                  onClick={() => { navigator.clipboard.writeText(ADMIN_UPI); toast.success('UPI Copied'); }}
                  className="bg-blue-600 p-2.5 rounded-lg active:scale-90 transition-transform"
                >
                    <Copy className="h-4 w-4" />
                </button>
            </div>
        </section>

        {/* 2. Form Section (Amount & UTR) */}
        <section className="rounded-3xl bg-[#151c2c] p-6 border border-gray-800 shadow-xl space-y-5">
            <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-yellow-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Step 2: Payment Details</h2>
            </div>

            {/* Amount Input */}
            <div>
                <label className="block text-[11px] text-gray-400 uppercase font-bold mb-2 ml-1">Enter Amount (₹)</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-500">₹</span>
                    <input 
                      {...register('amount', { valueAsNumber: true })}
                      type="number" 
                      placeholder="100 - 50,000"
                      className="w-full bg-[#1e2638] border border-gray-700 rounded-xl py-4 pl-10 pr-4 text-lg font-bold focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-600"
                    />
                </div>
                {errors.amount && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.amount.message}</p>}
            </div>

            {/* UTR Input */}
            <div>
                <label className="block text-[11px] text-gray-400 uppercase font-bold mb-2 ml-1">12-Digit UTR Number</label>
                <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input 
                      {...register('utrNumber')}
                      type="text" 
                      maxLength={12}
                      placeholder="Enter UTR / Ref No."
                      className="w-full bg-[#1e2638] border border-gray-700 rounded-xl py-4 pl-12 pr-4 font-mono text-sm tracking-widest focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-600"
                    />
                </div>
                {errors.utrNumber && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.utrNumber.message}</p>}
            </div>

            {/* Screenshot Upload */}
            <div>
                <label className="block text-[11px] text-gray-400 uppercase font-bold mb-2 ml-1">Payment Proof</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                
                {screenshot ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-blue-500/50">
                        <img src={screenshot} alt="proof" className="w-full h-32 object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-blue-600 text-[10px] px-3 py-1 rounded-full font-bold flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> UPLOADED
                            </span>
                        </div>
                        <button onClick={() => setScreenshot(null)} className="absolute top-2 right-2 bg-red-500 p-1 rounded-full">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ) : (
                    <button 
                        type="button"
                        onClick={() => !uploading && fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-700 rounded-xl py-6 flex flex-col items-center justify-center bg-[#1e2638]/50 hover:bg-[#1e2638] transition-colors"
                    >
                        {uploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        ) : (
                            <>
                                <Upload className="h-6 w-6 text-blue-500 mb-2" />
                                <span className="text-[11px] font-bold text-gray-400 uppercase">Upload Screenshot</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </section>

        {/* Submit Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit(onSubmit)}
          disabled={submitting || uploading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(37,99,235,0.3)] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Add Money <ArrowRight className="h-5 w-5" />
            </>
          )}
        </motion.button>

        {/* Trust Badges */}
        <div className="flex justify-between items-center px-4 pt-4">
            <div className="flex flex-col items-center gap-1">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Secure</span>
            </div>
            <div className="h-8 w-[1px] bg-gray-800" />
            <div className="flex flex-col items-center gap-1">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">24/7 Support</span>
            </div>
            <div className="h-8 w-[1px] bg-gray-800" />
            <div className="flex flex-col items-center gap-1">
                <CheckCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Verified</span>
            </div>
        </div>

      </div>
    </div>
  );
};
export default AddMoney;
