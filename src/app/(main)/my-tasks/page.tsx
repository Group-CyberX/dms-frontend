'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import ApproveTaskDialog from '@/components/ui/workflow/approve-task-dialog';
import RejectTaskDialog from '@/components/ui/workflow/reject-task-dialog';

//Logged-in user details
type CurrentUser = {
  userId: string;
  username: string;
  role: string;
};

type ApproverOption = {
  userId: string;
  username: string;
  role: string;
};

type WorkflowInstance = {
  id: number;
  documentId: string;
  templateId: number | null;
  workflowName: string;
  priority: string;
  dueDate: string;
  status: string;
  createdByUserId: string;
};

//Represents a workflow task
type WorkflowTask = {
  id: number;
  instanceId: number;
  stepOrder: number;
  userId: string;
  status: string;
};

type DocumentSummary = {
  document_id?: string;
  id?: string;
  title?: string;
  name?: string;
  documentName?: string;
  filename?: string;
};

type WorkflowTemplateStep = {
  stepOrder: number;
  approverUserId?: string | null;
  approverName?: string | null;
  approverRole?: string | null;
};

type TaskRow = {
  task: WorkflowTask;
  workflow: WorkflowInstance | null;
  documentTitle: string;
  assigneeLabel: string;
  isAssignedToMe: boolean;
  isOverdue: boolean;
};

