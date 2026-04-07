"use client"

import React, { useEffect, useRef, useState } from "react";
import AuditHeader from "@/components/ui/audit/audit-header";
import AuditFilter from "@/components/ui/audit/audit-filters";
import AuditTable from "@/components/ui/audit/audit-table";
import AuditRetention from "@/components/ui/audit/audit-retention";

export default function AuditPage() {
    const tableRef = useRef<{ exportToCSV: () => void; exportToPDF?: () => void }>(null);
    const [logs, setLogs] = useState<any[]>([]);

    // 1. Create the State for filters here so it can be shared
    const [filters, setFilters] = useState({
        userId: "",
        action: "",
        fromDate: "",
        toDate: ""
    });

    // 2. Fetch all logs (Initial load or Reset)
    const fetchLogs = () => {
        fetch("http://localhost:8081/admin/logs")
            .then((response) => response.json())    
            .then((data) => {
                setLogs(data);
            })
            .catch((error) => console.error("Error fetching logs:", error));
    };

    // 3. Handle specific filtering
    const handleApplyFilters = async () => {
        try {
            const params = new URLSearchParams();
            // Only add params if they aren't empty or the default 'all' string
            if (filters.userId && filters.userId !== "all") params.append("userId", filters.userId);
            if (filters.action && filters.action !== "all") params.append("action", filters.action);
            if (filters.fromDate) params.append("fromDate", filters.fromDate);
            if (filters.toDate) params.append("toDate", filters.toDate);

            const response = await fetch(`http://localhost:8081/admin/logs/filter?${params.toString()}`);
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error("Error filtering logs:", error);
        }
    };

    const handleFilterChange = (name: string, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ userId: "", action: "", fromDate: "", toDate: "" });
        fetchLogs();
    };

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
                
                {/* 4. Pass the props to the Filter component */}
                <AuditFilter 
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onApply={handleApplyFilters}
                    onClear={handleClearFilters}
                /> 

                <AuditTable 
                   ref={tableRef}
                   logs={logs} 
                   // We keep these here as backups, but the Filter component above handles most of it now
                   onFilter={(filteredData) => setLogs(filteredData)} 
                   onReset={handleClearFilters} 
                 />
                <AuditRetention />
            </div>
        </main>
    );
}