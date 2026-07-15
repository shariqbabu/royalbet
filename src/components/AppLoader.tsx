// src/components/AppLoader.tsx

import React from 'react';

export const AppLoader: React.FC = () => {
  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { opacity: .4; }
            50% { opacity: .8; }
            100% { opacity: .4; }
          }

          .skeleton {
            animation: shimmer 1.4s ease-in-out infinite;
          }
        `}
      </style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background:
            'linear-gradient(135deg, #0a0614 0%, #0d0a1a 50%, #080510 100%)',
          padding: 16,
          overflow: 'hidden',
        }}
      >
        {/* Banner */}
        <div
          className="skeleton"
          style={{
            height: 120,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.08)',
            marginBottom: 16,
          }}
        />

        {/* Wallet */}
        <div
          className="skeleton"
          style={{
            height: 180,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.08)',
            marginBottom: 16,
          }}
        />

        {/* Quick Actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 16,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: 90,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>

        {/* Referral */}
        <div
          className="skeleton"
          style={{
            height: 90,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.08)',
          }}
        />
      </div>
    </>
  );
};

export default AppLoader;
