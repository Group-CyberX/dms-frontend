"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, RegisterFormValues } from "@/lib/schemas/register-schema"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    console.log("Register Data:", data)
  }

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
        <Label>Phone Number</Label>
        <Input {...register("phone")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Password *</Label>
          <Input type="password" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Label>Confirm Password *</Label>
          <Input type="password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
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
