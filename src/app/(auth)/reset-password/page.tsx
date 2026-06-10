"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import PasswordInput from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KeyRound, Clock, Check, X, Circle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// ── Constants ──────────────────────────────────────────────────────
const TOTAL_SECONDS = 15 * 60; // 15 minutes

// ── Password-requirement helpers ───────────────────────────────────
const requirements = [
  { key: "length",    label: "8+ characters",                      test: (pw: string) => pw.length >= 8 },
  { key: "lower",     label: "Lowercase letter (a-z)",             test: (pw: string) => /[a-z]/.test(pw) },
  { key: "upper",     label: "Uppercase letter (A-Z)",             test: (pw: string) => /[A-Z]/.test(pw) },
  { key: "number",    label: "Number (0-9)",                       test: (pw: string) => /[0-9]/.test(pw) },
  { key: "special",   label: "Special character (!@#...)(optional)",test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

// ── Strength helper (score out of 5, based on password ONLY) ──────
function getStrengthScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const strengthMeta: Record<number, { label: string; color: string }> = {
  0: { label: "",             color: "" },
  1: { label: "Very Weak",    color: "#ef4444" },
  2: { label: "Weak",         color: "#f97316" },
  3: { label: "Fair",         color: "#eab308" },
  4: { label: "Strong",       color: "#22c55e" },
  5: { label: "Very Strong",  color: "#16a34a" },
};

// ── ResetPasswordForm ──────────────────────────────────────────────
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Token validation state
  const [tokenValid, setTokenValid] = useState<boolean | null>(null); // null = loading
  const [tokenMessage, setTokenMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // ── Validate token on mount ─────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenMessage("No reset token provided");
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(
          `http://localhost:8081/auth/validate-token?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();

        if (data.valid && data.expiresAt) {
          setTokenValid(true);
          // Calculate remaining seconds from the server-provided expiry
          const expiryMs = new Date(data.expiresAt).getTime();
          const nowMs = Date.now();
          const diff = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
          setRemainingSeconds(diff);
        } else {
          setTokenValid(false);
          setTokenMessage(data.message || "Invalid or expired reset link");
        }
      } catch {
        setTokenValid(false);
        setTokenMessage("Unable to verify reset link. Please try again.");
      }
    };

    validate();
  }, [token]);

  // ── Countdown timer ─────────────────────────────────────────────
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTokenValid(false);
          setTokenMessage("Reset link has expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds !== null && remainingSeconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ───────────────────────────────────────────────
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword;
  const strengthScore = getStrengthScore(password);
  const meta = strengthMeta[strengthScore] || strengthMeta[0];

  // Minimum criteria for submission: 8+ chars, lowercase, uppercase, number, passwords match
  const canSubmit =
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    passwordsMatch &&
    tokenValid === true &&
    !isSubmitting;

  // ── Format time ─────────────────────────────────────────────────
  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec.toString().padStart(2, "0")}s`;
  }, []);

  // ── Handle submit ───────────────────────────────────────────────
  const handleReset = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("http://localhost:8081/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Reset failed");
      }

      setSubmitSuccess(true);
      toast.success("Password reset successful!");
      setTimeout(() => router.push("/login"), 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Progress fraction (0→1, 1 = full time remaining) ───────────
  const progressFraction = remainingSeconds !== null ? remainingSeconds / TOTAL_SECONDS : 1;

  // Timer bar color
  const timerColor =
    remainingSeconds !== null && remainingSeconds < 120
      ? "#ef4444"
      : remainingSeconds !== null && remainingSeconds < 300
        ? "#f97316"
        : "#16a34a";

  // ── Loading state ───────────────────────────────────────────────
  if (tokenValid === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg p-10 rounded-2xl shadow-lg bg-white">
          <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#953002]" />
            <p className="text-gray-500 text-sm">Verifying your reset link…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Invalid / expired token state ───────────────────────────────
  if (tokenValid === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg p-10 rounded-2xl shadow-lg bg-white">
          <CardContent className="flex flex-col items-center gap-5 text-center">
            <div className="bg-red-50 p-4 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">Link Invalid</h1>
            <p className="text-gray-500 text-sm max-w-sm">{tokenMessage}</p>
            <Link href="/forgot-password">
              <Button className="bg-[#953002] hover:bg-[#7a2600] mt-2">
                Request a New Link
              </Button>
            </Link>
            <Link
              href="/login"
              className="text-sm text-[#953002] hover:underline"
            >
              Back to Login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg p-10 rounded-2xl shadow-lg bg-white">
          <CardContent className="flex flex-col items-center gap-5 text-center">
            <div className="bg-green-50 p-4 rounded-full">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">Password Reset Successful</h1>
            <p className="text-gray-500 text-sm">Redirecting to login…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-lg p-8 sm:p-10 rounded-2xl shadow-lg bg-white">
        <CardContent className="space-y-6">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <div className="bg-[#fef2ec] p-2 rounded-lg">
              <KeyRound className="h-5 w-5 text-[#953002]" />
            </div>
            <span className="text-sm font-medium text-[#953002]">Reset Password</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create New Password</h1>
          </div>

          {/* ── Countdown timer banner ─────────────────────────── */}
          {remainingSeconds !== null && remainingSeconds > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: timerColor }} />
                  <span className="text-sm font-medium" style={{ color: timerColor }}>
                    Link expires in {formatTime(remainingSeconds)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400">Complete your reset before the link expires</p>
              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${progressFraction * 100}%`,
                    backgroundColor: timerColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* ── New Password ───────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">New Password</Label>
            <PasswordInput
              value={password}
              onChange={(e) => { setPassword(e.target.value); setSubmitError(""); }}
              placeholder="Enter new password"
            />

            {/* Strength bar — 5 segments (password quality only) */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                      style={{
                        backgroundColor: i < strengthScore ? meta.color : "#e5e7eb",
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-gray-400">{strengthScore}/5</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Confirm Password ───────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Confirm Password</Label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setSubmitError(""); }}
              placeholder="Re-enter new password"
            />
            {passwordsMatch && (
              <p className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3.5 w-3.5" /> Passwords match
              </p>
            )}
            {passwordsMismatch && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <X className="h-3.5 w-3.5" /> Passwords do not match
              </p>
            )}
          </div>

          {/* ── Password requirements card ─────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Circle className="h-3.5 w-3.5 text-gray-400" />
              Password Requirements
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {requirements.map((req) => {
                const met = password.length > 0 && req.test(password);
                const isOptional = req.key === "special";
                return (
                  <div key={req.key} className="flex items-center gap-1.5">
                    {met ? (
                      <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    ) : isOptional ? (
                      <Circle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                    )}
                    <span
                      className={`text-xs ${
                        met
                          ? "text-green-600"
                          : isOptional
                            ? "text-amber-500"
                            : "text-gray-500"
                      }`}
                    >
                      {req.label}
                    </span>
                  </div>
                );
              })}
              {/* Passwords match requirement */}
              <div className="flex items-center gap-1.5">
                {passwordsMatch ? (
                  <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                )}
                <span className={`text-xs ${passwordsMatch ? "text-green-600" : "text-gray-500"}`}>
                  Passwords match
                </span>
              </div>
            </div>
          </div>

          {/* ── Submit error ────────────────────────────────────── */}
          {submitError && (
            <p className="text-sm text-red-500 text-center">{submitError}</p>
          )}

          {/* ── Reset button ───────────────────────────────────── */}
          <Button
            onClick={handleReset}
            disabled={!canSubmit}
            className="w-full bg-[#953002] hover:bg-[#7a2600] disabled:opacity-50 disabled:cursor-not-allowed h-11 text-sm font-medium"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? "Resetting…" : "Reset Password"}
          </Button>

          {/* ── Back to login ──────────────────────────────────── */}
          <p className="text-center text-sm text-gray-500">
            Remembered your password?{" "}
            <Link href="/login" className="text-[#953002] font-medium hover:underline">
              Back to Login
            </Link>
          </p>

        </CardContent>
      </Card>
    </div>
  );
}

// ── Page wrapper (Suspense for useSearchParams) ────────────────────
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F5]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}