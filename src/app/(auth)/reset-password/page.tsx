"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {

  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password strength
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;
  };

  const strength = getStrength();

  const handleReset = async () => {

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          newPassword: password,
        }),
      });

      if (!res.ok) throw new Error();

      alert("Password reset successful");

      router.push("/login");

    } catch (error) {
      console.error(error);
      alert("Reset failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
      <Card className="w-full max-w-md p-8 rounded-xl shadow-lg bg-white">
        <CardContent className="space-y-6">

          <h1 className="text-2xl font-semibold text-gray-800">
            Create New Password
          </h1>

          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Strength indicator */}
            <div className="mt-2 text-sm">
              Strength:{" "}
              <span className={
                strength <= 2 ? "text-red-500" :
                strength === 3 ? "text-yellow-500" :
                "text-green-500"
              }>
                {strength <= 2 ? "Weak" : strength === 3 ? "Medium" : "Strong"}
              </span>
            </div>
          </div>

          <div>
            <Label>Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {password && confirmPassword && (
              <p className={`text-sm mt-1 ${
                password === confirmPassword ? "text-green-500" : "text-red-500"
              }`}>
                {password === confirmPassword
                  ? "Passwords match"
                  : "Passwords do not match"}
              </p>
            )}
          </div>

          {/* Requirements */}
          <div className="text-sm text-gray-600">
            <p>Password must contain:</p>
            <ul className="list-disc ml-5">
              <li>At least 8 characters</li>
              <li>Lowercase letter</li>
              <li>Uppercase letter</li>
              <li>Number</li>
            </ul>
          </div>

          {/* Button */}
          <Button
            onClick={handleReset}
            className="w-full bg-[#953002] hover:bg-[#7a2600]"
          >
            Reset Password
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}