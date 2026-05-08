"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#e2e2e2] px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-2xl bg-white p-10 text-center shadow-[0_12px_30px_rgba(15,23,42,0.1)]">
          <h1 className="text-3xl font-semibold text-[#953002]">Access Denied</h1>
          <p className="mt-3 text-sm text-slate-600">
            You do not have permission to view this page.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Button
              className="bg-[#953002] hover:bg-[#7f2600]"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
