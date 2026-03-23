import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md p-8 rounded-xl shadow-lg bg-white">
      <CardContent className="space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-[#953002] p-4 rounded-lg">
            <FileText className="text-white w-6 h-6" />
          </div>

          <h1 className="text-2xl font-semibold text-[#953002]">
            Universal DMS
          </h1>

          <p className="text-sm text-gray-500 text-center">
            Enterprise Document Management System
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Forgot Password */}
        <Link
          href="/forgot-password"
          className="text-sm text-[#953002] hover:underline block"
        >
          Forgot password?
        </Link>

        {/* OR Divider */}
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-gray-400">OR</span>
          <Separator className="flex-1" />
        </div>

        {/* Register Button */}
        <Link href="/register">
          <Button
            variant="outline"
            className="w-full border-gray-300"
          >
            Create New Account
          </Button>
        </Link>

      </CardContent>
    </Card>
  )
}
