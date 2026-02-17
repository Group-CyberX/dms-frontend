"use client"
import AuditHeader from "@/components/ui/audit/audit-header"
import AuditFilter from "@/components/ui/audit/audit-filters"
import AuditTable from "@/components/ui/audit/audit-table"
import AuditRetention from "@/components/ui/audit/audit-retention"

export default function AuditPage() {
    return (
        <main className="min-h-screen bg-muted/40">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <AuditHeader />
                <AuditFilter />
                <AuditTable />
                <AuditRetention />
            </div>
        </main>
    )}