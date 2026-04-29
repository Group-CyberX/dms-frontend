"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";

type StepApprover = {
  stepOrder: number;
  approverUserId: string;
  approverName: string;
  approverRole: string;
};

type WorkflowTemplate = {
  id: number;
  name: string;
  description?: string;
  documentType?: string;
  numberOfSteps?: number;
  workflowType?: string;
  createdBy?: string;
  systemTemplate?: boolean;
};

type WorkflowTemplateStep = {
  stepOrder: number;
  approverUserId?: string;
  approverName?: string;
  approverRole?: string;
};

// Props for the CreateWorkflowTemplateDialog component
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: number | null;
  onSaved?: () => void;
};

// Creates a default empty step for a given step number
const emptyStep = (stepOrder: number): StepApprover => ({
  stepOrder,
  approverUserId: "",
  approverName: "",
  approverRole: "",
});

export default function CreateWorkflowTemplateDialog({
  open,
  onOpenChange,
  templateId,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [folders, setFolders] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [numberOfSteps, setNumberOfSteps] = useState(1);
  const [documentType, setDocumentType] = useState("");
  const [stepApprovers, setStepApprovers] = useState<StepApprover[]>([emptyStep(1)]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [availableApprovers, setAvailableApprovers] = useState<any[]>([]);

  const isEditMode = Boolean(templateId);

  // Safely extract role name from user object
  const getRoleName = (approver: any) => {
    if (typeof approver?.role === "string") {
      return approver.role;
    }

    return approver?.role?.name ?? "";
  };

  // Filter only valid approvers
  const isEligibleApprover = (approver: any) => {
    const roleName = getRoleName(approver).trim().toUpperCase();
    return roleName !== "" && roleName !== "USER";
  };

  // Prevents crash when backend returns empty response
  const safeJson = async (response: Response) => {
    const text = await response.text();

    if (!text.trim()) {
      return null;
    }

    return JSON.parse(text);
  };

  // Reset form fields when dialog closes or new template is created
  const resetForm = () => {
    setName("");
    setDescription("");
    setNumberOfSteps(1);
    setDocumentType("");
    setStepApprovers([emptyStep(1)]);
  };

  // Load existing template data when editing
  const loadTemplate = async (id: number) => {
    setInitialLoading(true);

    try {
      // Fetch template details and steps in parallel
      const [templateResponse, stepsResponse] = await Promise.all([
        fetch(`http://localhost:8081/api/templates/${id}`),
        fetch(`http://localhost:8081/api/templates/${id}/steps`),
      ]);

      if (!templateResponse.ok) {
        throw new Error(`Template request failed: ${templateResponse.status}`);
      }

      if (!stepsResponse.ok) {
        throw new Error(`Template steps request failed: ${stepsResponse.status}`);
      }

      const templateData = await safeJson(templateResponse);
      const stepsData = await safeJson(stepsResponse);
      const parsedSteps = Array.isArray(stepsData) ? stepsData : [];
      
      // Map steps by step order
      const templateStepMap = new Map<number, WorkflowTemplateStep>();

      parsedSteps.forEach((step: WorkflowTemplateStep) => {
        templateStepMap.set(step.stepOrder, step);
      });

      const resolvedStepCount = Math.max(
        1,
        Number(templateData?.numberOfSteps ?? parsedSteps.length ?? 1) || 1
      );

      // Populate form fields with template data
      setName(templateData?.name ?? "");
      setDescription(templateData?.description ?? "");
      setDocumentType(templateData?.documentType ?? "");
      setNumberOfSteps(resolvedStepCount);

      // Generate step approvers list
      setStepApprovers(
        Array.from({ length: resolvedStepCount }, (_, index) => {
          const stepOrder = index + 1;
          const templateStep = templateStepMap.get(stepOrder);

          return {
            stepOrder,
            approverUserId: templateStep?.approverUserId ?? "",
            approverName: templateStep?.approverName ?? "",
            approverRole: templateStep?.approverRole ?? "",
          };
        })
      );
    } catch (error) {
      console.error(error);
      alert("Failed to load template details");
      onOpenChange(false);
    } finally {
      setInitialLoading(false);
    }
  };

  // Fetch folders for document type selection
  useEffect(() => {
    fetch('http://localhost:8081/api/folders')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Folders request failed: ${res.status}`);
        }

        return safeJson(res);
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setFolders(data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch users for approver selection and filter eligible approvers
  useEffect(() => {
    fetch('http://localhost:8081/api/users')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Users request failed: ${res.status}`);
        }

        return safeJson(res);
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableApprovers(data.filter(isEligibleApprover));
        }
      })
      .catch((err) => {
        console.error(err);
        setAvailableApprovers([]);
      });
  }, []);

  // Load template data when dialog opens in edit mode
  useEffect(() => {
    if (!open) {
      return;
    }

    // If templateId is provided, we are in edit mode and should load the template data
    if (templateId) {
      loadTemplate(templateId);
      return;
    }

    resetForm();
  }, [open, templateId]);

  // Adjust step approvers list when number of steps changes
  useEffect(() => {
    const updated: StepApprover[] = [];

    for (let i = 1; i <= numberOfSteps; i++) {
      const existing = stepApprovers.find((step) => step.stepOrder === i);
      updated.push(existing ?? emptyStep(i));
    }

    setStepApprovers(updated);
   
  }, [numberOfSteps]);

  const handleClose = () => {
    onOpenChange(false);
  };

  // Validate form and send request to backend
  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Workflow template name is required");
      return;
    }

    if (!description.trim()) {
      alert("Description is required");
      return;
    }

    if (!documentType) {
      alert("Please select document type");
      return;
    }

    // Ensure each step has an approver
    const hasEmptyApprover = stepApprovers.some((step) => !String(step.approverUserId ?? "").trim());

    if (hasEmptyApprover) {
      alert("Please select approver for each step");
      return;
    }

    // Prevent duplicate approvers
    const selectedIds = stepApprovers
      .map((s) => String(s.approverUserId ?? "").trim())
      .filter((v) => v !== "");

    const uniqueCount = new Set(selectedIds).size;
    if (uniqueCount !== selectedIds.length) {
      alert("Duplicate approvers are not allowed.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      documentType,
      numberOfSteps,
      workflowType: "SEQUENTIAL",
      createdBy: "DOC ADMIN",
      systemTemplate: true,
      stepApprovers,
    };

    try {
      setLoading(true);
      // Send POST request for new template or PUT request for updating existing template
      const response = await fetch(
        templateId ? `http://localhost:8081/api/templates/${templateId}` : 'http://localhost:8081/api/templates',
        {
          method: templateId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(templateId ? 'Failed to update template' : 'Failed to create template');
      }

      alert(templateId ? 'Workflow template updated successfully' : 'Workflow template created successfully');
      resetForm();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error(error);
      alert(templateId ? 'Failed to update workflow template' : 'Failed to create workflow template');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-132.5 rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 className="text-[18px] font-semibold text-[#2f2f2f]">
              {isEditMode ? 'Edit Workflow Template' : 'Create Workflow Template'}
            </h2>
            <p className="mt-2 text-sm text-[#666666]">
              {isEditMode
                ? 'Update the workflow template and its approval steps'
                : 'Design a new workflow template for document approval and processing'}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="text-gray-500 transition hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 pb-6 pt-6">
          {initialLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading template...</div>
          ) : (
            <div className="space-y-5">

              {/* Template Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                  Workflow Template Name <span className="text-[#3b3b3b]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Invoice Approval Workflow"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                  Description <span className="text-[#3b3b3b]">*</span>
                </label>
                <textarea
                  placeholder="Describe the workflow purpose and when it applies"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full h-20 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                />
              </div>

              {/* Number of Steps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                    Number of Steps <span className="text-[#3b3b3b]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={numberOfSteps}
                    onChange={(e) =>
                      setNumberOfSteps(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                  />
                </div>

                {/* Document Type Selection */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                    Document Type <span className="text-[#3b3b3b]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring appearance-none"
                    >
                      <option value="" disabled hidden>
                        Select type
                      </option>
                      {folders.map((folder) => (
                        <option key={folder.folder_id ?? folder.id ?? folder.name} value={folder.name}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Approver Selection for Each Step */}
              <div className="rounded-xl border border-[#e1e1e1] px-5 py-5">
                <h3 className="text-[16px] font-semibold text-[#3b3b3b]">
                  Approvers for Each Step <span>*</span>
                </h3>
                <p className="mt-3 text-sm text-[#666666]">
                  Select approvers for each workflow step
                </p>

                <div className="mt-5 space-y-4">
                  {stepApprovers.map((step) => (
                    <div key={step.stepOrder}>
                      <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                        Step {step.stepOrder} Approver
                      </label>

                      <div className="relative">
                        <select
                          value={step.approverUserId}
                          onChange={(e) => {
                            const selectedUser = availableApprovers.find(
                              (approver) => String(approver.userId) === e.target.value
                            );

                            setStepApprovers((prev) =>
                              prev.map((currentStep) =>
                                currentStep.stepOrder === step.stepOrder
                                  ? {
                                      ...currentStep,
                                      approverUserId: e.target.value,
                                      approverName: selectedUser?.username ?? "",
                                      approverRole: selectedUser ? getRoleName(selectedUser) : "",
                                    }
                                  : currentStep
                              )
                            );
                          }}
                          className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring appearance-none"
                        >
                          <option value="" disabled hidden>
                            Select approver
                          </option>
                          {availableApprovers
                            // Filter out approvers that are already selected for other steps
                            .filter((approver) => {
                              const otherSelected = stepApprovers
                                .filter((s) => s.stepOrder !== step.stepOrder)
                                .map((s) => String(s.approverUserId ?? "").trim())
                                .filter((v) => v !== "");

                              return !otherSelected.includes(String(approver.userId));
                            })
                            .map((approver) => (
                              <option key={approver.userId} value={approver.userId}>
                                {approver.username} - {getRoleName(approver)}
                              </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
                
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-[#d8d8d8] bg-white px-6 py-2.5 text-sm font-medium text-[#3b3b3b] transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-lg bg-[#a34713] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#8e3d10] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Workflow'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
