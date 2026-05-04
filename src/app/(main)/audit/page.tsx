"use client"

import React, { useEffect, useRef, useState } from "react";
import AuditHeader from "@/components/ui/audit/audit-header";
import AuditFilter from "@/components/ui/audit/audit-filters";
import AuditTable from "@/components/ui/audit/audit-table";
import AuditRetention from "@/components/ui/audit/audit-retention";

export default function AuditPage() {
    const tableRef = useRef<{ exportToCSV: () => void; exportToPDF?: () => void }>(null);
    const [logs, setLogs] = useState<any[]>([]);

    // 1. Initial Fetch function
    const fetchLogs = () => {
        fetch("http://localhost:8081/admin/logs")
            .then((response) => response.json())    
            .then((data) => {
                setLogs(data);
            })
            .catch((error) => console.error("Error fetching logs:", error));
    };

    // 2. Load logs when page opens
    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <main className="min-h-screen bg-muted/40 flex justify-center ">
            <div className="w-full max-w-7xl p-4 md:p-8 lg:p-12 space-y-4">
                <AuditHeader 
                    onExportCSV={() => tableRef.current?.exportToCSV()} 
                    onExportPDF={() => tableRef.current?.exportToPDF && tableRef.current.exportToPDF()} 
                />
                
                {/* 3. FIXED: AuditFilter now only needs onFilter and onReset.
                   The filtering logic and state are now INSIDE AuditFilter.tsx 
                */}
                <AuditFilter 
                    onFilter={(filteredData) => setLogs(filteredData)} 
                    onReset={fetchLogs} 
                /> 

                {/* 4. FIXED: AuditTable only needs the logs and the ref for exporting.
                */}
                <AuditTable 
                   ref={tableRef}
                   logs={logs} 
                />
                
                <AuditRetention />
            </div>
        </main>
    );
}