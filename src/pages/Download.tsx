// src/pages/DownloadApp.tsx

import { useState, useEffect } from "react";

const APK_URL = "/BetaAdda.apk";
const WEBSITE_URL = "https://betadda.qzz.io/login"; // apna website URL yahan dalo
const APK_VERSION = "1.0.0";
const APK_SIZE = "1.7 MB";

  export default function DownloadApp() {
  const [downloading, setDownloading] = useState(false);
  const [particles, setParticles] = useState<
    { x: number; y: number; size: number; delay: number }[]
  >([]);
  const [activeTab, setActiveTab] = useState<"app" | "web">("app");
  const [downloadDone, setDownloadDone] = useState(false);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 4,
      }))
    );
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    setDownloadDone(false);
    const a = document.createElement("a");
    a.href = APK_URL;
    a.download = "BetAdda.apk";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      setDownloading(false);
      setDownloadDone(true);
    }, 3000);
  };

  const handleWebsite = () => {
    window.open(WEBSITE_URL, "_blank");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09060f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "24px",
      }}
    >
      {/* Animated background glows */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "30%",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "glow-move 6s ease-in-out infinite alternate",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "20%",
          width: "350px",
          height: "350px",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "glow-move 8s ease-in-out infinite alternate-reverse",
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "50%",
            background: `rgba(${i % 2 === 0 ? "245,158,11" : "139,92,246"},0.4)`,
            animation: `float ${3 + p.delay}s ease-in-out infinite alternate`,
            animationDelay: `${p.delay}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); opacity: 0.3; }
          to   { transform: translateY(-20px) scale(1.3); opacity: 0.9; }
        }
        @keyframes glow-move {
          from { transform: translate(0, 0); }
          to   { transform: translate(40px, 30px); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 20px rgba(245,158,11,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes badge-pop {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes checkmark {
          0%   { stroke-dashoffset: 30; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes tab-glow {
          0%, 100% { box-shadow: 0 0 12px rgba(245,158,11,0.3); }
          50%       { box-shadow: 0 0 24px rgba(245,158,11,0.6); }
        }
        .download-btn:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.02) !important;
          box-shadow: 0 24px 60px rgba(245,158,11,0.5) !important;
        }
        .download-btn:active:not(:disabled) {
          transform: translateY(0px) scale(0.98) !important;
        }
        .web-btn:hover {
          transform: translateY(-3px) scale(1.02) !important;
          box-shadow: 0 24px 60px rgba(139,92,246,0.4) !important;
          border-color: rgba(139,92,246,0.6) !important;
          background: rgba(139,92,246,0.12) !important;
        }
        .web-btn:active {
          transform: translateY(0px) scale(0.98) !important;
        }
        .step-card:hover {
          border-color: rgba(245,158,11,0.4) !important;
          background: rgba(245,158,11,0.06) !important;
          transform: translateX(4px);
        }
        .tab-btn {
          transition: all 0.25s ease !important;
        }
        .tab-btn:hover {
          opacity: 1 !important;
        }
        .feature-pill:hover {
          background: rgba(245,158,11,0.15) !important;
          border-color: rgba(245,158,11,0.4) !important;
        }
      `}</style>

      {/* Main card */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: "28px",
          padding: "44px 36px 36px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          backdropFilter: "blur(24px)",
          position: "relative",
          zIndex: 1,
          animation: "slide-up 0.5s ease",
        }}
      >
        {/* Version badge */}
        <div
          style={{
            position: "absolute",
            top: "-14px",
            right: "24px",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            borderRadius: "20px",
            padding: "5px 14px",
            fontSize: "11px",
            fontWeight: 800,
            color: "#09060f",
            letterSpacing: "0.5px",
            animation: "badge-pop 0.6s ease 0.3s both",
            boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
          }}
        >
          v{APK_VERSION} NEW
        </div>

        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              animation: "pulse-ring 2.5s ease-in-out infinite",
              borderRadius: "50%",
              padding: "3px",
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.05))",
            }}
          >
            <img
              src="/logo.png"
              alt="BetAdda"
              width={96}
              height={96}
              style={{
                borderRadius: "50%",
                display: "block",
                border: "2px solid rgba(245,158,11,0.3)",
              }}
            />
          </div>
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "4px",
            color: "#f59e0b",
            textTransform: "uppercase",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Official App
        </div>

        <h1
          style={{
            fontSize: "34px",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 6px",
            letterSpacing: "-0.5px",
            background: "linear-gradient(135deg, #fff 40%, #f59e0b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          BetAdda
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "14px",
            margin: "0 0 24px",
            lineHeight: 1.6,
          }}
        >
          Play Smart, Win Big
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          {[
            { icon: "⚡", label: "2x Fast" },
            { icon: "🔒", label: "Secure" },
            { icon: "🎯", label: "Live Odds" },
            { icon: "💰", label: "Instant Withdraw" },
          ].map((f) => (
            <div
              key={f.label}
              className="feature-pill"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "20px",
                fontSize: "12px",
                color: "rgba(255,255,255,0.7)",
                transition: "all 0.2s ease",
                cursor: "default",
              }}
            >
              <span>{f.icon}</span>
              <span style={{ fontWeight: 600 }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginBottom: "28px",
            padding: "16px",
            background: "rgba(245,158,11,0.05)",
            borderRadius: "16px",
            border: "1px solid rgba(245,158,11,0.1)",
          }}
        >
          {[
            { label: "Version", value: `v${APK_VERSION}` },
            { label: "Size", value: APK_SIZE },
            { label: "Platform", value: "Android" },
            { label: "Rating", value: "4.8 ★" },
          ].map((s) => (
            <div key={s.label}>
              <div
                style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b" }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.3)",
                  marginTop: "2px",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ───────────────────── TWO BUTTONS ───────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* ── Download APK Button ── */}
          <div style={{ position: "relative" }}>
            {/* 2x Fast badge on button */}
            <div
              style={{
                position: "absolute",
                top: "-10px",
                left: "16px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                borderRadius: "10px",
                padding: "3px 10px",
                fontSize: "10px",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "0.5px",
                zIndex: 2,
                boxShadow: "0 2px 8px rgba(16,185,129,0.5)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>⚡</span>
              <span>2x FAST</span>
            </div>

            <button
              className="download-btn"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                width: "100%",
                padding: "20px",
                paddingTop: "24px",
                background: downloadDone
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : downloading
                  ? "rgba(245,158,11,0.25)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%)",
                backgroundSize: "200% auto",
                animation:
                  downloading || downloadDone ? undefined : "shimmer 3s linear infinite",
                border: "none",
                borderRadius: "16px",
                color: downloading ? "rgba(255,255,255,0.5)" : "#09060f",
                fontSize: "16px",
                fontWeight: 800,
                cursor: downloading ? "not-allowed" : "pointer",
                transition: "all 0.25s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                letterSpacing: "0.3px",
                boxShadow: downloadDone
                  ? "0 8px 32px rgba(16,185,129,0.4)"
                  : "0 8px 32px rgba(245,158,11,0.35)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* shine sweep */}
              {!downloading && !downloadDone && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "60%",
                    height: "100%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                    animation: "shimmer 2.5s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                />
              )}

              {downloading ? (
                <>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#f59e0b",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>
                    Downloading...
                  </span>
                </>
              ) : downloadDone ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <polyline
                      points="20 6 9 17 4 12"
                      stroke="#09060f"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 30,
                        animation: "checkmark 0.4s ease forwards",
                      }}
                    />
                  </svg>
                  <span style={{ color: "#09060f" }}>Downloaded!</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 16l-6-6h4V4h4v6h4l-6 6z"
                      fill="currentColor"
                    />
                    <path d="M4 20h16v-2H4v2z" fill="currentColor" />
                  </svg>
                  Download APK
                </>
              )}
            </button>
          </div>

          {/* ── Visit Website Button ── */}
          <button
            className="web-btn"
            onClick={handleWebsite}
            style={{
              width: "100%",
              padding: "18px",
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.35)",
              borderRadius: "16px",
              color: "#a78bfa",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.25s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              letterSpacing: "0.3px",
              boxShadow: "0 4px 20px rgba(139,92,246,0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M3 12h18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M3 8h18M3 16h18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.5"
              />
            </svg>
            Open Website
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              style={{ opacity: 0.6 }}
            >
              <path
                d="M7 17L17 7M17 7H7M17 7v10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {/* ─────────────────────────────────────────────────────── */}

        <p
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.2)",
            marginTop: "16px",
            marginBottom: "0",
          }}
        >
          Android 8.0+ required · 100% Safe & Verified
        </p>
      </div>

      {/* Install steps */}
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          marginTop: "20px",
          position: "relative",
          zIndex: 1,
          animation: "slide-up 0.5s ease 0.2s both",
        }}
      >
        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: "rgba(255,255,255,0.25)",
            marginBottom: "12px",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          Install Steps
        </p>

        {[
          {
            n: "1",
            icon: "⬇️",
            text: "Download APK file",
            sub: "Tap the Download button above",
          },
          {
            n: "2",
            icon: "⚙️",
            text: "Allow Unknown Sources",
            sub: "Settings → Security → Unknown Sources ON",
          },
          {
            n: "3",
            icon: "📦",
            text: "Install & Launch",
            sub: "Open downloaded file → Install → Enjoy",
          },
        ].map((step, idx) => (
          <div
            key={step.n}
            className="step-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "14px 18px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "14px",
              marginBottom: "8px",
              transition: "all 0.2s ease",
              cursor: "default",
              animation: `slide-up 0.4s ease ${0.3 + idx * 0.1}s both`,
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
              }}
            >
              {step.icon}
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.75)",
                  fontWeight: 600,
                  marginBottom: "2px",
                }}
              >
                {step.text}
              </div>
              <div
                style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
              >
                {step.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: "11px",
          color: "rgba(255,255,255,0.15)",
          marginTop: "20px",
          textAlign: "center",
        }}
      >
        © 2025 BetAdda · All rights reserved
      </p>
    </div>
  );
}

