import { Card, CardContent } from "@/components/ui/card"
import { FileText, ArrowLeft } from "lucide-react"
import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
      <Card className="w-full max-w-xl p-8 rounded-xl shadow-lg bg-white relative">
        
   
        <Link
          href="/login"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-500 hover:text-[#953002] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        <CardContent className="space-y-6 mt-4">

          {/* Logo + Title */}
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-[#953002] p-4 rounded-lg">
              <FileText className="text-white w-6 h-6" />
            </div>

            <h1 className="text-2xl font-semibold text-[#953002]">
              Create Account
            </h1>

            <p className="text-sm text-gray-500">
              Register for Universal DMS access
            </p>
          </div>

          <RegisterForm />

          <p className="text-sm text-center">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#953002] hover:underline"
            >
              Sign in
            </Link>
          </p>

        </CardContent>
      </Card>
    </div>
  )
}
