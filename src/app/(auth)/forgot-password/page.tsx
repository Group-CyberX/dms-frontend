import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
      <Card className="w-full max-w-md p-8 rounded-xl shadow-lg bg-white relative">

        {/* Back to Login */}
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#953002] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        <CardContent className="space-y-6 mt-4">

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-800">
              Forgot Password
            </h1>
            <p className="text-sm text-gray-500">
              Enter your email address and we'll send you a reset link
            </p>
          </div>

          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input type="email" placeholder="Enter your email" />
          </div>

          <Button className="w-full bg-[#953002] hover:bg-[#7a2600]">
            Send Reset Link
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}
