"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { formatRoleLabel, getDashboardVariant } from "@/lib/access-control";
import { getDashboardSummary, type DashboardSummary } from "@/lib/api-client";
import { CheckCircle2, FileText, Bell, Server, ClipboardCheck, ShieldCheck, AlertTriangle, Clock, ChevronRight } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  note: string;
  icon: React.ReactNode;
};

function StatCard({ title, value, note, icon }: StatCardProps) {
  return (
    <Card className="border-0 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="mt-1 text-4xl font-semibold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <div className="rounded-xl bg-[#953002]/10 p-3 text-[#953002]">{icon}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const role = useAuthStore((state) => state.role);
  const variant = getDashboardVariant(role);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * One request for the whole screen.
   *
   * This page used to fetch every user, every workflow and every document, then
   * make one more request for each active workflow to read its tasks - so the
   * number of requests grew with the data, and the dashboard took about thirty
   * seconds. The counting and the SLA matching now happen in the database.
   */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await getDashboardSummary();
        if (!cancelled) setSummary(data);
      } catch (err) {
        console.error("Failed to load dashboard summary:", err);
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const slaAlerts = summary?.slaAlerts ?? [];

  // Until the figures arrive, show a dash rather than a zero - "0 documents"
  // and "not loaded yet" are different things and should not look the same.
  const stat = (value: number | undefined) =>
    loading || value === undefined ? "—" : String(value);

  const title = useMemo(() => {
    if (variant === "system-admin") return "System Administrator Dashboard";
    if (variant === "document-admin") return "Document Administrator Dashboard";
    if (variant === "auditor") return "Audit Dashboard";
    if (variant === "process-owner") return "Business Process Dashboard";
    if (variant === "approver") return "Approver Dashboard";
    return "Dashboard";
  }, [variant]);

  const subtitle = `Signed in as ${formatRoleLabel(role)}`;

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#e2e2e2] px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section>
          <h1 className="text-4xl font-semibold tracking-tight text-[#7f2600]">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </section>

        {variant === "system-admin" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total Users" value={stat(summary?.totalUsers)} note="Registered accounts" icon={<ShieldCheck className="h-6 w-6" />} />
              <StatCard title="Documents" value={stat(summary?.totalDocuments)} note="Active, excluding recycle bin" icon={<FileText className="h-6 w-6" />} />
              <StatCard title="ERP Connections" value={stat(summary?.erpConnections)} note="Configured integrations" icon={<CheckCircle2 className="h-6 w-6" />} />
              <StatCard title="Unread Notifications" value={stat(summary?.unreadNotifications)} note="Addressed to you" icon={<Bell className="h-6 w-6" />} />
            </div>

            <Card className="border-0 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button className="bg-[#953002] hover:bg-[#7f2600]" onClick={() => router.push("/user-mgt")}>Manage Users</Button>
                <Button variant="outline" onClick={() => router.push("/erp")}>ERP Integrations</Button>
                <Button variant="outline" onClick={() => router.push("/system-health")}>System Health</Button>
                <Button variant="outline" onClick={() => router.push("/audit")}>Audit Logs</Button>
              </CardContent>
            </Card>
          </>
        )}

        {variant === "document-admin" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total Documents" value={stat(summary?.totalDocuments)} note="Active, excluding recycle bin" icon={<FileText className="h-6 w-6" />} />
              <StatCard title="In Recycle Bin" value={stat(summary?.archivedDocuments)} note="Soft-deleted, recoverable" icon={<CheckCircle2 className="h-6 w-6" />} />
              <StatCard title="Active Workflows" value={stat(summary?.activeWorkflows)} note="Awaiting approval" icon={<ClipboardCheck className="h-6 w-6" />} />
              <StatCard title="Audit Events" value={stat(summary?.auditEvents)} note="Recorded actions" icon={<Bell className="h-6 w-6" />} />
            </div>
            <Card className="border-0 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button className="bg-[#953002] hover:bg-[#7f2600]" onClick={() => router.push("/documents")}>Manage Documents</Button>
                <Button variant="outline" onClick={() => router.push("/recycle-bin")}>Recycle Bin</Button>
                <Button variant="outline" onClick={() => router.push("/audit")}>View Audit Logs</Button>
              </CardContent>
            </Card>
          </>
        )}

        {(variant === "process-owner" || variant === "approver") && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Pending Approvals" value={stat(summary?.pendingApprovals)} note="Waiting on you" icon={<ClipboardCheck className="h-6 w-6" />} />
              <StatCard title="Active Workflows" value={stat(summary?.activeWorkflows)} note="Still in flight" icon={<CheckCircle2 className="h-6 w-6" />} />
              <StatCard title="Completed" value={stat(summary?.completedWorkflows)} note="Fully approved" icon={<FileText className="h-6 w-6" />} />
              <StatCard title="Unread Notifications" value={stat(summary?.unreadNotifications)} note="Addressed to you" icon={<Bell className="h-6 w-6" />} />
            </div>
            <Card className="border-0 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button className="bg-[#953002] hover:bg-[#7f2600]" onClick={() => router.push("/workflows")}>Review Pending Tasks</Button>
                <Button variant="outline" onClick={() => router.push("/workflows")}>Create Workflow</Button>
              </CardContent>
            </Card>
          </>
        )}

        {variant === "auditor" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Audit Events" value={stat(summary?.auditEvents)} note="Recorded actions" icon={<ClipboardCheck className="h-6 w-6" />} />
              <StatCard title="Failed Actions" value={stat(summary?.failedAuditEvents)} note="Logged with status FAILED" icon={<Bell className="h-6 w-6" />} />
              <StatCard title="Completed Reviews" value={stat(summary?.completedWorkflows)} note="Workflows fully approved" icon={<CheckCircle2 className="h-6 w-6" />} />
            </div>
            <Card className="border-0 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button className="bg-[#953002] hover:bg-[#7f2600]" onClick={() => router.push("/audit")}>Open Audit Logs</Button>
                <Button variant="outline" onClick={() => router.push("/search")}>Search Records</Button>
              </CardContent>
            </Card>
          </>
        )}

        {variant === "end-user" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard title="My Documents" value={stat(summary?.myDocuments)} note="Owned by you" icon={<FileText className="h-6 w-6" />} />
              <StatCard title="Submitted Workflows" value={stat(summary?.submittedWorkflows)} note="Raised by you" icon={<ClipboardCheck className="h-6 w-6" />} />
              <StatCard title="Unread Notifications" value={stat(summary?.unreadNotifications)} note="Addressed to you" icon={<Bell className="h-6 w-6" />} />
            </div>
            <Card className="border-0 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button className="bg-[#953002] hover:bg-[#7f2600]" onClick={() => router.push("/documents")}>Upload Document</Button>
                <Button variant="outline" onClick={() => router.push("/documents")}>View Documents</Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* SLA Monitoring Alerts */}
        {!loading && slaAlerts.length > 0 && (
          <Card className="border-0 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] overflow-hidden">
            <CardHeader className="bg-red-50 border-b border-red-100/60 py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-red-800">SLA Monitoring Alerts</CardTitle>
                <p className="text-xs text-red-600/80 mt-0.5">Active approvals that are overdue or close to deadline</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {slaAlerts.map((alert) => (
                <div 
                  key={alert.taskId} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50 transition-colors gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                        alert.overdue 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {alert.overdue ? 'Overdue Approval' : 'Upcoming Deadline'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        • {alert.workflowName}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-base">
                      Document: <span className="text-[#953002]">{alert.documentTitle}</span>
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <p>Assigned by: <span className="font-medium text-slate-800">{alert.assignedBy}</span></p>
                      <p>Due: <span className="font-medium text-slate-800">{new Date(alert.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${alert.overdue ? 'text-red-600' : 'text-amber-600'}`}>
                        {alert.overdue 
                          ? `Overdue by: ${Math.abs(alert.daysRemaining)} days` 
                          : alert.daysRemaining === 0 
                            ? 'Due today' 
                            : `Due in: ${alert.daysRemaining} days`
                        }
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">SLA limit exceeded</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-slate-400 hover:text-[#953002] hover:bg-slate-100"
                      onClick={() => router.push(`/documents/${alert.documentId}?taskId=${alert.taskId}`)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
