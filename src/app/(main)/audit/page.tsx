"use client"

import React, { useEffect, useRef, useState } from "react";
import AuditHeader from "@/components/ui/audit/audit-header";
import AuditFilter from "@/components/ui/audit/audit-filters";
import AuditTable from "@/components/ui/audit/audit-table";
import AuditRetention from "@/components/ui/audit/audit-retention";
import { API_BASE_URL, AUDIT_CONFIG } from "@/lib/constants";
import { auditService } from "@/lib/auditService";

export default function AuditPage() {
    const tableRef = useRef<{ exportToCSV: () => void; exportToPDF?: () => void }>(null);
    const [logs, setLogs] = useState<any[]>([]);

    //Initial Fetch function
const fetchLogs = async () => {
    try {
        // The component no longer cares about URLs or response statuses
        const data = await auditService.getLogs();
        setLogs(data);
    } catch (error) {
        console.error("Failed to load audit logs:", error);
        setLogs([]); 
    }
};

    //Load logs when page opens
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
                
                {/*AuditFilter now only needs onFilter and onReset.
                   The filtering logic and state are now INSIDE AuditFilter.tsx 
                */}
                <AuditFilter 
                    onFilter={(filteredData) => setLogs(filteredData)} 
                    onReset={fetchLogs} 
                /> 

                {/*AuditTable only needs the logs and the ref for exporting.
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