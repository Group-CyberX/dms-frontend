"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, RegisterFormValues } from "@/lib/schemas/register-schema"
import { Input } from "@/components/ui/input"
import PasswordInput from "@/components/ui/password-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation";
import { Check, Circle, X } from "lucide-react"
import { notify } from '@/lib/feedback';

// ── Password-requirement helpers ───────────────────────────────────
const requirements = [
  { key: "length",  label: "8+ characters",                       test: (pw: string) => pw.length >= 8 },
  { key: "lower",   label: "Lowercase letter (a-z)",              test: (pw: string) => /[a-z]/.test(pw) },
  { key: "upper",   label: "Uppercase letter (A-Z)",              test: (pw: string) => /[A-Z]/.test(pw) },
  { key: "number",  label: "Number (0-9)",                        test: (pw: string) => /[0-9]/.test(pw) },
  { key: "special", label: "Special character (!@#...)(optional)", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

// ── Strength helper (score out of 5) ──────────────────────────────
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

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  // Watch password fields for real-time validation UI
  const passwordValue = watch("password", "");
  const confirmPasswordValue = watch("confirmPassword", "");

  const strengthScore = getStrengthScore(passwordValue);
  const meta = strengthMeta[strengthScore] || strengthMeta[0];
  const passwordsMatch = passwordValue.length > 0 && confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;
  const passwordsMismatch = passwordValue.length > 0 && confirmPasswordValue.length > 0 && passwordValue !== confirmPasswordValue;

  const onSubmit = async (data: RegisterFormValues) => {
  try {
    const res = await fetch("http://localhost:8081/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
      }),
    });

    if (!res.ok) {
      throw new Error("Registration failed");
    }

    //  Redirect to login
    router.push("/login");

  } catch (error) {
    console.error(error);
    notify.error("Registration failed");
  }
};

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>First Name *</Label>
          <Input {...register("firstName")} />
          {errors.firstName && (
            <p className="text-sm text-red-500 mt-1">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <Label>Last Name *</Label>
          <Input {...register("lastName")} />
          {errors.lastName && (
            <p className="text-sm text-red-500 mt-1">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label>Email Address *</Label>
        <Input type="email" {...register("email")} />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label>Phone Number *</Label>
        <Input {...register("phone")} />
        {errors.phone && (
          <p className="text-sm text-red-500 mt-1">
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* ── Password with strength bar ──────────────────────────── */}
      <div className="space-y-2">
        <Label>Password *</Label>
        <PasswordInput {...register("password")} />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">
            {errors.password.message}
          </p>
        )}

        {/* Strength bar — 5 segments */}
        {passwordValue.length > 0 && (
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

      {/* ── Confirm Password ───────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Confirm Password *</Label>
        <PasswordInput {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500 mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
        {!errors.confirmPassword && passwordsMatch && (
          <p className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3.5 w-3.5" /> Passwords match
          </p>
        )}
        {!errors.confirmPassword && passwordsMismatch && (
          <p className="flex items-center gap-1 text-xs text-red-500">
            <X className="h-3.5 w-3.5" /> Passwords do not match
          </p>
        )}
      </div>

      {/* ── Password requirements card ─────────────────────────── */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Circle className="h-3.5 w-3.5 text-gray-400" />
          Password Requirements
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {requirements.map((req) => {
            const met = passwordValue.length > 0 && req.test(passwordValue);
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

      <Button
        type="submit"
        className="w-full bg-[#953002] hover:bg-[#7a2600]"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Create Account"}
      </Button>

    </form>
  )
}
