// src/pages/Support.tsx
// AI Support Chat — betadda_admin ke /api/chat (NVIDIA-backed) se powered
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, Sparkles, Trash2, Loader2, MessageCircleQuestion,
  Wallet, ArrowUpCircle, Gamepad2, Gift,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPPORT_API = 'https://betaddaadmin.vercel.app/api/chat';
// Admin backend ke PUBLIC_API_KEY se match hona chahiye (agar wahan set hai).
// betadda ke .env mein: VITE_SUPPORT_API_KEY=<same-value>
const SUPPORT_API_KEY = import.meta.env.VITE_SUPPORT_API_KEY as string | undefined;

const SYSTEM_PROMPT = `You are "Adda AI", the friendly support assistant for BetAdda Casino — a real-money gaming app with Poker, Nine Card (Teen Patti style), 3 Pair Card (Joker Pair), Tic Tac Toe, Ludo and Tambola.

Key app knowledge:
- Wallet has 4 balances: Deposit (used FIRST in games), Winning (fully withdrawable, min ₹100), Bonus (only 10% usable per bet), Referral (fully usable in games).
- Add money via UPI on the Add Money page. Withdrawals go to UPI from the Withdraw page (winning balance only, min ₹100).
- Users can redeem codes on the Redeem Code page.
- Referral program: share your code, earn referral balance when friends join and play.
- Games are real-time multiplayer with entry fees/boot amounts taken from wallet.

Rules:
- Reply in the same language the user writes (Hindi, Hinglish, or English).
- Be concise, warm and helpful. Use short paragraphs or bullets.
- For account-specific issues (missing deposit, stuck withdrawal, banned account), politely say you can't access accounts and to contact human support via Telegram/email from the app.
- Never invent balances, transactions, or promises about money. Never share internal/technical details.
- Encourage responsible gaming when relevant. Users must be 18+.`;

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const QUICK_QUESTIONS = [
  { icon: Wallet,          text: 'Deposit balance kaise use hota hai?' },
  { icon: ArrowUpCircle,   text: 'Withdrawal kaise karu?' },
  { icon: Gift,            text: 'Bonus balance ka rule kya hai?' },
  { icon: Gamepad2,        text: 'Poker kaise khelte hain?' },
];

const STORAGE_KEY = 'betadda-support-chat';

// ─── Typing dots ──────────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-1.5">
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        className="h-1.5 w-1.5 rounded-full bg-yellow-400"
      />
    ))}
  </div>
);

// ─── Message bubble ───────────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: ChatMsg }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/20">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed sm:max-w-[70%] ${
          isUser
            ? 'rounded-br-md bg-gradient-to-br from-yellow-500/90 to-orange-500/90 font-medium text-black shadow-lg shadow-yellow-500/10'
            : 'rounded-bl-md border border-white/10 bg-white/[0.05] text-gray-200'
        }`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export const Support: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* corrupt cache — start fresh */ }
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist chat locally (last 40 msgs)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))); }
    catch { /* storage full — ignore */ }
  }, [messages]);

  // Auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    const userMsg: ChatMsg = { role: 'user', content: message, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(SUPPORT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SUPPORT_API_KEY ? { 'x-api-key': SUPPORT_API_KEY } : {}),
        },
        body: JSON.stringify({
          message,
          system: SYSTEM_PROMPT + (user?.name ? `\nThe user's display name is "${user.name}".` : ''),
          history,
        }),
      });
      const data = await res.json();
      const reply: string = data?.ok && data?.reply
        ? data.reply
        : 'Sorry, abhi connect nahi ho pa raha. Thodi der baad try karo ya Telegram support se contact karo. 🙏';
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Network issue lag raha hai — internet check karke dobara try karo. 🙏',
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[#080512] p-0 sm:p-4 lg:p-6">
      <div className="relative mx-auto flex min-h-[420px] w-full max-w-3xl flex-1 flex-col overflow-hidden bg-[#0b0715]/80 shadow-2xl sm:rounded-3xl sm:border sm:border-white/10">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

      {/* ── Chat header ── */}
      <div className="relative flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/25">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0715] bg-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black text-white">Adda AI</h2>
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            </div>
            <p className="text-[10px] font-medium text-emerald-400">Online · 24×7 Support</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            aria-label="Clear chat"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-500 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-full flex-col items-center justify-center gap-4 py-2 text-center"
          >
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-3xl border border-yellow-500/25 bg-yellow-500/10">
              <MessageCircleQuestion className="h-7 w-7 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Namaste{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
              </h3>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-gray-500">
                Main Adda AI hoon — wallet, games, withdrawal ya kisi bhi sawal mein madad karunga.
              </p>
            </div>

            {/* Quick questions */}
            <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_QUESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => send(text)}
                  className="group flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition-all hover:border-yellow-500/30 hover:bg-yellow-500/[0.06]"
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-yellow-400/70 transition-colors group-hover:text-yellow-400" />
                  <span className="text-[11px] font-medium text-gray-400 transition-colors group-hover:text-gray-200">
                    {text}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => <Bubble key={msg.ts + msg.role} msg={msg} />)}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/20">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-3.5 py-2">
              <TypingDots />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <div className="relative flex-shrink-0 border-t border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
        <form
          onSubmit={e => { e.preventDefault(); send(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Apna sawal likho…"
            maxLength={600}
            className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-[13px] text-white placeholder-gray-600 outline-none transition-all focus:border-yellow-500/40 focus:bg-white/[0.07]"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.92 }}
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/25 transition-all disabled:opacity-40 disabled:shadow-none"
          >
            {loading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <Send className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />}
          </motion.button>
        </form>
        <p className="mt-1.5 text-center text-[9px] text-gray-600">
          AI responses may be inaccurate · Account issues ke liye human support se contact karo
        </p>
      </div>
      </div>
    </div>
  );
};

export default Support;
