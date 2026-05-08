"use client"

import React, { useEffect, useRef, useState, useCallback } from "react";
import AuditHeader from "@/components/ui/audit/audit-header";
import AuditFilter from "@/components/ui/audit/audit-filters";
import AuditTable from "@/components/ui/audit/audit-table";
import AuditRetention from "@/components/ui/audit/audit-retention";
import { auditService } from "@/lib/auditService";

export default function AuditPage() {
    const tableRef = useRef<{ exportToCSV: () => void; exportToPDF?: () => void }>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Using useCallback to ensure fetchLogs is stable across renders
    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await auditService.getLogs();
            setLogs(data);
        } catch (error) {
            console.error("Failed to load audit logs:", error);
            setLogs([]); 
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load logs on initial mount
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <main className="min-h-screen bg-muted/40 flex justify-center ">
            <div className="w-full max-w-7xl p-4 md:p-8 lg:p-12 space-y-4">
                <AuditHeader 
                    onExportCSV={() => tableRef.current?.exportToCSV()} 
                    onExportPDF={() => tableRef.current?.exportToPDF?.()} 
                />

                <AuditFilter 
                    onFilter={(filteredData) => setLogs(filteredData)} 
                    onReset={fetchLogs} 
                /> 

                {isLoading ? (
                    <div className="w-full py-20 text-center border rounded-lg bg-white">
                        <p className="text-muted-foreground animate-pulse">Loading audit records...</p>
                    </div>
                ) : (
                    <AuditTable 
                        ref={tableRef}
                        logs={logs} 
                    />
                )}
                
                <AuditRetention />
            </div>
        </main>
    );
}