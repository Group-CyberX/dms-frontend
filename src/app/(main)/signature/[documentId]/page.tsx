'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { SignatureWorkspace } from '@/components/Digital_Signature/SignatureWorkspace';

/**
 * Signature placement page.
 *
 * Reached from any "Approve" action on a workflow whose template has
 * requiresSignature = true. The document to sign comes from the route, and the
 * task being approved (if any) from the query string:
 *
 *   /signature/{documentId}?taskId=123
 */
export default function SignDocumentPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const documentId = params.documentId as string;
  const taskId = searchParams?.get('taskId') ?? null;

  return <SignatureWorkspace documentId={documentId} taskId={taskId} />;
}
