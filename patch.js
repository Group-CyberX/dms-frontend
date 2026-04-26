const fs = require('fs');
const file = 'src/app/(main)/documents/[id]/page.tsx';
let data = fs.readFileSync(file, 'utf8');

const startStr = `  const fileExtension = document.title ? getFileExtension(document.title) : 'FILE';`;
const endStr = `<div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>`;

const parts = data.split(startStr);
const rest = parts[1].split(endStr);

const replacement = `  const fileExtension = document.title ? getFileExtension(document.title) : 'FILE';

  // Map metadata array into a key-value object for easy lookup
  const metaObj: Record<string, string> = {};
  let displayStatus = "Pending";
  let displayOwner = document.owner_id === '00000000-0000-0000-0000-000000000000' ? 'System Admin' : 'Unknown Owner';

  if (document.metadata && Array.isArray(document.metadata)) {
    document.metadata.forEach((m: any) => {
      // Keep the EXACT key for saving/updating back to the database
      metaObj[m.key] = m.value;
      
      const lowerKey = m.key.toLowerCase();
      if (lowerKey === "status") displayStatus = m.value;
      if (lowerKey === "owner") displayOwner = m.value;
    });
  }

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#953002] hover:text-[#7a2401] mb-4 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
            <div className="flex gap-3">
              <Button 
                className="bg-[#953002] hover:bg-[#7a2401] text-white"
                onClick={() => document.current_version_id && handleDownloadVersion(document.current_version_id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button 
                className="bg-[#953002] hover:bg-[#7a2401] text-white"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                New Version
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex flex-col items-center justify-center min-h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">{fileExtension} Document Preview</p>
                <p className="text-sm text-gray-500 mt-2">{document.title}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Document Information</h2>
                {!isAdding && (
                  <Button variant="ghost" size="icon" onClick={() => setIsAdding(true)} className="h-8 w-8 text-[#953002]">
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* Default static info */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Created Date</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(document.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Owner</p>
                  <p className="text-sm text-gray-900 mt-1">{displayOwner}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={\`px-3 py-1 rounded-full text-xs font-medium \${
                      displayStatus.toLowerCase() === 'approved' 
                        ? 'bg-[#953002] text-white' 
                        : 'bg-amber-600 text-white'
                    }\`}>
                      {displayStatus}
                    </span>
                    {document.is_locked && <span title="Locked"><Lock className="w-4 h-4 text-gray-600" /></span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Document ID</p>
                  <p className="text-xs text-gray-600 mt-1 font-mono break-all">{document.document_id}</p>
                </div>

                <hr className="my-4 border-gray-100" />
                
                {/* Add New Metadata Inline Form */}
                {isAdding && (
                  <div className="p-3 border border-[#953002]/20 bg-[#953002]/5 rounded-lg space-y-3 mb-4">
                    <div className="text-xs font-semibold text-[#953002] mb-1">Add Metadata</div>
                    <Input 
                      placeholder="Key (e.g. Department)" 
                      value={newKey} 
                      onChange={e => setNewKey(e.target.value)} 
                      className="h-8 text-sm"
                    />
                    <Input 
                      placeholder="Value (e.g. HR)" 
                      value={newValue} 
                      onChange={e => setNewValue(e.target.value)} 
                      className="h-8 text-sm"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsAdding(false)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-xs bg-[#953002] hover:bg-[#7a2401] text-white" onClick={handleAddMeta}>Save</Button>
                    </div>
                  </div>
                )}

                {/* Editable Metadata array */}
                {Object.keys(metaObj).length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No additional metadata</div>
                ) : (
                  Object.entries(metaObj).map(([key, value]) => {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey === 'status' || lowerKey === 'owner') return null; // Displayed above
                    
                    const isEditing = editingKey === key;
                    const isSystemKey = lowerKey === 'file-size' || lowerKey === 'content-type' || lowerKey === 'word-count';

                    return (
                      <div className="space-y-1.5 group" key={key}>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-gray-500 uppercase">
                            {key.replace(/_/g, ' ')}
                          </Label>
                          
                          {/* Actions */}
                          {!isSystemKey && !isEditing && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button onClick={() => { setEditingKey(key); setEditValue(value); }} className="p-1 text-gray-400 hover:text-blue-600">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteMeta(key)} className="p-1 text-gray-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Value View / Edit */}
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Button size="sm" className="h-8 w-8 p-0 shrink-0 bg-[#953002] hover:bg-[#7a2401]" onClick={() => handleUpdateMeta(key)}>
                              <CheckCircle className="w-4 h-4 text-white" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setEditingKey(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-100 break-words">
                            {value}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            `;
fs.writeFileSync(file, parts[0] + replacement + endStr + rest[1]);
