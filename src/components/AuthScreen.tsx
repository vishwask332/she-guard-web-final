import React, { useState } from "react";
import { ShieldCheck, Lock, MapPin, HeartHandshake, MailCheck, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import welcomeIllustration from "../assets/images/she_guard_welcome_1794659410458.jpg";

export function AuthScreen() {
  const {
    user,
    isVerified,
    authError,
    clearAuthError,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resendVerificationEmail,
    refreshVerificationStatus,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setInfoMsg(null);
    try {
      await loginWithGoogle();
    } catch {
      // Handled in AuthContext
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setInfoMsg(null);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail({ fullName, phoneNumber, email, password });
        setInfoMsg("Verification email sent. Please verify your inbox to unlock your safety vault.");
      }
    } catch {
      // Handled in AuthContext
    } finally {
      setBusy(false);
    }
  };

  const handleCheckVerification = async () => {
    setBusy(true);
    setInfoMsg(null);
    try {
      const verified = await refreshVerificationStatus();
      if (!verified) {
        setInfoMsg("Email is not verified yet. Please click the verification link in your email inbox.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true);
    setInfoMsg(null);
    try {
      await resendVerificationEmail();
      setInfoMsg("A new verification link has been sent to your email address.");
    } catch {
      // Handled in AuthContext
    } finally {
      setBusy(false);
    }
  };

  // Verification gate if user registered with email/password and hasn't verified yet
  if (user && !isVerified) {
    return (
      <div className="min-h-screen bg-[#FDFBFE] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white border border-[#EAE2F0] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#FDF2F7] border border-[#FBCFE8] flex items-center justify-center text-[#DB2777]">
              <MailCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1E122B]">Verify your email address</h1>
              <p className="text-sm text-[#5B4B6B]">
                Required to protect your emergency contacts and SOS history.
              </p>
            </div>
          </div>

          <p className="text-sm text-[#3F2E50] leading-relaxed mb-6">
            We sent a verification link to <strong className="font-semibold">{user.email}</strong>.
            Open the email, click the confirmation link, and then select{" "}
            <strong>I Have Verified</strong> below.
          </p>

          {infoMsg && (
            <div className="mb-4 rounded-xl bg-[#F8F4FC] border border-[#DDD6FE] px-4 py-3 text-sm text-[#5B21B6]">
              {infoMsg}
            </div>
          )}
          {authError && (
            <div className="mb-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]">
              {authError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleCheckVerification}
              disabled={busy}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
              I Have Verified
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={busy}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F8F4FC] hover:bg-[#EDE9FE] text-[#5B21B6] font-medium text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              Resend Email
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-6 text-sm text-[#5B4B6B] hover:text-[#1E122B] underline underline-offset-4"
          >
            Sign out and use another account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFE] flex flex-col justify-center">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Editorial Safety Introduction */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-[#F8F4FC] border border-[#EAE2F0] rounded-3xl p-6 sm:p-10">
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="text-xl font-extrabold tracking-tight text-[#5B21B6] whitespace-nowrap">
                  SHE-GUARD
                </span>
                <span className="text-xs font-medium text-[#6B5B7B]">
                  Personal Safety · Web & Android Compatible
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-[#1E122B] tracking-tight leading-tight max-w-xl [text-wrap:balance]">
                Calm, reliable emergency response built around your control.
              </h1>
              <p className="mt-4 text-base text-[#4A3B5C] leading-relaxed max-w-xl">
                Keep your trusted contacts, live journey check-ins, GPS-linked SOS alerts, and
                voluntary AI distress text checks in one private, accessible web dashboard.
              </p>

              {/* Editorial Illustration */}
              <div className="mt-8 overflow-hidden rounded-2xl border border-[#EAE2F0] bg-white aspect-[4/3] max-h-[340px] w-full">
                {!imgFailed ? (
                  <img
                    src={welcomeIllustration}
                    alt="Calm evening architectural walkway lit by warm lanterns in purple and soft rose tones"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#F3E8FF] via-[#FDFBFE] to-[#FCE7F3] flex flex-col items-center justify-center p-8 text-center">
                    <ShieldCheck className="w-12 h-12 text-[#6D28D9] mb-3" />
                    <p className="text-sm font-medium text-[#4A3B5C]">
                      SHE-GUARD Personal Safety Companion
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#EAE2F0] grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#6D28D9] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#1E122B]">Manual-First SOS</p>
                  <p className="text-xs text-[#5B4B6B] mt-0.5">
                    Works independently of AI with explicit GPS confirmation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#DB2777] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#1E122B]">Private by Design</p>
                  <p className="text-xs text-[#5B4B6B] mt-0.5">
                    Never reads WhatsApp, SMS, or private chats automatically.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HeartHandshake className="w-5 h-5 text-[#6D28D9] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#1E122B]">Trusted Circle</p>
                  <p className="text-xs text-[#5B4B6B] mt-0.5">
                    Instant SMS & phone outreach with Google Maps coordinates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Authentication Card */}
          <div className="lg:col-span-5 flex flex-col justify-center bg-white border border-[#EAE2F0] rounded-3xl p-6 sm:p-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#1E122B]">
                {mode === "login" ? "Sign in to SHE-GUARD" : "Create your safety account"}
              </h2>
              <p className="text-sm text-[#5B4B6B] mt-1">
                Access your emergency profile, contacts, and permanent SOS log.
              </p>
            </div>

            {/* Primary 1-Click Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={busy}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>Continue with Google</span>
            </button>
            <p className="text-xs text-[#6B5B7B] text-center mt-2">
              Instant verified login · Recommended for immediate access
            </p>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EAE2F0]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#6B5B7B]">or use email & password</span>
              </div>
            </div>

            {/* Mode Segmented Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F8F4FC] rounded-xl mb-5 border border-[#EAE2F0]">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  clearAuthError();
                }}
                className={`min-h-[40px] rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  mode === "login"
                    ? "bg-white text-[#5B21B6] shadow-xs"
                    : "text-[#5B4B6B] hover:text-[#1E122B]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  clearAuthError();
                }}
                className={`min-h-[40px] rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  mode === "register"
                    ? "bg-white text-[#5B21B6] shadow-xs"
                    : "text-[#5B4B6B] hover:text-[#1E122B]"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div
                role="alert"
                className="mb-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]"
              >
                {authError}
              </div>
            )}

            {infoMsg && (
              <div className="mb-4 rounded-xl bg-[#FDF2F7] border border-[#FBCFE8] px-4 py-3 text-sm text-[#9D174D]">
                {infoMsg}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label
                      htmlFor="auth-fullname"
                      className="block text-sm font-medium text-[#1E122B] mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="auth-fullname"
                      type="text"
                      required
                      maxLength={100}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Ananya Sharma"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-[#1E122B] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-phone"
                      className="block text-sm font-medium text-[#1E122B] mb-1.5"
                    >
                      Phone Number
                    </label>
                    <input
                      id="auth-phone"
                      type="tel"
                      maxLength={32}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g., +91 98765 43210"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-[#1E122B] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-sm font-medium text-[#1E122B] mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-[#1E122B] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-sm font-medium text-[#1E122B] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-[#1E122B] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#FDF2F7] hover:bg-[#FCE7F3] border border-[#FBCFE8] text-[#9D174D] font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                {busy
                  ? "Please wait..."
                  : mode === "login"
                  ? "Sign In with Email"
                  : "Register & Send Verification"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
