import React, { useState, useEffect, useRef } from "react";
import {
  Trophy, Users, Crown, Swords, Grid3X3, Layers,
  LayoutDashboard, Gift, Clock, Wallet, Palette,
  ShieldCheck, Zap, Gamepad2, Headphones, Ticket,
  UserCheck, ChevronRight, Send, CheckCircle,
  Star, Sparkles, Timer, ArrowRight, Instagram,
  Linkedin, Youtube, Heart, Flame
} from "lucide-react";

/* ─── Google Sheets Web App URL ────────────────────────── */
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyNldKjT4Er1Vsgqm9IMq-HvzjsdAb7hFlAa1d7ltng7VukQgFrSuikzg6Lw-1sCnU/exec";

/* ─── Game Data ────────────────────────────────────────── */
const games = [
  { name: "Poker", icon: "🃏", desc: "Bluff, bet & win big", tag: "2-10 Players", color: "#a855f7" },
  { name: "9 Card", icon: "9️⃣", desc: "Race to 9 with the sharpest hand", tag: "2-6 Players", color: "#60a5fa" },
  { name: "Ludo", icon: "🎲", desc: "Classic board game fun", tag: "2-4 Players", color: "#c084fc" },
  { name: "Card Battle", icon: "⚔️", desc: "Deploy warriors & destroy opponents", tag: "2 Players", color: "#4ade80" },
  { name: "Tic Tac Toe", icon: "❌", desc: "Outsmart in X's & O's", tag: "2 Players", color: "#f472b6" },
  { name: "3 Pair Card", icon: "🂠", desc: "Match 3 pairs before anyone", tag: "2-4 Players", color: "#fb923c" },
];

const features = [
  { icon: LayoutDashboard, title: "Smart Dashboard", desc: "Track wallet, wins & stats in real-time", color: "#facc15" },
  { icon: Gift, title: "Refer & Earn ₹50", desc: "Invite friends, earn instant bonus", color: "#f472b6" },
  { icon: Clock, title: "Transaction History", desc: "Every transaction, fully transparent", color: "#60a5fa" },
  { icon: Wallet, title: "Withdrawal History", desc: "Track all your cashouts easily", color: "#4ade80" },
  { icon: Palette, title: "Premium UI", desc: "Beautiful, smooth, glass-morphism design", color: "#c084fc" },
  { icon: Star, title: "Use Bonus 10%", desc: "Apply bonus on every game entry", color: "#fb923c" },
];

const sections = [
  { icon: ShieldCheck, title: "100% Safe & Secure", desc: "Your data & money are encrypted with bank-grade security", color: "#4ade80" },
  { icon: Zap, title: "Instant Withdrawal", desc: "Withdraw winnings directly to your bank in seconds", color: "#facc15" },
  { icon: Users, title: "Real Player Game", desc: "Play with real people — no bots, no AI, pure skill", color: "#60a5fa" },
  { icon: Headphones, title: "24/7 Customer Support", desc: "Our team is always ready to help via chat & call", color: "#f472b6" },
  { icon: Ticket, title: "Festival Redeem Codes", desc: "Exclusive free codes during Diwali, Holi, Eid & more", color: "#fb923c" },
  { icon: UserCheck, title: "P2P Only Games", desc: "Every game is Person to Person — fair & transparent", color: "#c084fc" },
];

/* ─── Countdown ────────────────────────────────────────── */
const LAUNCH_DATE = new Date("2026-07-01T10:00:00+05:30").getTime();

function useCountdown(target: number) {
  const [time, setTime] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  return time;
}