const statusLabelClass = (status: string) => {
  const normalized = status.toUpperCase();

  if (normalized === 'PENDING') {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (normalized === 'APPROVED') {
    return 'bg-green-100 text-green-700';
  }

  if (normalized === 'REJECTED') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-slate-100 text-slate-700';
};

const priorityClass = (priority: string) => {
  const normalized = priority.toUpperCase();

  if (normalized === 'URGENT') {
    return 'bg-red-100 text-red-700';
  }

  if (normalized === 'HIGH') {
    return 'bg-orange-100 text-orange-700';
  }

  if (normalized === 'MEDIUM') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-slate-100 text-slate-700';
};

const normalize = (value: string | null | undefined) => String(value ?? '').trim().toUpperCase();

const formatAssigneeLabel = (
  taskUserId: string,
  approvers: ApproverOption[],
  templateStep?: WorkflowTemplateStep | null
) => {
  if (templateStep) {
    if (templateStep.approverName && templateStep.approverRole) {
      return `${templateStep.approverName} - ${templateStep.approverRole}`;
    }

    if (templateStep.approverUserId) {
      const byTemplateUserId = approvers.find((item) => String(item.userId) === String(templateStep.approverUserId));

      if (byTemplateUserId) {
        return `${byTemplateUserId.username} - ${byTemplateUserId.role}`;
      }
    }
  }

  const byUserId = approvers.find((item) => String(item.userId) === String(taskUserId));

  if (byUserId) {
    return `${byUserId.username} - ${byUserId.role}`;
  }

  const byRole = approvers.find((item) => normalize(item.role) === normalize(taskUserId));

  if (byRole) {
    return `${byRole.username} - ${byRole.role}`;
  }

  return taskUserId;
};

export default function MyTasksPage() {
  const token = useAuthStore((state) => state.token);
  const [authToken, setAuthToken] = useState<string | null>(token);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [approvers, setApprovers] = useState<ApproverOption[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [templateStepsByTemplateId, setTemplateStepsByTemplateId] = useState<Record<string, WorkflowTemplateStep[]>>({});
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'overdue' | 'approved' | 'rejected'>('all');

  const getJson = async (response: Response) => {
    const text = await response.text();

    if (!text.trim()) {
      return null;
    }

    return JSON.parse(text);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};

      // Include auth token if available
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      try {
        // Fetch current user details
        const currentUserResponse = await fetch('http://localhost:8081/api/users/me', {
          headers,
        });

        if (currentUserResponse.ok) {
          const currentUserData = await getJson(currentUserResponse);
          setCurrentUser(currentUserData);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }

      // Fetch approvers, workflows, and documents in parallel
      const [approverResponse, workflowResponse, documentResponse] = await Promise.all([
        fetch('http://localhost:8081/api/users'),
        fetch('http://localhost:8081/api/workflows'),
        fetch('http://localhost:8081/api/documents'),
      ]);

      if (!approverResponse.ok) {
        throw new Error(`Failed to load approvers: ${approverResponse.status}`);
      }

      if (!workflowResponse.ok) {
        throw new Error(`Failed to load workflows: ${workflowResponse.status}`);
      }

      if (!documentResponse.ok) {
        throw new Error(`Failed to load documents: ${documentResponse.status}`);
      }

      const approverData = await getJson(approverResponse);
      const workflowData = await getJson(workflowResponse);
      const documentData = await getJson(documentResponse);

      setApprovers(Array.isArray(approverData) ? approverData : []);
      setWorkflows(Array.isArray(workflowData) ? workflowData : []);
      setDocuments(Array.isArray(documentData) ? documentData : []);

      // Extract unique template IDs from workflows to minimize API calls for steps
      const uniqueTemplateIds = Array.from(
        new Set(
          (Array.isArray(workflowData) ? workflowData : [])
            .map((workflow: WorkflowInstance) => workflow.templateId)
            .filter((templateId): templateId is number => templateId !== null)
        )
      );

      // Fetch steps for each unique template ID in parallel
      const templateStepEntries = await Promise.all(
        uniqueTemplateIds.map(async (templateId) => {
          const stepResponse = await fetch(`http://localhost:8081/api/templates/${templateId}/steps`);

          if (!stepResponse.ok) {
            return [String(templateId), [] as WorkflowTemplateStep[]] as const;
          }

          const stepData = await getJson(stepResponse);
          return [String(templateId), Array.isArray(stepData) ? stepData : []] as const;
        })
      );

      setTemplateStepsByTemplateId(Object.fromEntries(templateStepEntries));

      // For each workflow, fetch its tasks and flatten the results
      const workflowTasksNested = await Promise.all(
        (Array.isArray(workflowData) ? workflowData : []).map(async (workflow: WorkflowInstance) => {
          const taskResponse = await fetch(`http://localhost:8081/api/tasks/instance/${workflow.id}`);

          if (!taskResponse.ok) {
            return [] as WorkflowTask[];
          }

          const taskData = await getJson(taskResponse);
          return Array.isArray(taskData) ? taskData : [];
        })
      );

      setTasks(workflowTasksNested.flat());
    } catch (err) {
      console.error(err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update auth token from store or localStorage on mount
  useEffect(() => {
    setAuthToken(token ?? localStorage.getItem('token'));
  }, [token]);
  // Load data whenever auth token changes 
  useEffect(() => {
    loadData();
  }, [authToken]);

  const taskRows: TaskRow[] = useMemo(() => {
    return tasks
      .map((task) => {
        // Find the related workflow for this task
        const workflow = workflows.find((item) => item.id === task.instanceId) ?? null;
        // Find the related document for this workflow
        const document = documents.find(
          (item) => String(item.document_id ?? item.id ?? '') === String(workflow?.documentId ?? '')
        );
        const templateStep =
          workflow?.templateId !== null && workflow?.templateId !== undefined
            ? templateStepsByTemplateId[String(workflow.templateId)]?.find(
                (step) => Number(step.stepOrder) === Number(task.stepOrder)
              ) ?? null
            : null;

        const assigneeLabel = formatAssigneeLabel(task.userId, approvers, templateStep);

        // Determine if the task is assigned to the current user based on user ID or role
        const isAssignedToMe = currentUser
          ? String(task.userId) === String(currentUser.userId) ||
            normalize(task.userId) === normalize(currentUser.role)
          : true;

        // Determine if the task is overdue
        const dueDate = workflow?.dueDate ? new Date(workflow.dueDate) : null;
        const isOverdue = Boolean(
          dueDate &&
            workflow?.status?.toUpperCase() !== 'APPROVED' &&
            workflow?.status?.toUpperCase() !== 'REJECTED' &&
            dueDate.getTime() < new Date().setHours(0, 0, 0, 0)
        );

        return {
          task,
          workflow,
          documentTitle:
            document?.title ?? document?.name ?? document?.documentName ?? document?.filename ?? 'Untitled Document',
          assigneeLabel,
          isAssignedToMe,
          isOverdue,
        };
      })
      // Show only tasks assigned to current user
      .filter((row) => row.isAssignedToMe)

      // Sort by workflow due date (soonest first)
      .sort((left, right) => {
        const leftWorkflow = left.workflow?.dueDate ? new Date(left.workflow.dueDate).getTime() : 0;
        const rightWorkflow = right.workflow?.dueDate ? new Date(right.workflow.dueDate).getTime() : 0;
        return leftWorkflow - rightWorkflow;
      });
  }, [approvers, currentUser, documents, tasks, templateStepsByTemplateId, workflows]);

  // Calculate summary counts for each status
  const total = taskRows.length;
  const pending = taskRows.filter((row) => row.task.status.toUpperCase() === 'PENDING').length;
  const approved = taskRows.filter((row) => row.task.status.toUpperCase() === 'APPROVED').length;
  const overdue = taskRows.filter((row) => row.isOverdue).length;
  const rejected = taskRows.filter((row) => row.task.status.toUpperCase() === 'REJECTED').length;

  // Filter displayed rows based on selected status filter
  const displayedRows = useMemo(() => {
    switch (selectedFilter) {
      case 'pending':
        return taskRows.filter((r) => r.task.status.toUpperCase() === 'PENDING');
      case 'approved':
        return taskRows.filter((r) => r.task.status.toUpperCase() === 'APPROVED');
      case 'rejected':
        return taskRows.filter((r) => r.task.status.toUpperCase() === 'REJECTED');
      case 'overdue':
        return taskRows.filter((r) => r.isOverdue);
      case 'all':
      default:
        return taskRows;
    }
  }, [taskRows, selectedFilter]);

  // Function to call API for approving/rejecting a task and then refresh data
  const refreshAfterAction = async (taskId: number, action: 'approve' | 'reject', comment: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(`http://localhost:8081/api/tasks/${taskId}/${action}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${action} task`);
    }
    // Reload data after action
    await loadData();
  };

  const closeActionDialog = () => {
    if (actionLoading) {
      return;
    }
    
    setActiveTask(null);
    setActionType(null);
  };

  const openActionDialog = (task: TaskRow, nextAction: 'approve' | 'reject') => {
    setActiveTask(task);
    setActionType(nextAction);
  };

  const handleActionConfirm = async (comment: string) => {
    if (!activeTask || !actionType) {
      return;
    }

    try {
      setActionLoading(true);
      await refreshAfterAction(activeTask.task.id, actionType, comment);
      closeActionDialog();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${actionType} task`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="mb-2 text-3xl font-bold text-[#8B4513]">My Tasks</h1>
      <p className="mb-6 text-gray-600">Manage your assigned workflow tasks and approvals</p>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card
          title="Total Tasks"
          value={total}
          onClick={() => setSelectedFilter('all')}
          active={selectedFilter === 'all'}
        />
        <Card
          title="Pending"
          value={pending}
          onClick={() => setSelectedFilter('pending')}
          active={selectedFilter === 'pending'}
        />
        <Card
          title="Overdue"
          value={overdue}
          onClick={() => setSelectedFilter('overdue')}
          active={selectedFilter === 'overdue'}
        />
        <Card
          title="Approved"
          value={approved}
          onClick={() => setSelectedFilter('approved')}
          active={selectedFilter === 'approved'}
        />
        <Card
          title="Rejected"
          value={rejected}
          onClick={() => setSelectedFilter('rejected')}
          active={selectedFilter === 'rejected'}
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white p-4 shadow">
        <div className="mb-4 text-sm text-gray-600">
          Signed in as <span className="font-semibold text-gray-900">{currentUser?.username ?? 'Unknown user'}</span>
          {currentUser?.role ? ` (${currentUser.role})` : ''}
        </div>

        {/* Task Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-2">Document</th>
                <th className="p-2">Workflow</th>
                <th className="p-2">Step</th>
                <th className="p-2">Assignee</th>
                <th className="p-2">Status</th>
                <th className="p-2">Due Date</th>
                <th className="p-2">Priority</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {displayedRows.map((row) => {

                // Only allow actions if task is pending
                const canAct = row.task.status.toUpperCase() === 'PENDING';

                return (
                  <tr key={row.task.id} className="border-b hover:bg-gray-50">

                    {/* Document Title */}
                    <td className="p-2">
                      <div className="font-medium text-gray-900">{row.documentTitle}</div>
                    </td>

                    {/* Workflow Name */}
                    <td className="p-2">{row.workflow?.workflowName ?? 'Unknown workflow'}</td>

                    {/* Step Order */}
                    <td className="p-2">Step {row.task.stepOrder}</td>

                    {/* Assignee */}
                    <td className="p-2">{row.assigneeLabel}</td>

                    {/* Status */}
                    <td className="p-2">
                      <span className={`rounded px-2 py-1 text-xs ${statusLabelClass(row.task.status)}`}>
                        {row.task.status}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td className="p-2">
                      <span className={row.isOverdue ? 'font-semibold text-red-600' : 'text-gray-700'}>
                        {row.workflow?.dueDate ?? 'N/A'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="p-2">
                      <span className={`rounded px-2 py-1 text-xs ${priorityClass(row.workflow?.priority ?? '')}`}>
                        {row.workflow?.priority ?? 'N/A'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openActionDialog(row, 'approve')}
                          disabled={!canAct}
                          className="bg-[#8B4513] text-white hover:bg-[#A0522D] disabled:cursor-not-allowed disabled:opacity-50"
                          size="sm"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => openActionDialog(row, 'reject')}
                          disabled={!canAct}
                          variant="destructive"
                          size="sm"
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {displayedRows.length === 0 && (
          <p className="py-6 text-center text-gray-500">No tasks assigned</p>
        )}
      </div>

      <ApproveTaskDialog
        open={actionType === 'approve' && activeTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeActionDialog();
          }
        }}
        documentName={activeTask?.documentTitle ?? ''}
        onConfirm={handleActionConfirm}
        loading={actionLoading}
      />

      <RejectTaskDialog
        open={actionType === 'reject' && activeTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeActionDialog();
          }
        }}
        documentName={activeTask?.documentTitle ?? ''}
        onConfirm={handleActionConfirm}
        loading={actionLoading}
      />
    </div>
  );
}

// Reusable card component for summary counts
function Card({
  title,
  value,
  onClick,
  active,
}: {
  title: string;
  value: number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg bg-white p-4 text-center shadow transition-colors focus:outline-none ${
        active ? 'ring-2 ring-[#8B4513]/30' : 'hover:bg-gray-50'
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </button>
  );
}
