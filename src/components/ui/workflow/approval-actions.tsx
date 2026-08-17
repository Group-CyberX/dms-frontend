'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { fetchWithAuth, getTaskSigningContext } from '@/lib/api-client';
import { AlertCircle, CheckCircle } from 'lucide-react';

type Props = {
  taskId: number;
  documentName: string;
  onApprovalComplete?: () => void;
  statusMessage?: string | null;
};

export default function ApprovalActions({
  taskId,
  documentName,
  onApprovalComplete,
  statusMessage,
}: Props) {
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Workflows can demand a placed signature. When they do, the approval is
      // completed on the signing page instead of here.
      const context = await getTaskSigningContext(taskId);
      if (context.requiresSignature) {
        router.push(`/signature/${context.documentId}?taskId=${taskId}`);
        return;
      }

      const response = await fetchWithAuth(
        `http://localhost:8081/api/tasks/${taskId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comment: comment.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve task');
      }

      setSuccess('Task approved successfully!');
      setComment('');

      // Call callback after a short delay to show success message
      setTimeout(() => {
        onApprovalComplete?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve task');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetchWithAuth(
        `http://localhost:8081/api/tasks/${taskId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comment: comment.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject task');
      }

      setSuccess('Task rejected successfully!');
      setComment('');

      // Call callback after a short delay to show success message
      setTimeout(() => {
        onApprovalComplete?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Actions</h2>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Success</p>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {statusMessage ? (
        <div className={`rounded-lg p-4 flex items-center justify-center gap-2 text-sm font-semibold border ${
          statusMessage === 'Waiting for previous step' || statusMessage === 'Task approved'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span>{statusMessage}</span>
        </div>
      ) : (
        <>
          {/* Comments Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your comments here..."
              rows={4}
              disabled={loading}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-[#a34713] hover:bg-[#8e3d10] text-white font-medium"
            >
              {loading ? 'Processing...' : 'Approve'}
            </Button>
            <Button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 bg-[#dc1f45] hover:bg-[#c5183b] text-white font-medium"
            >
              {loading ? 'Processing...' : 'Reject'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
