'use client';

import { useState } from 'react';
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

      {/* bottom split-ring that passes through the badge slot */}
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

      {/* stem from clasp body down to the ring */}
      <path
        d="M26 53 L26 71"
        stroke="url(#stemGrad)"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
      <path d="M24.6 54 L24.6 70" stroke="rgba(255,255,255,0.1)" strokeWidth="0.7" />

      {/* top attachment ring (lanyard feeds through this) */}
      <ellipse cx="26" cy="10.5" rx="8.2" ry="7.1" fill="#111" stroke="url(#metalRing)" strokeWidth="2.4" />
      <ellipse cx="26" cy="10.5" rx="8.2" ry="7.1" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" />
      <ellipse cx="26" cy="10.2" rx="4.6" ry="3.9" fill="#050505" />

      {/* lobster body */}
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
      {/* body left highlight */}
      <path
        d="M18.2 21
           C18.6 16.8, 22 15, 26 15
           C27.8 15, 29.5 15.4, 31 16.4"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
      {/* body inner shade */}
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

      {/* hinge / pivot pin */}
      <circle cx="26" cy="22.5" r="2.35" fill="#1a1a1a" stroke="#4a4a4a" strokeWidth="0.7" />
      <circle cx="25.4" cy="21.9" r="0.7" fill="rgba(255,255,255,0.2)" />

      {/* spring gate / lever on the right */}
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
      <path
        d="M36.2 23.2 L40.4 23.2"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      {/* lever rivet */}
      <circle cx="38.3" cy="24.8" r="1.05" fill="#1a1a1a" stroke="#4a4a4a" strokeWidth="0.45" />
    </svg>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setPending(true);
  setError(null);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      redirectTo?: string;
    };

    if (!response.ok) {
      setError(data.error ?? 'Unable to sign in.');
      setPending(false);
      return;
    }

    window.location.assign(data.redirectTo ?? '/admin');
  } catch {
    setError('Network error — please try again.');
    setPending(false);
  }
}
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
        {/* ========== LANYARD ========== */}
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

        {/* ========== CLASP ========== */}
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

        {/* ========== BADGE CARD ========== */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            marginTop: -26,
            width: 300,
            background: 'linear-gradient(180deg, #1b1b1b 0%, #141414 42%, #101010 100%)',
            borderRadius: 18,
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
          {/* punch-hole slot */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: 13,
              width: 62,
              height: 10,
              borderRadius: 16,
              background: '#000000',
              boxShadow: `
                inset 0 1.5px 2px rgba(255,255,255,0.055),
                inset 0 -1px 1px rgba(0,0,0,0.8),
                0 0 0 1px rgba(255,255,255,0.04)
              `,
            }}
          />

          <div style={{ padding: '48px 26px 26px' }}>
            {/* Brand */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1
                style={{
                  margin: 0,
                  color: '#ffffff',
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: '-0.045em',
                  lineHeight: 1,
                }}
              >
                GymFlow
              </h1>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: '0.34em',
                  color: '#8a8a8a',
                  lineHeight: 1,
                }}
              >
                MORE THAN A GYM
              </p>
            </div>

            {/* Heading */}
            <h2
              style={{
                margin: 0,
                color: '#ffffff',
                fontSize: 17,
                fontWeight: 650,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              {pending ? 'Signing in…' : 'Sign In'}
            </h2>
            <p
              style={{
                margin: '5px 0 18px',
                fontSize: 10,
                fontWeight: 400,
                color: '#9a9a9a',
                lineHeight: 1.45,
              }}
            >
              Welcome back! Please sign in to continue.
            </p>

            <form
  onSubmit={submit}
  style={{ display: 'flex', flexDirection: 'column' }}
>
              {/* Email */}
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.2" stroke="#7a7a7a" strokeWidth="1.7" />
                    <path d="M4 7.2l8 6.2 8-6.2" stroke="#7a7a7a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    height: 42,
                    paddingLeft: 38,
                    paddingRight: 14,
                    background: '#161616',
                    border: '1px solid #2b2b2b',
                    borderRadius: 10,
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3f3f3f';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#2b2b2b';
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2.2" stroke="#7a7a7a" strokeWidth="1.7" />
                    <path
                      d="M8 11V8.2a4 4 0 0 1 8 0V11"
                      stroke="#7a7a7a"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: 42,
                    paddingLeft: 38,
                    paddingRight: 38,
                    background: '#161616',
                    border: '1px solid #2b2b2b',
                    borderRadius: 10,
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3f3f3f';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#2b2b2b';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    lineHeight: 0,
                  }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                        stroke="#7a7a7a"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" stroke="#7a7a7a" strokeWidth="1.7" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="#7a7a7a" strokeWidth="1.7" strokeLinecap="round" />
                      <path
                        d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.45-1.18"
                        stroke="#7a7a7a"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                      <path
                        d="M9.88 5.09A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-3.18 4.35"
                        stroke="#7a7a7a"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.1 6.1C3.72 7.84 2 12 2 12s3.5 7 10 7c1.58 0 3.04-.35 4.35-.96"
                        stroke="#7a7a7a"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Remember / forgot */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={remember}
                    onClick={() => setRemember((r) => !r)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3.5,
                      border: remember ? '1.5px solid #ffffff' : '1.5px solid #5a5a5a',
                      background: remember ? '#ffffff' : 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {remember && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6.2 L4.8 9 L10 3.2"
                          stroke="#111"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <span style={{ fontSize: 11, color: '#9a9a9a', fontWeight: 400 }}>
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  style={{
                    fontSize: 11,
                    color: '#3b82f6',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontWeight: 400,
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 999,
                  background: '#ffffff',
                  color: '#000000',
                  fontSize: 14,
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
                Sign In
              </button>
            </form>

            {/* Footer motto */}
            <div
              style={{
                marginTop: 26,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
              <span
                style={{
                  fontSize: 8,
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
        input::placeholder {
          color: #6d6d6d;
          opacity: 1;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          -webkit-box-shadow: 0 0 0px 1000px #161616 inset;
          caret-color: #ffffff;
          transition: background-color 5000s ease-in-out 0s;
        }
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