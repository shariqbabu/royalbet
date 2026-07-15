import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Phone,
  Camera,
  Save,
  Loader2,
  Shield,
  LogOut,
  Mail,
  Calendar,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { logOut } from '../firebase/auth';
import toast from 'react-hot-toast';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

const schema = z.object({
  name: z.string().min(2, 'Name too short'),
  phone: z.string().min(10, 'Invalid phone'),
});

type FormData = z.infer<typeof schema>;

  const Profile: React.FC = () => {
  const { user, firebaseUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'avatars');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      if (data.secure_url && firebaseUser) {
        await updateProfile(firebaseUser, { photoURL: data.secure_url });
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          photoURL: data.secure_url,
          updatedAt: serverTimestamp(),
        });
        toast.success('Avatar updated!');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await updateProfile(firebaseUser, { displayName: data.name });
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        name: data.name,
        phone: data.phone,
        updatedAt: serverTimestamp(),
      });
      toast.success('Profile updated!');
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logOut();
    toast.success('Logged out');
  };

  const avatarUrl = user?.photoURL || firebaseUser?.photoURL || '';
  const avatarLetter = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-purple-500/10 p-4 shadow-2xl sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="h-20 w-20 rounded-3xl border-2 border-yellow-500/30 object-cover shadow-2xl shadow-yellow-500/10 sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-400 to-orange-500 text-4xl font-black text-white shadow-2xl shadow-yellow-500/10 sm:h-24 sm:w-24">
                      {avatarLetter}
                    </div>
                  )}

                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500 text-black shadow-lg transition-all hover:bg-yellow-400 active:scale-95 disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleAvatarUpload(e.target.files[0])
                    }
                  />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                      Player Profile
                    </span>
                  </div>

                  <h1 className="truncate text-2xl font-black text-white sm:text-3xl">
                    {user?.name || 'Player'}
                  </h1>

                  <p className="mt-1 truncate text-sm text-gray-400">
                    {user?.email}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {user?.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4 text-yellow-400" />
                  <span className="text-[10px] uppercase tracking-wide">
                    Member Since
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-white">
                  {formatDate(user?.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Edit Form */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />

              <div className="relative">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10">
                    <User className="h-5 w-5 text-yellow-400" />
                  </div>

                  <div>
                    <h3 className="font-black text-white">Edit Profile</h3>
                    <p className="text-xs text-gray-500">
                      Update your personal details
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">
                      Full Name
                    </label>

                    <div className="group relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-yellow-400" />

                      <input
                        {...register('name')}
                        type="text"
                        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pl-10 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-yellow-500/45 focus:bg-black/35"
                      />
                    </div>

                    {errors.name && (
                      <p className="mt-1.5 text-xs font-medium text-red-400">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">
                      Phone Number
                    </label>

                    <div className="group relative">
                      <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-yellow-400" />

                      <input
                        {...register('phone')}
                        type="tel"
                        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pl-10 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-yellow-500/45 focus:bg-black/35"
                      />
                    </div>

                    {errors.phone && (
                      <p className="mt-1.5 text-xs font-medium text-red-400">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">
                      Email
                    </label>

                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />

                      <input
                        value={user?.email || ''}
                        disabled
                        className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-black/20 px-4 py-3 pl-10 text-sm text-gray-500"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 py-3 text-sm font-black text-black transition-all hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                </form>
              </div>
            </div>

            {/* Right Side */}
            <div className="space-y-5">
              {/* Account Info */}
              <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />

                <div className="relative flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/15">
                    <Shield className="h-5 w-5 text-blue-400" />
                  </div>

                  <div>
                    <p className="mb-1 text-sm font-black text-blue-300">
                      Account Security
                    </p>
                    <p className="text-xs leading-relaxed text-gray-400">
                      Keep your profile updated. Never share your login details
                      or OTP with anyone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-center shadow-xl">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                    <BadgeCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-black text-emerald-400">
                    Active
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-center shadow-xl">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10">
                    <Shield className="h-5 w-5 text-yellow-400" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Role
                  </p>
                  <p className="mt-1 text-sm font-black text-yellow-400">
                    {user?.isAdmin ? 'Admin' : 'Player'}
                  </p>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-red-500/10 p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-500/20 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/15">
                      <LogOut className="h-5 w-5 text-red-400" />
                    </div>

                    <div>
                      <h3 className="font-black text-red-400">
                        Account Actions
                      </h3>
                      <p className="text-xs text-gray-500">
                        Logout from your account
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/15 py-3 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-95"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default Profile;
