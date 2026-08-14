"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { formatRoleLabel, getDashboardVariant } from "@/lib/access-control";
import { getUsers, fetchWithAuth } from "@/lib/api-client";
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
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [slaAlerts, setSlaAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const users = await getUsers();
        setUserCount(Array.isArray(users) ? users.length : 0);
      } catch (error) {
        console.error("Failed to fetch user count:", error);
        setUserCount(null);
      }
    };

    if (variant === "system-admin") {
      fetchUserCount();
    }
  }, [variant]);

  useEffect(() => {
    const fetchSlaAlerts = async () => {
      try {
        setLoadingAlerts(true);
        const [usersRes, workflowsRes, documentsRes, userMeRes] = await Promise.all([
          fetchWithAuth("http://localhost:8081/api/users"),
          fetchWithAuth("http://localhost:8081/api/workflows"),
          fetchWithAuth("http://localhost:8081/api/documents?all=true"),
          fetchWithAuth("http://localhost:8081/api/users/me")
        ]);

        if (!usersRes.ok || !workflowsRes.ok || !documentsRes.ok || !userMeRes.ok) {
          return;
        }

        const users = await usersRes.json();
        const workflows = await workflowsRes.json();
        const documents = await documentsRes.json();
        const currentUser = await userMeRes.json();

        // Fetch tasks for each active workflow
        const activeWorkflows = Array.isArray(workflows) 
          ? workflows.filter((w: any) => w.status?.toUpperCase() === 'ACTIVE' || w.status?.toUpperCase() === 'PENDING_APPROVAL' || w.status?.toUpperCase() === 'PENDING')
          : [];

        const tasksNested = await Promise.all(
          activeWorkflows.map(async (w: any) => {
            try {
              const res = await fetchWithAuth(`http://localhost:8081/api/tasks/instance/${w.id}`);
              if (res.ok) {
                const data = await res.json();
                return { workflow: w, tasks: Array.isArray(data) ? data : [] };
              }
            } catch (err) {
              console.error(err);
            }
            return { workflow: w, tasks: [] };
          })
        );

        const alertsList: any[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const item of tasksNested) {
          const w = item.workflow;
          if (!w.dueDate) continue;

          const dueDate = new Date(w.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          const timeDiff = dueDate.getTime() - today.getTime();
          const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

          // Trigger SLA alert if due date is within the window of 2 days before to 2 days after (overdue by <= 2 days)
          if (daysDiff >= -2 && daysDiff <= 2) {
            // Find active or pending tasks in this workflow
            const activeTasks = item.tasks.filter((t: any) => t.status?.toUpperCase() === 'ACTIVE' || t.status?.toUpperCase() === 'PENDING');
            
            for (const task of activeTasks) {
              const normalize = (value: string | null | undefined) => String(value ?? '').trim().toUpperCase();
              
              // Only include if assigned to the logged-in user (by user ID or role)
              const isAssignedToMe = currentUser
                ? String(task.userId) === String(currentUser.userId) ||
                  normalize(task.userId) === normalize(currentUser.role)
                : true;

              if (!isAssignedToMe) continue;

              // Find document
              const docId = w.documentId ?? w.document_id ?? '';
              const doc = documents.find((d: any) => String(d.document_id ?? d.id ?? '') === String(docId));
              const docTitle = doc?.title ?? doc?.name ?? doc?.documentName ?? doc?.filename ?? 'Untitled Document';

              // Find assigned by (who assigned the task)
              const creatorId = w.createdByUserId || w.created_by_user_id;
              let assignedBy = 'Unknown';
              if (creatorId === 'TEMP_USER') {
                assignedBy = 'TEMP_USER';
              } else if (creatorId) {
                const creator = users.find((u: any) => String(u.userId) === String(creatorId));
                assignedBy = creator ? `${creator.username} (${creator.role})` : creatorId;
              }

              alertsList.push({
                taskId: task.id,
                documentId: docId,
                documentTitle: docTitle,
                assignedBy,
                dueDate: w.dueDate,
                daysDiff,
                isOverdue: daysDiff < 0,
                workflowName: w.workflowName,
                priority: w.priority
              });
            }
          }
        }

        setSlaAlerts(alertsList);
      } catch (err) {
        console.error("Failed to load SLA alerts:", err);
      } finally {
        setLoadingAlerts(false);
      }
    };

    fetchSlaAlerts();
  }, [variant]);

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
              <StatCard title="Total Users" value={userCount === null ? "null" : String(userCount)} note="Live from API" icon={<ShieldCheck className="h-6 w-6" />} />
              <StatCard title="System Health" value="0" note="Placeholder" icon={<Server className="h-6 w-6" />} />
              <StatCard title="ERP Connections" value="0" note="Placeholder" icon={<CheckCircle2 className="h-6 w-6" />} />
              <StatCard title="Notifications" value="0" note="Placeholder" icon={<Bell className="h-6 w-6" />} />
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
              <StatCard title="Total Documents" value="0" note="Placeholder" icon={<FileText className="h-6 w-6" />} />
              <StatCard title="Policy Violations" value="0" note="Placeholder" icon={<Bell className="h-6 w-6" />} />
              <StatCard title="Retention Review" value="0" note="Placeholder" icon={<ClipboardCheck className="h-6 w-6" />} />
              <StatCard title="Archived Docs" value="0" note="Placeholder" icon={<CheckCircle2 className="h-6 w-6" />} />
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
              <StatCard title="Pending Approvals" value="0" note="Placeholder" icon={<ClipboardCheck className="h-6 w-6" />} />
              <StatCard title="Active Workflows" value="0" note="Placeholder" icon={<CheckCircle2 className="h-6 w-6" />} />
              <StatCard title="Under Review" value="0" note="Placeholder" icon={<FileText className="h-6 w-6" />} />
              <StatCard title="Notifications" value="0" note="Placeholder" icon={<Bell className="h-6 w-6" />} />
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
              <StatCard title="Audit Events" value="0" note="Placeholder" icon={<ClipboardCheck className="h-6 w-6" />} />
              <StatCard title="Flagged Items" value="0" note="Placeholder" icon={<Bell className="h-6 w-6" />} />
              <StatCard title="Completed Reviews" value="0" note="Placeholder" icon={<CheckCircle2 className="h-6 w-6" />} />
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
              <StatCard title="My Documents" value="0" note="Placeholder" icon={<FileText className="h-6 w-6" />} />
              <StatCard title="Submitted Workflows" value="0" note="Placeholder" icon={<ClipboardCheck className="h-6 w-6" />} />
              <StatCard title="Notifications" value="0" note="Placeholder" icon={<Bell className="h-6 w-6" />} />
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
        {!loadingAlerts && slaAlerts.length > 0 && (
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
                        alert.isOverdue 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {alert.isOverdue ? 'Overdue Approval' : 'Upcoming Deadline'}
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
                      <p className={`text-sm font-bold ${alert.isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                        {alert.isOverdue 
                          ? `Overdue by: ${Math.abs(alert.daysDiff)} days` 
                          : alert.daysDiff === 0 
                            ? 'Due today' 
                            : `Due in: ${alert.daysDiff} days`
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
