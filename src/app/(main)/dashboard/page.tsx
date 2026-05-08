"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { formatRoleLabel, getDashboardVariant } from "@/lib/access-control";
import { getUsers } from "@/lib/api-client";
import { CheckCircle2, FileText, Bell, Server, ClipboardCheck, ShieldCheck } from "lucide-react";

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
      </div>
    </div>
  );
}
