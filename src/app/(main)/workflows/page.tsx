'use client';

import { useEffect, useState } from 'react';
import { Plus, X, ArrowRight, Calendar, ChevronDown, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { fetchWithAuth } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { hasPermission } from '@/lib/access-control';
import { notify } from '@/lib/feedback';

//Represents an approver in the workflow
interface Approver {
  id: string;
  userId: string;
  username: string;
  role: string;
}

export default function WorkflowBuilderPage() {
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);

  const [documents, setDocuments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [folders, setFolders] = useState<any[]>([]);

  const [selectedDocument, setSelectedDocument] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [workflowName, setWorkflowName] = useState('');
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [workflowType, setWorkflowType] = useState<'SEQUENTIAL' | 'PARALLEL' | ''>('');
  
  const [approvers, setApprovers] = useState<Approver[]>([
    { id: '1', userId: '', username: '', role: '' }
  ]);
  const [availableApprovers, setAvailableApprovers] = useState<any[]>([]);
  // What the last submit rejected, keyed by field. Each message is cleared as
  // its own field is edited rather than only on the next submit.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('');

  // Option to save workflow as a reusable template
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // When set, approvers are taken to the signing page to place a signature on
  // the PDF instead of approving straight from the comment dialog. Prefilled
  // from the chosen template, but can be overridden for this workflow.
  const [requiresSignature, setRequiresSignature] = useState(false);

  // If a template is selected, lock certain fields and approver selection
  const isTemplateLocked = Boolean(selectedTemplate);

  // Extract role name safely
  const getRoleName = (approver: any) => {
    if (typeof approver?.role === 'string') {
      return approver.role;
    }

    return approver?.role?.name ?? '';
  };

  // Only allow users with a defined role other than 'USER' to be approvers
  const isEligibleApprover = (approver: any) => {
    const roleName = getRoleName(approver).trim().toUpperCase();
    return roleName !== '' && roleName !== 'USER';
  };

  const getFolderId = (folder: any) => folder?.folder_id ?? folder?.folderId ?? folder?.id ?? '';

  const getDocumentFolderId = (document: any) => document?.folder_id ?? document?.folderId ?? '';

  // Determine document type based on its folder
  const getDocumentTypeForDocument = (documentId: string) => {
    const selectedDoc = documents.find((document) => {
      const currentDocumentId = document?.document_id ?? document?.id ?? '';
      return String(currentDocumentId) === String(documentId);
    });

    if (!selectedDoc) {
      return '';
    }

    // Find the folder for the selected document
    const folderId = getDocumentFolderId(selectedDoc);
    const matchedFolder = folders.find((folder) => String(getFolderId(folder)) === String(folderId));

    return matchedFolder?.name ?? '';
  };

  // Safely parse JSON, handling empty responses
  const safeJson = async (response: Response) => {
    const text = await response.text();

    if (!text.trim()) {
      return null;
    }

    return JSON.parse(text);
  };

  // Fetch documents, templates, folders, and users on component mount
  // Fetch documents
  useEffect(() => {
    fetchWithAuth("http://localhost:8081/api/documents")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Documents request failed: ${res.status}`);
        }

        return safeJson(res);
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setDocuments(data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch workflow templates
  useEffect(() => {
    setTemplatesLoading(true);
    fetchWithAuth('http://localhost:8081/api/templates')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Templates request failed: ${res.status}`);
        }

        return safeJson(res);
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setTemplatesLoading(false));
  }, []);

  // Fetch folders for document type selection
  useEffect(() => {
    fetchWithAuth('http://localhost:8081/api/folders')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Folders request failed: ${res.status}`);
        }

        return safeJson(res);
      })
      .then(data => {
        if (Array.isArray(data)) {
          setFolders(data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch users and filter eligible approvers
  useEffect(() => {
    fetchWithAuth("http://localhost:8081/api/users")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Users request failed: ${res.status}`);
        }

        return safeJson(res);
      })
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableApprovers(data.filter(isEligibleApprover));
        }
      })
      .catch(err => {
        console.error(err);
        setAvailableApprovers([]);
      });
  }, []);

  // Handle template selection and load approvers based on template steps
  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplate(templateId);

    const selectedTemplateData = templates.find(
      (template) => String(template.id) === String(templateId)
    );
    // Pre-fill description and document type based on selected template
    if (selectedTemplateData) {
      setDescription(selectedTemplateData.description ?? '');
      setDocumentType(selectedTemplateData.documentType ?? '');
      setWorkflowType(selectedTemplateData.workflowType ?? '');
      setRequiresSignature(Boolean(selectedTemplateData.requiresSignature));
    } else {
      // Cleared the template - back to a manual workflow with no signature step.
      setRequiresSignature(false);
    }

    // If a template is selected, fetch its steps to populate approvers
    if (templateId) {
      try {
        const res = await fetchWithAuth(`http://localhost:8081/api/templates/${templateId}/steps`);

        if (!res.ok) {
          throw new Error(`Template steps request failed: ${res.status}`);
        }

        const steps = await safeJson(res);

        if (Array.isArray(steps)) {
          setApprovers(
            steps.map((step: any, index: number) => ({
              id: index.toString(),
              userId: step.approverUserId ?? step.approverRole ?? '',
              username: step.approverName ?? '',
              role: step.approverRole ?? ''
            }))
          );
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setApprovers([]);
      setWorkflowName('');
      setDescription('');
      setDocumentType('');
      setWorkflowType('');
    }
  };

  // Add a new approver step to the workflow
  const addApprover = () => {
    const newId = Date.now().toString();
    setApprovers([...approvers, { id: newId, userId: '', username: '', role: '' }]);
  };

  // Remove an approver step by its unique ID, ensuring at least one approver remains
  const removeApprover = (id: string) => {
    if (approvers.length > 1) {
      setApprovers(approvers.filter(approver => approver.id !== id));
    }
  };

  // Update approver selection and ensure no duplicates across steps
  const updateApprover = (id: string, userId: string) => {
    const selectedApprover = availableApprovers.find((approver) => String(approver.userId) === userId);

    setApprovers(approvers.map(approver => 
      approver.id === id
        ? {
            ...approver,
            userId,
            username: selectedApprover?.username ?? '',
            role: getRoleName(selectedApprover)
          }
        : approver
    ));
  };

  const clearForm = () => {
    setSelectedDocument('');
    setSelectedTemplate('');
    setWorkflowName('');
    setDescription('');
    setDocumentType('');
    setApprovers([
      { id: '1', userId: '', username: '', role: '' }
    ]);
    setDueDate('');
    setPriority('');
    setSaveAsTemplate(false);
    setTemplateName('');
  };

  const handleSubmit = async () => {

    // Every problem is reported at once, against the field it belongs to.
    const errors: Record<string, string> = {};

    if (!selectedDocument) errors.selectedDocument = "Choose the document this workflow runs on.";
    if (!workflowName) errors.workflowName = "Give the workflow a name.";
    if (!description) errors.description = "Describe what this workflow is for.";
    if (!documentType) errors.documentType = "Choose a document type.";
    if (!priority) errors.priority = "Choose a priority.";
    if (!dueDate) errors.dueDate = "Pick a due date.";
    if (!workflowType) errors.workflowType = "Choose sequential or parallel.";

    if (!selectedTemplate && approvers.length === 0) {
      errors.approvers = "Add at least one approver.";
    } else {
      const selectedApproverIds = approvers.map((a) => String(a.userId ?? "").trim()).filter(Boolean);
      if (new Set(selectedApproverIds).size !== selectedApproverIds.length) {
        errors.approvers = "Each step needs a different approver.";
      }
    }

    if (saveAsTemplate && !templateName.trim()) {
      errors.templateName = "Name the template you are saving.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    // Prepare request payload
    const payload = {
      documentId: selectedDocument,
      documentType: documentType || getDocumentTypeForDocument(selectedDocument),
      templateId: selectedTemplate || null,
      workflowName,
      description,
      workflowType,
      priority,
      dueDate,
      approvers: approvers.map(a => a.userId),
      createdByUserId: "TEMP_USER",
      requiresSignature,
      saveAsTemplate: saveAsTemplate,
      templateName: saveAsTemplate ? templateName.trim() : ""
    };

    // Send workflow creation request to backend
    try {
      const response = await fetchWithAuth("http://localhost:8081/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      const data = text.trim() ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.message ?? `Workflow creation failed: ${response.status}`);
      }

      notify.success('Workflow created.');
      console.log("Workflow created:", data);

    } catch (error) {
      console.error("Error creating workflow:", error);
      notify.error(error instanceof Error ? error.message : "Could not create the workflow. Try again in a moment.");
    }
  };

  

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#8B4513] mb-2">Workflow Builder</h1>
        <p className="text-gray-600">Create and configure approval workflows for your documents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Create New Workflow */}
        <div className="lg:col-span-2">
          <Card>

            <CardHeader>
              <CardTitle>Create New Workflow</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                {/* Select Document */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Document <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDocument}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedDocument(value);
                      setDocumentType(getDocumentTypeForDocument(value));
                      if (fieldErrors.selectedDocument) setFieldErrors((prev) => ({ ...prev, selectedDocument: "" }));
                    }}
                    required
                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                  >
                    <option value=""disabled hidden>Choose a document</option>
                    {documents.map((doc) => (
                      <option key={doc.document_id ?? doc.id} value={doc.document_id ?? doc.id}>
                        {doc.title ?? doc.name ?? doc.documentName ?? doc.filename}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.selectedDocument && (
                    <p className="mt-1.5 text-sm text-red-600">{fieldErrors.selectedDocument}</p>
                  )}
                </div>

                {/* Workflow Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workflow Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                  >
                    <option value=""disabled hidden>Choose a template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name ?? template.workflowName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Workflow Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workflow Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={workflowName}
                    onChange={(e) => {
                      setWorkflowName(e.target.value);
                      if (fieldErrors.workflowName) setFieldErrors((prev) => ({ ...prev, workflowName: "" }));
                    }}
                    placeholder="Enter workflow name"
                    required
                  />
                  {fieldErrors.workflowName && (
                    <p className="mt-1.5 text-sm text-red-600">{fieldErrors.workflowName}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Describe the workflow purpose and when it applies"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: "" }));
                    }}
                    rows={3}
                    disabled={isTemplateLocked}
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                    />
                  {fieldErrors.description && (
                    <p className="mt-1.5 text-sm text-red-600">{fieldErrors.description}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={documentType}
                      onChange={(e) => {
                        setDocumentType(e.target.value);
                        if (fieldErrors.documentType) setFieldErrors((prev) => ({ ...prev, documentType: "" }));
                      }}
                      disabled={isTemplateLocked}
                      required
                      className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring appearance-none"
                    >
                      <option value="" disabled hidden>Select type</option>
                      {folders.map((folder) => (
                        <option key={folder.folder_id ?? folder.folderId ?? folder.id ?? folder.name} value={folder.name}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  </div>
                  {fieldErrors.documentType && (
                    <p className="mt-1.5 text-sm text-red-600">{fieldErrors.documentType}</p>
                  )}
              </div>

                {/* Workflow Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">Workflow Type <span className="text-red-500">*</span></label>
                  <div className="relative w-48">
                    <select
                      value={workflowType}
                      onChange={(e) => {
                        setWorkflowType(e.target.value as 'SEQUENTIAL' | 'PARALLEL' | '');
                        if (fieldErrors.workflowType) setFieldErrors((prev) => ({ ...prev, workflowType: "" }));
                      }}
                      disabled={isTemplateLocked}
                      required
                      className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring appearance-none"
                    >
                      <option value="" disabled hidden>
                        Select workflow type
                      </option>
                      <option value="SEQUENTIAL">Sequential</option>
                      <option value="PARALLEL">Parallel</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  </div>
                  {fieldErrors.workflowType && (
                    <p className="mt-1.5 text-sm text-red-600">{fieldErrors.workflowType}</p>
                  )}
                </div>
            

                {/* Approval Chain */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Approval Chain <span className="text-red-500">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addApprover}
                      disabled={isTemplateLocked}
                      className="text-[#000000] hover:text-[#000000] hover:bg-[#5c5858]/10 border border-gray-300"
                    >
                      <Plus className="w-4 h-4"  />
                      Add Approver
                    </Button>
                  </div>

                  {fieldErrors.approvers && (
                    <p className="mb-2 text-sm text-red-600">{fieldErrors.approvers}</p>
                  )}

                  <div className="space-y-3">
                    {approvers.map((approver, index) => (
                      <div key={approver.id} className="flex items-center gap-3">

                        {/* Step Number */}
                        <div className="shrink-0 w-8 h-8 bg-[#8B4513] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>

                        {/* Arrow (except for first item) */}
                        {index > 0 && (
                          <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 -ml-2 mr-1" />
                        )}

                        {/* Approver Select */}
                        <select
                          value={approver.userId}
                          onChange={(e) => updateApprover(approver.id, e.target.value)}
                          disabled={isTemplateLocked}
                          className="flex-1 h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                        >
                          <option value=""disabled hidden>Select approver</option>
                            {availableApprovers
                              .filter((opt) => {
                                const otherSelected = approvers
                                  .filter((a) => a.id !== approver.id)
                                  .map((a) => String(a.userId ?? "").trim())
                                  .filter((v) => v !== "");

                                return !otherSelected.includes(String(opt.userId));
                              })
                              .map((approverOpt) => (
                                <option key={approverOpt.userId} value={approverOpt.userId}>
                                  {approverOpt.username} - {getRoleName(approverOpt)}
                                </option>
                              ))}
                        </select>

                        {/* Remove Button */}
                        {approvers.length > 1 && !isTemplateLocked && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeApprover(approver.id)}
                            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        if (fieldErrors.dueDate) setFieldErrors((prev) => ({ ...prev, dueDate: "" }));
                      }}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      className="pr-10"
                    />
                  </div>
                  {fieldErrors.dueDate && (
                    <p className="mt-1.5 text-sm text-red-600">{fieldErrors.dueDate}</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value);
                      if (fieldErrors.priority) setFieldErrors((prev) => ({ ...prev, priority: "" }));
                    }}
                    required
                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                  >
                    <option value=""disabled hidden>Select priority</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  {fieldErrors.priority && (
                    <p className="mt-1.5 text-sm text-red-600">{fieldErrors.priority}</p>
                  )}
                </div>

                {/* Digital signature requirement */}
                <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={requiresSignature}
                      onChange={(e) => setRequiresSignature(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#8B2E00]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">
                        Require a digital signature to approve
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                        Approvers open the signing page and place their signature on the document.
                        It is written into the PDF and saved as a new version. PDF documents only.
                        {selectedTemplate && " Prefilled from the selected template - you can change it for this workflow."}
                      </span>
                    </span>
                  </label>
                </div>

                {/* Save as Template Option */}
                {!selectedTemplate && approvers.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={saveAsTemplate}
                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      />
                      <label className="text-sm">Save as Template</label>
                    </div>

                    {saveAsTemplate && (
                      <input
                        type="text"
                        className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                        placeholder="Template Name"
                        value={templateName}
                        onChange={(e) => {
                          setTemplateName(e.target.value);
                          if (fieldErrors.templateName) setFieldErrors((prev) => ({ ...prev, templateName: "" }));
                        }}
                      />
                    )}
                    {saveAsTemplate && fieldErrors.templateName && (
                      <p className="mt-1.5 text-sm text-red-600">{fieldErrors.templateName}</p>
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {hasPermission(permissions, role, "canCreateWorkflow") && (
                    <Button
                      onClick={handleSubmit}
                      className="flex-1 bg-[#8B4513] hover:bg-[#A0522D] text-white"
                      size="lg"
                    >
                      Submit Workflow
                    </Button>
                  )}
                  <Button
                    onClick={clearForm}
                    variant="outline"
                    size="lg"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column-Mock Data */}
        <div className="space-y-10">
          {/* Workflow Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-75 overflow-y-auto pr-2">

                {templatesLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader className="w-8 h-8 text-[#953002] animate-spin mb-4" />
                    <p className="text-gray-600">Loading templates...</p>
                  </div>
                ) : templates.length > 0 ? (
                  templates.map((template: any) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateChange(template.id.toString())}
                      className="border border-border rounded-lg p-4 hover:border-[#8B4513] cursor-pointer transition"
                    >
                      <h3 className="font-semibold text-sm mb-2">{template.name}</h3>
                      <p className="text-xs text-gray-600 mb-2">{template.documentType}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{template.numberOfSteps} steps</span>
                        <span className="bg-secondary px-2 py-1 rounded">{template.workflowType}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No templates available</p>
                )}

              </div>
            </CardContent>
          </Card>

          {/* Workflow Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-[#8B4513] mt-0.5">•</span>
                  <span>Sequential workflows process approvals step by step in order</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#8B4513] mt-0.5">•</span>
                  <span>Parallel workflows allow all approvers to act at the same time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#8B4513] mt-0.5">•</span>
                  <span>Set realistic due dates to avoid delays</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#8B4513] mt-0.5">•</span>
                  <span>Assign correct roles to the right approvers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#8B4513] mt-0.5">•</span>
                  <span>Keep workflows simple for better efficiency</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