/* ─── Main Component ───────────────────────────────────── */
const Launch: React.FC = () => {
  const { days, hours, mins, secs } = useCountdown(LAUNCH_DATE);

  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setError("Please fill all fields");
      return;
    }
    setSending(true);
    setError("");
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setSent(true);
      setFormData({ name: "", email: "", message: "" });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  };

  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible((v) => ({ ...v, [e.target.id]: true }));
        });
      },
      { threshold: 0.12 }
    );
    Object.values(refs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = (id: string) => (el: HTMLDivElement | null) => {
    refs.current[id] = el;
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          overflow-x: hidden !important;
          -webkit-text-size-adjust: 100% !important;
          background: #030308;
        }

        .launch-page {
          width: 100%;
          min-height: 100vh;
          background: #030308;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* ══════════════════════════════════════════════════
           FOUNDER BANNER
        ══════════════════════════════════════════════════ */
        .founder-banner {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          padding: 16px 14px 0;
        }

        .founder-card {
          position: relative;
          background: rgba(255,255,255,0.02);
          border-radius: 20px;
          padding: 22px 16px 18px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.05);
        }

        /* Animated gradient border */
        .founder-border {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          padding: 1.5px;
          background: linear-gradient(135deg, #a855f7, #ec4899, #f59e0b, #a855f7);
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite;
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* Glow orbs */
        .founder-glow {
          position: absolute;
          top: -50px;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .founder-glow-right {
          position: absolute;
          bottom: -30px;
          right: -30px;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Grid pattern */
        .founder-grid-pattern {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 18px 18px;
          pointer-events: none;
          border-radius: 20px;
        }

        .founder-inner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        /* Badge */
        .founder-badge-top {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(168,85,247,0.1);
          border: 1px solid rgba(168,85,247,0.22);
          border-radius: 999px;
          padding: 4px 12px;
          margin-bottom: 14px;
        }

        .founder-badge-text {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #c084fc;
        }

        /* ── Avatar (IMAGE) ── */
        .founder-avatar-wrap {
          position: relative;
          margin-bottom: 12px;
        }

        .founder-avatar-ring {
          width: 95px;
          height: 95px;
          border-radius: 20px;
          padding: 2.5px;
          background: linear-gradient(135deg, #a855f7, #ec4899, #f59e0b);
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .founder-avatar-inner {
          width: 100%;
          height: 100%;
          border-radius: 17px;
          background: #0f0a1a;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .founder-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Fallback initials (shown if image fails) */
        .founder-avatar-fallback {
          display: none;
          font-family: 'Rajdhani', sans-serif;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .founder-avatar-inner.no-img .founder-avatar-fallback {
          display: block;
        }

        /* Verified badge */
        .founder-avatar-badge {
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          border: 2.5px solid #0f0a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
        }

        .founder-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 2px;
        }

        .founder-role {
          font-size: 11px;
          color: rgba(255,255,255,0.38);
          margin-bottom: 10px;
        }

        .founder-role span {
          color: #c084fc;
          font-weight: 600;
        }

        /* ── Social Links ── */
        .founder-socials {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .founder-social-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.15s, filter 0.15s;
          border: 1px solid transparent;
        }

        .founder-social-link:hover { transform: scale(1.04); filter: brightness(1.1); }
        .founder-social-link:active { transform: scale(0.97); }

        .social-insta {
          background: rgba(225,48,108,0.12);
          border-color: rgba(225,48,108,0.28);
          color: #e1306c;
        }

        .social-twitter {
          background: rgba(29,161,242,0.1);
          border-color: rgba(29,161,242,0.22);
          color: #1da1f2;
        }

        .social-linkedin {
          background: rgba(10,102,194,0.1);
          border-color: rgba(10,102,194,0.22);
          color: #0a66c2;
        }

        .founder-quote {
          font-size: 10.5px;
          color: rgba(255,255,255,0.28);
          line-height: 1.5;
          max-width: 270px;
          font-style: italic;
        }

        .founder-quote em {
          color: rgba(168,85,247,0.55);
          font-style: italic;
        }

        /* ══════════════════════════════════════════════════
           HERO
        ══════════════════════════════════════════════════ */
        .hero {
          position: relative;
          padding: 44px 16px 40px;
          text-align: center;
          background: radial-gradient(ellipse at 50% 0%, rgba(88,28,135,0.2) 0%, #030308 65%);
          overflow: hidden;
        }

        .hero-orb-1 {
          position: absolute;
          top: -110px;
          left: -70px;
          width: 240px;
          height: 240px;
          background: rgba(168,85,247,0.09);
          border-radius: 50%;
          filter: blur(75px);
          pointer-events: none;
        }

        .hero-orb-2 {
          position: absolute;
          bottom: -70px;
          right: -50px;
          width: 200px;
          height: 200px;
          background: rgba(244,114,182,0.07);
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(168,85,247,0.09);
          border: 1px solid rgba(168,85,247,0.22);
          border-radius: 999px;
          padding: 5px 13px;
          font-size: 9.5px;
          font-weight: 600;
          color: #c084fc;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 16px;
          position: relative;
          z-index: 2;
        }

        .hero-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #c084fc;
          animation: pulse-dot 2s infinite;
        }

        .hero-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: clamp(32px, 8.5vw, 54px);
          font-weight: 700;
          color: #fff;
          line-height: 1.05;
          margin-bottom: 7px;
          position: relative;
          z-index: 2;
        }

        .hero-title .gradient {
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          font-size: 12.5px;
          color: rgba(255,255,255,0.38);
          max-width: 300px;
          margin: 0 auto 22px;
          line-height: 1.6;
          position: relative;
          z-index: 2;
        }

        /* ── Countdown ── */
        .countdown {
          display: flex;
          justify-content: center;
          gap: 5px;
          margin-bottom: 8px;
          position: relative;
          z-index: 2;
        }

        .cd-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 54px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 11px;
          padding: 9px 4px 7px;
          backdrop-filter: blur(10px);
        }

        .cd-num {
          font-family: 'Rajdhani', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }

        .cd-label {
          font-size: 7.5px;
          color: rgba(255,255,255,0.28);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 3px;
        }

        .cd-sep {
          font-family: 'Rajdhani', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: rgba(168,85,247,0.4);
          align-self: flex-start;
          padding-top: 9px;
          animation: blink-sep 1s step-end infinite;
        }

        .launch-date {
          font-size: 10.5px;
          color: rgba(255,255,255,0.28);
          position: relative;
          z-index: 2;
          margin-top: 5px;
        }

        .launch-date strong { color: #c084fc; }

        /* ── Section Wrapper ── */
        .section {
          max-width: 520px;
          margin: 0 auto;
          padding: 0 14px;
        }

        .section-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: clamp(19px, 4.5vw, 26px);
          font-weight: 700;
          color: #fff;
          text-align: center;
          margin-bottom: 4px;
          line-height: 1.15;
        }

        .section-title .gradient {
          background: linear-gradient(90deg, #a855f7, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-sub {
          font-size: 11.5px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          margin-bottom: 16px;
          max-width: 310px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.55;
        }

        .divider-center {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin: 28px auto 24px;
          max-width: 160px;
        }
        .divider-center-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(168,85,247,0.28));
        }
        .divider-center-line.r {
          background: linear-gradient(90deg, rgba(168,85,247,0.28), transparent);
        }
        .divider-center-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #a855f7;
          box-shadow: 0 0 5px #a855f7;
        }

        /* ── Games Grid ── */
        .games-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7px;
        }

        @media (min-width: 500px) {
          .games-grid { grid-template-columns: repeat(3, 1fr); gap: 9px; }
        }

        .game-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.045);
          border-radius: 13px;
          padding: 12px 8px 10px;
          text-align: center;
          transition: border-color 0.25s, transform 0.25s;
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
        }

        .game-card.visible { animation: reveal 0.4s ease forwards; }
        .game-card:hover { border-color: rgba(255,255,255,0.1); transform: translateY(-3px); }

        .game-card-glow {
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          width: 65px;
          height: 65px;
          border-radius: 50%;
          filter: blur(25px);
          opacity: 0.1;
          pointer-events: none;
        }

        .game-emoji { font-size: 26px; margin-bottom: 4px; display: block; position: relative; z-index: 2; }
        .game-name { font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 1px; position: relative; z-index: 2; }
        .game-desc { font-size: 9px; color: rgba(255,255,255,0.28); line-height: 1.35; margin-bottom: 5px; position: relative; z-index: 2; }

        .game-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 8px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 999px;
          position: relative;
          z-index: 2;
        }

        /* ── Features ── */
        .features-list { display: flex; flex-direction: column; gap: 6px; }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.018);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 10px 11px;
          transition: border-color 0.2s, transform 0.2s;
          opacity: 0;
          transform: translateY(10px);
        }

        .feature-item.visible { animation: reveal 0.35s ease forwards; }
        .feature-item:hover { border-color: rgba(255,255,255,0.09); transform: translateX(2px); }

        .feature-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-info { flex: 1; min-width: 0; }
        .feature-title { font-family: 'Rajdhani', sans-serif; font-size: 12.5px; font-weight: 700; color: #fff; line-height: 1.2; }
        .feature-desc { font-size: 9.5px; color: rgba(255,255,255,0.28); line-height: 1.4; margin-top: 1px; }

        /* ── Why Us ── */
        .section-cards { display: grid; grid-template-columns: 1fr; gap: 6px; }
        @media (min-width: 500px) { .section-cards { grid-template-columns: 1fr 1fr; gap: 7px; } }

        .sec-card {
          background: rgba(255,255,255,0.018);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 11px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          transition: border-color 0.2s;
          opacity: 0;
          transform: translateY(10px);
        }

        .sec-card.visible { animation: reveal 0.35s ease forwards; }
        .sec-card:hover { border-color: rgba(255,255,255,0.09); }

        .sec-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sec-num { font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.045); line-height: 1; margin-bottom: 1px; }
        .sec-title { font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 700; color: #fff; line-height: 1.2; }
        .sec-desc { font-size: 9px; color: rgba(255,255,255,0.26); line-height: 1.4; margin-top: 1px; }

        /* ── Feedback ── */
        .feedback-box {
          background: rgba(255,255,255,0.018);
          border: 1px solid rgba(255,255,255,0.045);
          border-radius: 15px;
          padding: 16px 13px;
          max-width: 420px;
          margin: 0 auto;
        }

        .fb-group { margin-bottom: 8px; }
        .fb-label { display: block; font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.4); margin-bottom: 4px; }

        .fb-input {
          width: 100%;
          padding: 8px 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          color: #fff;
          font-size: 12px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .fb-input::placeholder { color: rgba(255,255,255,0.16); }
        .fb-input:focus { border-color: rgba(168,85,247,0.4); }
        textarea.fb-input { resize: vertical; min-height: 64px; }

        .fb-btn {
          width: 100%;
          padding: 9px;
          border: none;
          border-radius: 9px;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: opacity 0.2s, transform 0.15s;
        }
        .fb-btn:hover { opacity: 0.9; }
        .fb-btn:active { transform: scale(0.98); }
        .fb-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .fb-success { text-align: center; padding: 18px 0 4px; }
        .fb-success-icon { width: 44px; height: 44px; border-radius: 50%; background: rgba(74,222,128,0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 7px; }
        .fb-success-text { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; color: #4ade80; margin-bottom: 2px; }
        .fb-success-sub { font-size: 10.5px; color: rgba(255,255,255,0.3); }
        .fb-error { font-size: 10px; color: #f87171; text-align: center; margin-top: 6px; }

        /* ── CTA ── */
        .cta-box {
          background: linear-gradient(135deg, rgba(88,28,135,0.22), rgba(157,23,75,0.16));
          border: 1px solid rgba(168,85,247,0.16);
          border-radius: 15px;
          padding: 22px 16px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-glow {
          position: absolute;
          top: -35px;
          right: -35px;
          width: 110px;
          height: 110px;
          background: rgba(168,85,247,0.08);
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }

        .cta-buttons {
          display: flex;
          gap: 6px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
          z-index: 2;
        }

        .cta-btn-primary {
          padding: 8px 20px;
          border-radius: 9px;
          border: none;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: #fff;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Inter', sans-serif;
          transition: transform 0.15s;
        }
        .cta-btn-primary:active { transform: scale(0.97); }

        .cta-btn-secondary {
          padding: 8px 16px;
          border-radius: 9px;
          border: 1px solid rgba(168,85,247,0.22);
          background: rgba(168,85,247,0.07);
          color: #c084fc;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s;
        }
        .cta-btn-secondary:hover { border-color: rgba(168,85,247,0.45); }

        /* ── Footer ── */
        .launch-footer {
          text-align: center;
          padding: 28px 16px 40px;
          border-top: 1px solid rgba(255,255,255,0.03);
          margin-top: 36px;
        }

        .footer-brand {
          font-family: 'Rajdhani', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 3px;
        }

        .footer-brand .gradient {
          background: linear-gradient(135deg, #a855f7, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .footer-copy { font-size: 9.5px; color: rgba(255,255,255,0.16); line-height: 1.5; }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 8px;
        }
        .footer-links a { font-size: 9.5px; color: rgba(255,255,255,0.22); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: rgba(255,255,255,0.5); }

        /* ── Animations ── */
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.65); }
        }

        @keyframes blink-sep {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.12; }
        }

        @keyframes reveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="launch-page">

        {/* ═══════════════ FOUNDER BANNER ═══════════════ */}
        <div className="founder-banner" ref={addRef("founder")}>
          <div className="founder-card">
            <div className="founder-border" />
            <div className="founder-glow" />
            <div className="founder-glow-right" />
            <div className="founder-grid-pattern" />

            <div className="founder-inner">
              {/* Badge */}
              <div className="founder-badge-top">
                <Flame className="w-3 h-3" style={{ color: "#f59e0b" }} />
                <span className="founder-badge-text">Founder of BetAdda</span>
              </div>

              {/* Avatar with Image */}
              <div className="founder-avatar-wrap">
                <div className="founder-avatar-ring">
                  <div className="founder-avatar-inner" id="founder-avatar">
                    <img
                      src="/CEO.webp"
                      alt="Shariq Babu - Founder"
                      className="founder-avatar-img"
                      onError={(e) => {
                        const parent = document.getElementById("founder-avatar");
                        if (parent) parent.classList.add("no-img");
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="founder-avatar-fallback">SB</span>
                  </div>
                </div>

                {/* Verified badge */}
                <div className="founder-avatar-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Name & Role */}
              <div className="founder-name">Shrq Babu</div>
              <div className="founder-role">
                Built <span>BetAdda</span> from scratch 🚀
              </div>

              {/* Social Links */}
              <div className="founder-socials">
                <a
                  href="https://instagram.com/shrq_babu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="founder-social-link social-insta"
                >
                  <Instagram className="w-3 h-3" />
                  @shrq_Babu
                </a>

                <a
                  href="https://www.youtube.com/shorts/6V5YIh8pGUw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="founder-social-link social-insta"
                >
                  <Youtube className="w-3 h-3" />
                  App Preview
                </a>

                <a
                  href="https://linkedin.com/in/shrq-babu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="founder-social-link social-linkedin"
                >
                  <Linkedin className="w-3 h-3" />
                </a>
              </div>

              {/* Quote */}
              <p className="founder-quote">
                <em>"</em>Gaming should be fair, fun & rewarding for everyone.
                That's why we built BetAdda.<em>"</em>
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════ HERO ═══════════════ */}
        <div className="hero">
          <div className="hero-orb-1" />
          <div className="hero-orb-2" />

          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Launching Soon
          </div>

          <h1 className="hero-title">
            Play. Win.<br />
            <span className="gradient">Dominate.</span>
          </h1>

          <p className="hero-sub">
            India's premium multiplayer gaming platform. Real players, real rewards.
          </p>

          <div className="countdown">
            <div className="cd-block">
              <span className="cd-num">{pad(days)}</span>
              <span className="cd-label">Days</span>
            </div>
            <span className="cd-sep">:</span>
            <div className="cd-block">
              <span className="cd-num">{pad(hours)}</span>
              <span className="cd-label">Hours</span>
            </div>
            <span className="cd-sep">:</span>
            <div className="cd-block">
              <span className="cd-num">{pad(mins)}</span>
              <span className="cd-label">Mins</span>
            </div>
            <span className="cd-sep">:</span>
            <div className="cd-block">
              <span className="cd-num">{pad(secs)}</span>
              <span className="cd-label">Secs</span>
            </div>
          </div>

          <p className="launch-date">
            📅 <strong>1 July 2026</strong> at <strong>10:00 AM IST</strong>
          </p>
        </div>

        {/* ═══════════════ GAMES ═══════════════ */}
        <div className="divider-center">
          <div className="divider-center-line" />
          <div className="divider-center-dot" />
          <div className="divider-center-line r" />
        </div>

        <div className="section" ref={addRef("games")}>
          <h2 className="section-title">
            All Multiplayer <span className="gradient">Games</span>
          </h2>
          <p className="section-sub">
            Compete with real players in skill-based games. Every match is fair.
          </p>

          <div className="games-grid">
            {games.map((g, i) => (
              <div
                key={g.name}
                id={`game-${i}`}
                ref={addRef(`game-${i}`)}
                className={`game-card ${visible[`game-${i}`] ? "visible" : ""}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="game-card-glow" style={{ background: g.color }} />
                <span className="game-emoji">{g.icon}</span>
                <div className="game-name">{g.name}</div>
                <div className="game-desc">{g.desc}</div>
                <span
                  className="game-tag"
                  style={{
                    background: `${g.color}14`,
                    border: `1px solid ${g.color}28`,
                    color: g.color,
                  }}
                >
                  <Users className="w-2.5 h-2.5" />
                  {g.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <div className="divider-center">
          <div className="divider-center-line" />
          <div className="divider-center-dot" />
          <div className="divider-center-line r" />
        </div>

        <div className="section" ref={addRef("features")}>
          <h2 className="section-title">
            Powerful <span className="gradient">Features</span>
          </h2>
          <p className="section-sub">
            Everything you need for the ultimate gaming experience.
          </p>

          <div className="features-list">
            {features.map((f, i) => (
              <div
                key={f.title}
                id={`feat-${i}`}
                ref={addRef(`feat-${i}`)}
                className={`feature-item ${visible[`feat-${i}`] ? "visible" : ""}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="feature-icon" style={{ background: `${f.color}10` }}>
                  <f.icon style={{ color: f.color, width: 16, height: 16 }} />
                </div>
                <div className="feature-info">
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.desc}</div>
                </div>
                <ChevronRight style={{ color: "rgba(255,255,255,0.1)", width: 14, height: 14, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════ WHY US ═══════════════ */}
        <div className="divider-center">
          <div className="divider-center-line" />
          <div className="divider-center-dot" />
          <div className="divider-center-line r" />
        </div>

        <div className="section" ref={addRef("why")}>
          <h2 className="section-title">
            Why <span className="gradient">Choose Us?</span>
          </h2>
          <p className="section-sub">Built for trust, designed for fun.</p>

          <div className="section-cards">
            {sections.map((s, i) => (
              <div
                key={s.title}
                id={`sec-${i}`}
                ref={addRef(`sec-${i}`)}
                className={`sec-card ${visible[`sec-${i}`] ? "visible" : ""}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="sec-icon" style={{ background: `${s.color}10` }}>
                  <s.icon style={{ color: s.color, width: 15, height: 15 }} />
                </div>
                <div>
                  <div className="sec-num">0{i + 1}</div>
                  <div className="sec-title">{s.title}</div>
                  <div className="sec-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════ FEEDBACK ═══════════════ */}
        <div className="divider-center">
          <div className="divider-center-line" />
          <div className="divider-center-dot" />
          <div className="divider-center-line r" />
        </div>

        <div className="section">
          <h2 className="section-title">
            Share Your <span className="gradient">Feedback</span>
          </h2>
          <p className="section-sub">Help us build the best platform.</p>

          <div className="feedback-box">
            {sent ? (
              <div className="fb-success">
                <div className="fb-success-icon">
                  <CheckCircle style={{ color: "#4ade80", width: 24, height: 24 }} />
                </div>
                <div className="fb-success-text">Thank You!</div>
                <div className="fb-success-sub">Your feedback has been recorded 🙏</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="fb-group">
                  <label className="fb-label">Your Name</label>
                  <input
                    className="fb-input"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="fb-group">
                  <label className="fb-label">Email Address</label>
                  <input
                    className="fb-input"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="fb-group">
                  <label className="fb-label">Your Feedback</label>
                  <textarea
                    className="fb-input"
                    placeholder="Tell us what you think..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
                {error && <div className="fb-error">{error}</div>}
                <button className="fb-btn" type="submit" disabled={sending}>
                  {sending ? "Sending..." : <><Send style={{ width: 14, height: 14 }} /> Submit Feedback</>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ═══════════════ CTA ═══════════════ */}
        <div className="section" style={{ marginTop: 28 }}>
          <div className="cta-box">
            <div className="cta-glow" />
            <Sparkles style={{ color: "#c084fc", width: 26, height: 26, margin: "0 auto 8px", display: "block" }} />
            <h3 style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 19,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 4,
              position: "relative",
              zIndex: 2,
            }}>
              Ready to Play?
            </h3>
            <p style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.32)",
              marginBottom: 12,
              lineHeight: 1.5,
              position: "relative",
              zIndex: 2,
            }}>
              Join 50,000+ players waiting for launch.
            </p>
            <div className="cta-buttons">
              <button
                className="cta-btn-primary"
               onClick={() => navigator("/login")}
              >
                <ArrowRight style={{ width: 13, height: 13 }} />
                Get Early Access
              </button>
              <button
                className="cta-btn-secondary"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "BetAdda - Launching Soon!",
                      text: "Check out BetAdda - India's premium multiplayer gaming platform!",
                      url: window.location.href,
                    });
                  }
                }}
              >
                Share 📤
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <div className="launch-footer">
          <div className="footer-brand">
            🎮 <span className="gradient">Game BetAdda</span>
          </div>
          <div className="footer-copy">
            © 2026 Game BetAdda · All rights reserved<br />
            Made with ❤️ by <strong style={{ color: "rgba(255,255,255,0.38)" }}>Shrq Babu</strong>
          </div>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Launch;
