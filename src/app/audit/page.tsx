"use client"
import AuditHeader from "@/components/ui/audit/audit-header"
import AuditFilter from "@/components/ui/audit/audit-filters"
import AuditTable from "@/components/ui/audit/audit-table"
import AuditRetention from "@/components/ui/audit/audit-retention"

export default function AuditPage() {
    return (
        <main className="min-h-screen bg-muted/40 flex justify-center">
            <div className="w-full max-w-7xl p-4 md:p-8 lg:p-12">
                <AuditHeader />
                <AuditFilter />
                <AuditTable />
                <AuditRetention />
            </div>
        </main>
    )}