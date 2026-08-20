"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, LoginFormValues } from "@/lib/schemas/login-schema"
import { Input } from "@/components/ui/input"
import PasswordInput from "@/components/ui/password-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { notify } from "@/lib/feedback"

// Login form component handling user authentication
export function LoginForm() {

  // Next.js router for navigation after login
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get("redirect");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  // Zustand global store to save authentication data
  const setAuth = useAuthStore((state) => state.setAuth);

  // When sign-in codes are switched on the password is only the first step:
  // the server emails a code and issues nothing until it comes back.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  type Session = {
    accessToken: string;
    refreshToken: string;
    email: string;
    username: string;
    role: string;
    permissions: Record<string, boolean>;
  };

  const startSession = (result: Session) => {
    setAuth({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      email: result.email,
      userName: result.username,
      role: result.role,
      permissions: result.permissions,
    });

    router.push(redirectUrl || "/dashboard");
  };

  const handleVerifyOtp = async () => {
    if (!/^[0-9]{6}$/.test(otp.trim())) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }

    setOtpError(null);
    setVerifying(true);

    try {
      const res = await fetch("http://localhost:8081/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, otp: otp.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setOtpError(body?.message || "That code is not right, or it has expired.");
        return;
      }

      startSession(await res.json());
    } catch (error) {
      console.error(error);
      setOtpError("Could not verify the code. Check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  };

const onSubmit = async (data: LoginFormValues) => {
  try {
    const res = await fetch("http://localhost:8081/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    // Show what the server actually said. A wrong password and a deactivated
    // account are different problems, and only one of them is worth retrying.
    if (!res.ok) {
      let message = "Invalid email or password";
      try {
        const body = await res.json();
        if (body?.message) {
          message = body.message;
        }
      } catch {
        // No JSON body - keep the default.
      }
      throw new Error(message);
    }

    const result = await res.json();

    // Password accepted, but a code has been emailed and no session issued yet.
    if (result.twoFactorRequired) {
      setPendingEmail(result.email || data.email);
      setOtp("");
      setOtpError(null);
      notify.success("We emailed you a 6-digit code.");
      return;
    }

    startSession(result);

  } catch (error) {
    console.error(error);
    notify.error(error instanceof Error ? error.message : "Could not sign you in. Try again.");
  }
};

  if (pendingEmail) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-[#f7ede8] px-3 py-2.5 text-sm text-[#953002]">
          We sent a 6-digit code to <span className="font-medium">{pendingEmail}</span>. It
          expires in 15 minutes.
        </div>

        <div>
          <Label>Verification code</Label>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/[^0-9]/g, ""));
              if (otpError) setOtpError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleVerifyOtp();
              }
            }}
            className={`tracking-[0.5em] text-center text-lg ${otpError ? "border-red-500" : ""}`}
          />
          {otpError && <p className="text-sm text-red-500 mt-1">{otpError}</p>}
        </div>

        <Button
          type="button"
          onClick={handleVerifyOtp}
          disabled={verifying}
          className="w-full bg-[#953002] hover:bg-[#7a2600]"
        >
          {verifying ? "Verifying..." : "Verify and sign in"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setPendingEmail(null);
            setOtp("");
            setOtpError(null);
          }}
          className="w-full text-sm text-slate-500 hover:text-slate-700"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      <div>
        <Label>Email</Label>
        <Input
          type="email"
          placeholder="Enter your email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label>Password</Label>
        <PasswordInput
          placeholder="Enter your password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-[#953002] hover:bg-[#7a2600]"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </Button>

    </form>
  )
}