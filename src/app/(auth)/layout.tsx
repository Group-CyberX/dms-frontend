export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] flex items-center justify-center">
      {children}
    </div>
  )
}
