'use client';

import { useState } from 'react';
import { Plus, X, ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Approver {
  id: string;
  userId: string;
}

export default function WorkflowBuilderPage() {
  const [selectedDocument, setSelectedDocument] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [approvers, setApprovers] = useState<Approver[]>([
    { id: '1', userId: '' },
    { id: '2', userId: '' },
    { id: '3', userId: '' }
  ]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('');

  const addApprover = () => {
    const newId = (approvers.length + 1).toString();
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

  const handleSubmit = () => {
    console.log({
      selectedDocument,
      selectedTemplate,
      workflowName,
      approvers,
      dueDate,
      priority
    });
    alert('Workflow submitted!');
  };

  const handleSaveAsDraft = () => {
    console.log('Saved as draft');
    alert('Workflow saved as draft!');
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
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                  >
                    <option value=""disabled hidden>Choose a document</option>
                    <option value="invoice1">Invoice_Q1_2025.pdf</option>
                    <option value="contract1">Contract_ABC_Corp.pdf</option>
                    <option value="po1">PO_12345.pdf</option>
                  </select>
                </div>

                {/* Workflow Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workflow Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                  >
                    <option value=""disabled hidden>Choose a template</option>
                    <option value="invoice">Invoice Approval</option>
                    <option value="contract">Contract Review</option>
                    <option value="po">PO Approval</option>
                    <option value="document">Document Review</option>
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
                          className="flex-1 h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm shadow-xs focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                        >
                          <option value=""disabled hidden>Select approver</option>
                          <option value="user1">John Doe</option>
                          <option value="user2">Jane Smith</option>
                          <option value="user3">Kamal Gunarathne</option>
                          <option value="user4">Sarah Johnson</option>
                        </select>

                        {/* Remove Button */}
                        {approvers.length > 1 && (
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
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

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
                    onClick={handleSaveAsDraft}
                    variant="outline"
                    size="lg"
                  >
                    Save as Draft
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
              <div className="space-y-3">
                {/* Invoice Approval */}
                <div className="border border-border rounded-lg p-4 hover:border-[#8B4513] cursor-pointer transition">
                  <h3 className="font-semibold text-sm mb-2">Invoice Approval</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>3 steps</span>
                    <span className="bg-secondary px-2 py-1 rounded">Sequential</span>
                  </div>
                </div>

                {/* Contract Review */}
                <div className="border border-border rounded-lg p-4 hover:border-[#8B4513] cursor-pointer transition">
                  <h3 className="font-semibold text-sm mb-2">Contract Review</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>4 steps</span>
                    <span className="bg-secondary px-2 py-1 rounded">Parallel</span>
                  </div>
                </div>

                {/* PO Approval */}
                <div className="border border-border rounded-lg p-4 hover:border-[#8B4513] cursor-pointer transition">
                  <h3 className="font-semibold text-sm mb-2">PO Approval</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>2 steps</span>
                    <span className="bg-secondary px-2 py-1 rounded">Sequential</span>
                  </div>
                </div>

                {/* Document Review */}
                <div className="border border-border rounded-lg p-4 hover:border-[#8B4513] cursor-pointer transition">
                  <h3 className="font-semibold text-sm mb-2">Document Review</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>3 steps</span>
                    <span className="bg-secondary px-2 py-1 rounded">Sequential</span>
                  </div>
                </div>
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
