// app/signature-test/page.tsx
'use client';

import { SignatureWorkspace } from "@/components/Digital_Signature/SignatureWorkspace"; // Adjust this import path based on where you saved Step 4

export default function SignatureTestPage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <SignatureWorkspace />
    </main>
  );
}