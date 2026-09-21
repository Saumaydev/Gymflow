'use client';

import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

function Clasp() {
  return (
    <svg
      width="42"
      height="82"
      viewBox="0 0 52 102"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.55))' }}
    >
      <defs>
        <linearGradient id="metalBody" x1="10" y1="12" x2="42" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4a4a4a" />
          <stop offset="35%" stopColor="#2c2c2c" />
          <stop offset="70%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
        <linearGradient id="metalRing" x1="16" y1="0" x2="36" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#555" />
          <stop offset="50%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
        <linearGradient id="metalLever" x1="34" y1="22" x2="46" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3f3f3f" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
        <linearGradient id="ringTube" x1="26" y1="66" x2="26" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5a5a5a" />
          <stop offset="40%" stopColor="#2e2e2e" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
        <linearGradient id="stemGrad" x1="24" y1="54" x2="28" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#1f1f1f" />
        </linearGradient>
      </defs>
      <circle cx="26" cy="82" r="11.2" fill="none" stroke="url(#ringTube)" strokeWidth="3.6" />
      <circle cx="26" cy="82" r="11.2" fill="none" stroke="#111" strokeWidth="0.6" opacity="0.7" />
      <circle cx="26" cy="82" r="9.2" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.7" />
      <path
        d="M18.2 75.2 C20.5 73.2, 31.5 73.2, 33.8 75.2"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M26 53 L26 71" stroke="url(#stemGrad)" strokeWidth="3.8" strokeLinecap="round" />
      <path d="M24.6 54 L24.6 70" stroke="rgba(255,255,255,0.1)" strokeWidth="0.7" />
      <ellipse cx="26" cy="10.5" rx="8.2" ry="7.1" fill="#111" stroke="url(#metalRing)" strokeWidth="2.4" />
      <ellipse cx="26" cy="10.5" rx="8.2" ry="7.1" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" />
      <ellipse cx="26" cy="10.2" rx="4.6" ry="3.9" fill="#050505" />
      <path
        d="M15.5 20.5
           C15.5 15.2, 20.2 12.6, 26 12.6
           C31.8 12.6, 36.5 15.2, 36.5 20.5
           L37.4 38.5
           C37.6 47.5, 32.6 53.5, 26 53.5
           C19.4 53.5, 14.4 47.5, 14.6 38.5
           Z"
        fill="url(#metalBody)"
        stroke="#111"
        strokeWidth="0.8"
      />
      <path
        d="M18.2 21
           C18.6 16.8, 22 15, 26 15
           C27.8 15, 29.5 15.4, 31 16.4"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M18 24
           C18.2 20, 21.5 18.5, 26 18.5
           C30.5 18.5, 33.8 20, 34 24
           L34.6 38
           C34.7 44.5, 31 48.5, 26 48.5
           C21 48.5, 17.3 44.5, 17.4 38
           Z"
        fill="rgba(0,0,0,0.22)"
      />
      <circle cx="26" cy="22.5" r="2.35" fill="#1a1a1a" stroke="#4a4a4a" strokeWidth="0.7" />
      <circle cx="25.4" cy="21.9" r="0.7" fill="rgba(255,255,255,0.2)" />
      <rect
        x="34.6"
        y="21.5"
        width="7.4"
        height="20.5"
        rx="2.3"
        fill="url(#metalLever)"
        stroke="#111"
        strokeWidth="0.7"
      />
      <rect x="36.4" y="24" width="2.1" height="15.2" rx="0.9" fill="#141414" />
      <path d="M36.2 23.2 L40.4 23.2" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="38.3" cy="24.8" r="1.05" fill="#1a1a1a" stroke="#4a4a4a" strokeWidth="0.45" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div
      className={inter.className}
      style={{
        height: '100vh',
        minHeight: '100vh',
        width: '100%',
        background: '#000000',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 0,
          paddingBottom: 24,
        }}
      >
        <div
          style={{
            position: 'relative',
            zIndex: 20,
            width: 28,
            height: 96,
            transform: 'translateX(-12px)',
            borderRadius: '2px 2px 1px 1px',
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                rgba(255,255,255,0.035) 0px,
                rgba(255,255,255,0.035) 1px,
                transparent 1px,
                transparent 3px
              ),
              linear-gradient(
                90deg,
                rgba(255,255,255,0.30) 0%,
                rgba(255,255,255,0.10) 10%,
                rgba(0,0,0,0.00) 38%,
                rgba(0,0,0,0.12) 72%,
                rgba(0,0,0,0.32) 100%
              ),
              linear-gradient(
                180deg,
                #f6c056 0%,
                #f0a24a 12%,
                #ee9a62 22%,
                #e8a888 36%,
                #e0b4a8 48%,
                #d0b0c4 60%,
                #c0b4dc 74%,
                #a8b6e0 88%,
                #96b0d8 100%
              )
            `,
            boxShadow: `
              inset 3px 0 5px rgba(255,255,255,0.22),
              inset -4px 0 8px rgba(0,0,0,0.38),
              inset 0 -6px 8px rgba(0,0,0,0.18),
              3px 0 10px rgba(0,0,0,0.45)
            `,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 30,
            marginTop: -12,
            lineHeight: 0,
            transform: 'translateX(-12px)',
          }}
        >
          <Clasp />
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 10,
            marginTop: -26,
            width: 340,
            background: 'linear-gradient(180deg, #1b1b1b 0%, #141414 42%, #101010 100%)',
            borderRadius: 20,
            transform: 'rotate(-3.5deg)',
            transformOrigin: '50% 50%',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.065),
              inset 0 1px 0 rgba(255,255,255,0.075),
              inset 0 -1px 0 rgba(0,0,0,0.4),
              0 30px 70px rgba(0,0,0,0.72)
            `,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: 14,
              width: 68,
              height: 11,
              borderRadius: 16,
              background: '#000000',
              boxShadow: `
                inset 0 1.5px 2px rgba(255,255,255,0.055),
                inset 0 -1px 1px rgba(0,0,0,0.8),
                0 0 0 1px rgba(255,255,255,0.04)
              `,
            }}
          />

          <div style={{ padding: '54px 28px 30px' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1
                style={{
                  margin: 0,
                  color: '#ffffff',
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: '-0.045em',
                  lineHeight: 1,
                }}
              >
                GymFlow
              </h1>
              <p
                style={{
                  margin: '9px 0 0',
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: '0.34em',
                  color: '#8a8a8a',
                  lineHeight: 1,
                }}
              >
                MORE THAN A GYM
              </p>
            </div>

            <h2
              style={{
                margin: 0,
                color: '#ffffff',
                fontSize: 20,
                fontWeight: 650,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              Forgot Password
            </h2>
            <p
              style={{
                margin: '6px 0 22px',
                fontSize: 13,
                fontWeight: 400,
                color: '#9a9a9a',
                lineHeight: 1.45,
              }}
            >
              Contact the admin to reset your password.
            </p>

            <a
              href="mailto:saumaydev@gmail.com"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                height: 46,
                borderRadius: 12,
                background: '#161616',
                border: '1px solid #2b2b2b',
                color: '#ffffff',
                fontSize: 13.5,
                fontFamily: 'inherit',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.2" stroke="#7a7a7a" strokeWidth="1.7" />
                <path
                  d="M4 7.2l8 6.2 8-6.2"
                  stroke="#7a7a7a"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              saumaydev@gmail.com
            </a>

            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                height: 46,
                marginTop: 18,
                borderRadius: 999,
                background: '#ffffff',
                color: '#000000',
                fontSize: 14.5,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 1px 0 rgba(255,255,255,0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f2f2f2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.985)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Back to Sign In
            </button>

            <div
              style={{
                marginTop: 30,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: '0.30em',
                  color: '#6a6a6a',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                STAY CONSISTENT
              </span>
              <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        html,
        body {
          background: #000;
          margin: 0;
          overflow: hidden;
          height: 100%;
        }
      `}</style>
    </div>
  );
}