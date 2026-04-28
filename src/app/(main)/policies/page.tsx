"use client";

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, FileText, Clock, Layers, Lock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateWorkflowTemplateDialog from '@/components/ui/workflow/create-workflow-template-dialog';

type WorkflowTemplate = {
  id: number;
  name: string;
  description?: string;
  documentType?: string;
  numberOfSteps?: number;
  workflowType?: string;
  createdBy?: string;
  systemTemplate?: boolean;
  createdAt?: string;
};

type WorkflowTemplateStep = {
  id?: number;
  templateId?: number;
  stepOrder: number;
  approverUserId?: string;
  approverName?: string;
  approverRole?: string;
};

type WorkflowInstance = {
  id: number;
  templateId: number | null;
};

type TemplateRow = {
  template: WorkflowTemplate;
  stepCount: number;
  approverSummary: string;
  usageCount: number;
};

export default function PoliciesPage() {
  const [open, setOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'workflows' | 'metadata' | 'retention' | 'classification' | 'lock' | 'tags'>('workflows');
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [templateSteps, setTemplateSteps] = useState<Record<number, WorkflowTemplateStep[]>>({});
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const safeJson = async (response: Response) => {
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
      const [templateResponse, workflowResponse] = await Promise.all([
        fetch('http://localhost:8081/api/templates'),
        fetch('http://localhost:8081/api/workflows'),
      ]);

      if (!templateResponse.ok) {
        throw new Error(`Failed to load templates: ${templateResponse.status}`);
      }

      if (!workflowResponse.ok) {
        throw new Error(`Failed to load workflows: ${workflowResponse.status}`);
      }

      const templateData = await safeJson(templateResponse);
      const workflowData = await safeJson(workflowResponse);
      const templateList = Array.isArray(templateData) ? templateData : [];
      const workflowList = Array.isArray(workflowData) ? workflowData : [];

      setTemplates(templateList);
      setWorkflows(workflowList);

      const stepEntries = await Promise.all(
        templateList.map(async (template: WorkflowTemplate) => {
          const response = await fetch(`http://localhost:8081/api/templates/${template.id}/steps`);

          if (!response.ok) {
            return [template.id, [] as WorkflowTemplateStep[]] as const;
          }

          const data = await safeJson(response);
          return [template.id, Array.isArray(data) ? data : []] as const;
        })
      );

      setTemplateSteps(Object.fromEntries(stepEntries));
    } catch (err) {
      console.error(err);
      setError('Failed to load workflow templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rows: TemplateRow[] = useMemo(() => {
    return templates
      .map((template) => {
        const steps = templateSteps[template.id] ?? [];
        const usageCount = workflows.filter((workflow) => workflow.templateId === template.id).length;
        const stepCount = steps.length || Number(template.numberOfSteps ?? 0);
        const approverSummary =
          steps.length > 0
            ? steps
                .map((step) => step.approverName || step.approverRole || `Step ${step.stepOrder}`)
                .join(', ')
            : 'No approvers configured';

        return {
          template,
          stepCount,
          approverSummary,
          usageCount,
        };
      })
      .sort((left, right) => {
        const leftDate = left.template.createdAt ? new Date(left.template.createdAt).getTime() : 0;
        const rightDate = right.template.createdAt ? new Date(right.template.createdAt).getTime() : 0;
        return rightDate - leftDate;
      });
  }, [templates, templateSteps, workflows]);

  const handleCreate = () => {
    setEditingTemplateId(null);
    setOpen(true);
  };

  const handleEdit = (templateId: number) => {
    setEditingTemplateId(templateId);
    setOpen(true);
  };

  const handleDelete = async (templateId: number) => {
    const template = templates.find((item) => item.id === templateId);
    const confirmed = window.confirm(
      `Delete workflow template "${template?.name ?? 'this template'}"? This will also remove its steps.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8081/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.status}`);
      }

      await loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete workflow template');
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-gray-600">Loading workflow templates...</div>;
  }

  if (error) {
    return <div className="p-8 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="mb-2 text-3xl font-bold text-[#8B4513]">Manage Policies & Configuration</h1>
      <p className="mb-6 text-gray-600">
        Configure document workflows, retention policies, classification rules, and metadata standards
      </p>

      <div className="mb-6 flex w-fit items-center gap-6 rounded-full bg-white px-6 py-3 shadow">
        <Tab icon={<FileText />} label="Workflows" active={activeTab === 'workflows'} onClick={() => setActiveTab('workflows')} />
        <Tab icon={<FileText />} label="Metadata Fields" active={activeTab === 'metadata'} onClick={() => setActiveTab('metadata')} />
        <Tab icon={<Clock />} label="Retention" active={activeTab === 'retention'} onClick={() => setActiveTab('retention')} />
        <Tab icon={<Layers />} label="Classification" active={activeTab === 'classification'} onClick={() => setActiveTab('classification')} />
        <Tab icon={<Lock />} label="Lock/Unlock" active={activeTab === 'lock'} onClick={() => setActiveTab('lock')} />
        <Tab icon={<Tag />} label="Tags & Filters" active={activeTab === 'tags'} onClick={() => setActiveTab('tags')} />
      </div>

      {activeTab === 'workflows' ? (
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Workflow Templates</h2>

            <Button
              onClick={handleCreate}
              className="bg-[#a34713] px-4 py-2 text-base font-medium text-white hover:bg-[#8e3d10]"
            >
              + Create Workflow
            </Button>
          </div>

          <div className="grid grid-cols-[2.2fr_0.8fr_1.5fr_1fr_1fr_0.8fr] border-b pb-3 text-sm text-gray-500">
            <div>Workflow Template Name</div>
            <div>Steps</div>
            <div>Approvers</div>
            <div>Documents Using</div>
            <div>Created At</div>
            <div>Actions</div>
          </div>

          <div className="divide-y">
            {rows.map((row) => (
              <div
                key={row.template.id}
                className="grid grid-cols-[2.2fr_0.8fr_1.5fr_1fr_1fr_0.8fr] items-center py-4 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{row.template.name}</p>
                  <p className="text-xs text-gray-500">
                    {row.template.description || 'No description provided'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {row.template.documentType || 'Unknown document type'}
                  </p>
                </div>

                <div>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {row.stepCount} {row.stepCount === 1 ? 'Step' : 'Steps'}
                  </span>
                </div>

                <div className="pr-3 text-gray-700">{row.approverSummary}</div>

                <div className="text-gray-700">{row.usageCount} docs</div>

                <div className="text-gray-700">
                  {row.template.createdAt
                    ? new Date(row.template.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(row.template.id)}
                    className="text-gray-600 transition hover:text-[#8B4513]"
                    aria-label={`Edit ${row.template.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row.template.id)}
                    className="text-red-500 transition hover:text-red-700"
                    aria-label={`Delete ${row.template.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">No workflow templates found</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white p-10 text-center shadow">
          <p className="text-lg font-medium text-gray-900">No data available yet</p>
          <p className="mt-2 text-sm text-gray-500">
            This section is handled by your group members. Please check back later.
          </p>
        </div>
      )}

      <CreateWorkflowTemplateDialog
        open={open}
        onOpenChange={setOpen}
        templateId={editingTemplateId}
        onSaved={loadData}
      />
    </div>
  );
}

function Tab({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-left transition ${active ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
