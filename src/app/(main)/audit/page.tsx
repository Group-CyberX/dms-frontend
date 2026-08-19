"use client"

import React, { useEffect, useRef, useState, useCallback } from "react";
import AuditHeader from "@/components/ui/audit/audit-header";
import AuditFilter from "@/components/ui/audit/audit-filters";
import AuditTable, { type AuditTableRef } from "@/components/ui/audit/audit-table";
import AuditRetention from "@/components/ui/audit/audit-retention";
import PaginationBar from "@/components/ui/pagination-bar";
import { auditService, type AuditFilters } from "@/lib/auditService";
import { notify } from "@/lib/feedback";

const NO_FILTERS: AuditFilters = {};

export default function AuditPage() {
    const tableRef = useRef<AuditTableRef>(null);

    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Paging state lives here because it is part of the query, not the table.
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [filters, setFilters] = useState<AuditFilters>(NO_FILTERS);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await auditService.getLogs(page, pageSize, filters);
            setLogs(result.logs);
            setTotalPages(result.totalPages);
            setTotalElements(result.totalElements);
        } catch (err: any) {
            console.error("Failed to load audit logs:", err);
            setError(err?.message ?? "Failed to load audit logs");
            setLogs([]);
            setTotalPages(0);
            setTotalElements(0);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, filters]);

    // Any change of page, page size or filter is a new query to the server.
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // A new filter always returns to the first page - staying on page 5 of a
    // result set that now has two pages would show nothing.
    const handleFilter = (next: AuditFilters) => {
        setPage(0);
        setFilters(next);
    };

    const handleReset = () => {
        setPage(0);
        setFilters(NO_FILTERS);
    };

    // Exports cover every row matching the current filters, not just the page
    // on screen.
    const handleExport = async (kind: "csv" | "pdf") => {
        try {
            const all = await auditService.getAllForExport(filters);
            if (kind === "csv") tableRef.current?.exportToCSV(all);
            else tableRef.current?.exportToPDF?.(all);
        } catch (err) {
            console.error("Export failed:", err);
            notify.error("Could not export the audit log. Try again in a moment.");
        }
    };

    return (
        <main className="min-h-screen bg-muted/40 flex justify-center ">
            <div className="w-full max-w-7xl p-4 md:p-8 lg:p-12 space-y-4">
                <AuditHeader
                    onExportCSV={() => handleExport("csv")}
                    onExportPDF={() => handleExport("pdf")}
                />

                <AuditFilter
                    onFilter={handleFilter}
                    onReset={handleReset}
                />

                {isLoading ? (
                    <div className="w-full py-20 text-center border rounded-lg bg-white">
                        <p className="text-muted-foreground animate-pulse">Loading audit records...</p>
                    </div>
                ) : error ? (
                    <div className="w-full py-20 text-center border rounded-lg bg-white">
                        <p className="text-red-600">{error}</p>
                    </div>
                ) : (
                    <div className="rounded-lg border bg-white overflow-hidden">
                        <AuditTable
                            ref={tableRef}
                            logs={logs}
                        />
                        <PaginationBar
                            page={page}
                            totalPages={totalPages}
                            totalElements={totalElements}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => { setPage(0); setPageSize(size); }}
                            label="audit records"
                        />
                    </div>
                )}

                <AuditRetention />
            </div>
        </main>
    );
}
