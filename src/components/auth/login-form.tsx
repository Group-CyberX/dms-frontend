"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, LoginFormValues } from "@/lib/schemas/login-schema"
import { Input } from "@/components/ui/input"
import PasswordInput from "@/components/ui/password-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { notify } from '@/lib/feedback';

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
    
     // Store tokens and user data in global state
    setAuth({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      email: result.email,
      userName: result.username,
      role: result.role,
      permissions: result.permissions,
    });

    // Redirect user after successful login
    if (redirectUrl) {
      router.push(redirectUrl);
    } else {
      router.push("/dashboard");
    }

  } catch (error) {
    console.error(error);
    notify.error(error instanceof Error ? error.message : "Login failed");
  }
};

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