'use client';

import { useEffect, useState } from 'react';
import { Plus, X, ArrowRight, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Approver {
  id: string;
  userId: string;
}

export default function WorkflowBuilderPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [approvers, setApprovers] = useState<Approver[]>([
    { id: '1', userId: '' },
    { id: '2', userId: '' },
    { id: '3', userId: '' }
  ]);
  const [availableApprovers, setAvailableApprovers] = useState<any[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const isTemplateLocked = Boolean(selectedTemplate);

  const getRoleName = (approver: any) => {
    if (typeof approver?.role === 'string') {
      return approver.role;
    }

    return approver?.role?.name ?? '';
  };

  const isEligibleApprover = (approver: any) => {
    const roleName = getRoleName(approver).trim().toUpperCase();
    return roleName !== '' && roleName !== 'USER';
  };

  const getFolderId = (folder: any) => folder?.folder_id ?? folder?.folderId ?? folder?.id ?? '';

  const getDocumentFolderId = (document: any) => document?.folder_id ?? document?.folderId ?? '';

  const getDocumentTypeForDocument = (documentId: string) => {
    const selectedDoc = documents.find((document) => {
      const currentDocumentId = document?.document_id ?? document?.id ?? '';
      return String(currentDocumentId) === String(documentId);
    });

    if (!selectedDoc) {
      return '';
    }

    const folderId = getDocumentFolderId(selectedDoc);
    const matchedFolder = folders.find((folder) => String(getFolderId(folder)) === String(folderId));

    return matchedFolder?.name ?? '';
  };

  const safeJson = async (response: Response) => {
    const text = await response.text();

    if (!text.trim()) {
      return null;
    }

    return JSON.parse(text);
  };

  

  useEffect(() => {
    fetch("http://localhost:8081/api/documents")
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

  useEffect(() => {
    fetch('http://localhost:8081/api/templates')
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
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    fetch('http://localhost:8081/api/folders')
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

  useEffect(() => {
    fetch("http://localhost:8081/api/users")
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

    if (selectedTemplateData) {
      setDescription(selectedTemplateData.description ?? '');
      setDocumentType(selectedTemplateData.documentType ?? '');
    }

    if (templateId) {
      try {
        const res = await fetch(`http://localhost:8081/api/templates/${templateId}/steps`);

        if (!res.ok) {
          throw new Error(`Template steps request failed: ${res.status}`);
        }

        const steps = await safeJson(res);

        if (Array.isArray(steps)) {
          setApprovers(
            steps.map((step: any, index: number) => ({
              id: index.toString(),
              userId: step.approverUserId ?? step.approverRole ?? ''
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
    }
  };

  const addApprover = () => {
    const newId = Date.now().toString();
    setApprovers([...approvers, { id: newId, userId: '' }]);
  };

  const removeApprover = (id: string) => {
    if (approvers.length > 1) {
      setApprovers(approvers.filter(approver => approver.id !== id));
    }
  };

  const updateApprover = (id: string, userId: string) => {
    setApprovers(approvers.map(approver => 
      approver.id === id ? { ...approver, userId } : approver
    ));
  };

  const clearForm = () => {
    setSelectedDocument('');
    setSelectedTemplate('');
    setWorkflowName('');
    setDescription('');
    setDocumentType('');
    setApprovers([
      { id: '1', userId: '' },
      { id: '2', userId: '' },
      { id: '3', userId: '' }
    ]);
    setDueDate('');
    setPriority('');
    setSaveAsTemplate(false);
    setTemplateName('');
  };

  const handleSubmit = async () => {

    if (!selectedDocument || !workflowName || !priority || !dueDate) {
      alert("Please fill all required fields");
      return;
    }

    if (!selectedTemplate && approvers.length === 0) {
      alert("Add at least one approver");
      return;
    }

    // Prevent duplicate approvers
    const selectedApproverIds = approvers.map((a) => String(a.userId ?? "").trim()).filter(Boolean);
    if (new Set(selectedApproverIds).size !== selectedApproverIds.length) {
      alert('Each step must have a unique approver. Please remove duplicates.');
      return;
    }

    if (saveAsTemplate && !templateName.trim()) {
      alert("Please enter a template name");
      return;
    }
    
    const payload = {
      documentId: selectedDocument,
      documentType: documentType || getDocumentTypeForDocument(selectedDocument),
      templateId: selectedTemplate || null,
      workflowName,
      description,
      priority,
      dueDate,
      approvers: approvers.map(a => a.userId),
      createdByUserId: "TEMP_USER",
      saveAsTemplate: saveAsTemplate,
      templateName: saveAsTemplate ? templateName.trim() : ""
    };

    try {
      const response = await fetch("http://localhost:8081/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      const data = text.trim() ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.message ?? `Workflow creation failed: ${response.status}`);
      }

      alert('Workflow created successfully');
      console.log("Workflow created:", data);

    } catch (error) {
      console.error("Error creating workflow:", error);
      alert(error instanceof Error ? error.message : 'Workflow creation failed');
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
                    Select Document
                  </label>
                  <select
                    value={selectedDocument}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedDocument(value);
                      setDocumentType(getDocumentTypeForDocument(value));
                    }}
                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                  >
                    <option value=""disabled hidden>Choose a document</option>
                    {documents.map((doc) => (
                      <option key={doc.document_id ?? doc.id} value={doc.document_id ?? doc.id}>
                        {doc.title ?? doc.name ?? doc.documentName ?? doc.filename}
                      </option>
                    ))}
                  </select>
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
                    Workflow Name
                  </label>
                  <Input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="Enter workflow name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe the workflow purpose and when it applies"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={isTemplateLocked}
                    className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                    />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3b3b3b]">
                    Document Type 
                  </label>
                  <div className="relative">
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={isTemplateLocked}
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
              </div>
            

                {/* Approval Chain */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Approval Chain
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
                    Due Date
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="pr-10"
                    />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                  >
                    <option value=""disabled hidden>Select priority</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
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
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-[#8B4513] hover:bg-[#A0522D] text-white"
                    size="lg"
                  >
                    Submit Workflow
                  </Button>
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
        <div className="space-y-6">
          {/* Workflow Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-75 overflow-y-auto pr-2">

                {templates.length > 0 ? (
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
                  <span>Sequential workflows process approvers one by one</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#8B4513] mt-0.5">•</span>
                  <span>Parallel workflows send to all approvers simultaneously</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#8B4513] mt-0.5">•</span>
                  <span>Set realistic due dates for better compliance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#8B4513] mt-0.5">•</span>
                  <span>Add comments to provide context for approvers</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
