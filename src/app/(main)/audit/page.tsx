"use client"

import React, { useEffect, useRef ,useState} from "react";
import AuditHeader from "@/components/ui/audit/audit-header";
import AuditFilter from "@/components/ui/audit/audit-filters";
import AuditTable from "@/components/ui/audit/audit-table";
import AuditRetention from "@/components/ui/audit/audit-retention";

export default function AuditPage() {
    // Reference to call exportToCSV and exportToPDF from AuditTable
    const tableRef = useRef<{ exportToCSV: () => void; exportToPDF?: () => void }>(null);

    const [logs, setLogs] = useState<any[]>([]);
    useEffect(() => {
        fetch("http://localhost:8081/admin/logs")
            .then((response) => response.json())    
            .then((data) => {
                console.log("Fetched logs:", data);
                setLogs(data);
            })
            .catch((error) => {
                console.error("Error fetching logs:", error);
            });
    }, []);

    return (
        <main className="min-h-screen bg-muted/40 flex justify-center ">
            <div className="w-full max-w-7xl p-4 md:p-8 lg:p-12 space-y-4">
                <AuditHeader 
                    onExportCSV={() => tableRef.current?.exportToCSV()} 
                    onExportPDF={() => tableRef.current?.exportToPDF && tableRef.current.exportToPDF()} 
                />
                <AuditFilter />
                <AuditTable ref={tableRef} logs={logs} />
                <AuditRetention />

            </div>
        </main>
    );
}

