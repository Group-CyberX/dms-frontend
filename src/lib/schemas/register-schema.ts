import { z } from "zod"

/**
 * A Sri Lankan phone number, written either locally (0771234567) or with the
 * country code (+94771234567). Covers mobile prefixes and landline area codes.
 *
 * The previous rule was any 10-12 digits with an optional plus, which accepted
 * 1234567890 and +000000000000 as valid numbers.
 */
export const SRI_LANKA_PHONE = /^(?:\+94|0)(?:7\d{8}|[1-9]\d{8})$/

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(SRI_LANKA_PHONE, "Enter a Sri Lankan number, e.g. 0771234567 or +94771234567"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
