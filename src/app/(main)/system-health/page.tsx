"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSystemHealth, type SystemHealth } from "@/lib/api-client";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

/**
 * Every figure on this page is a live reading taken when it was fetched -
 * a real database round trip, a real S3 reachability check, real counts from
 * the database - rather than a simulated uptime percentage. Where no real
 * source exists yet (there is no backup job in this system), the card says
 * so plainly instead of showing a plausible-looking timestamp.
 */
export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getSystemHealth();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load system health");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <p className="text-sm text-slate-500">Checking system health…</p>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold text-[#953002]">System Health</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Could not load system health."}
        </div>
        <Button variant="outline" size="sm" onClick={() => load()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const dbConnPercent = health.dbConnectionsMax > 0
    ? Math.round((health.dbConnectionsActive / health.dbConnectionsMax) * 100)
    : 0;

  const metrics: { label: string; value: string; ok: boolean; threshold: string }[] = [
    {
      label: "API Response Time",
      value: `${health.apiResponseTimeMs}ms`,
      ok: health.apiResponseTimeMs < 500,
      threshold: "< 500ms (database round trip)",
    },
    {
      label: "Document Processing Queue",
      value: `${health.documentQueueDepth} item${health.documentQueueDepth === 1 ? "" : "s"}`,
      ok: health.documentQueueDepth < 50,
      threshold: "< 50 pending or in progress",
    },
    {
      label: "ERP Sync Status",
      value: health.erpSyncStatus,
      ok: health.erpSyncStatus === "Connected" || health.erpSyncStatus === "Not configured",
      threshold: "Connected",
    },
    {
      label: "Storage Used",
      value: formatBytes(health.storageUsedBytes),
      ok: true,
      threshold: "Total across active documents",
    },
    {
      label: "Database Connections",
      value: `${health.dbConnectionsActive}/${health.dbConnectionsMax}`,
      ok: dbConnPercent < 80,
      threshold: "< 80% of pool",
    },
    {
      label: "OCR Processing",
      value: health.ocrAvailable ? "Available" : "Not installed",
      ok: health.ocrAvailable,
      threshold: "Tesseract language data present",
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#953002]">System Health</h1>
          <p className="text-slate-500 text-sm">
            Live checks against the database, storage and this server — not simulated data
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">System Status</p>
              <p className={`text-lg font-bold ${health.healthy ? "text-green-600" : "text-red-600"}`}>
                {health.healthy ? "Healthy" : "Degraded"}
              </p>
            </div>
            {health.healthy
              ? <CheckCircle2 className="h-8 w-8 text-green-500" />
              : <AlertTriangle className="h-8 w-8 text-red-500" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Process Uptime</p>
              <p className="text-lg font-bold text-slate-800">{health.uptime}</p>
            </div>
            <Server className="h-8 w-8 text-[#953002]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Active Users</p>
              <p className="text-lg font-bold text-slate-800">{health.activeUsers}</p>
              <p className="text-[10px] text-slate-400">holding a live session</p>
            </div>
            <Database className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Last Backup</p>
              <p className="text-lg font-bold text-slate-500">{health.lastBackup}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-slate-300" />
          </CardContent>
        </Card>
      </div>

      {/* Health metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-700">Health Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">{m.label}</span>
                  {m.ok
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="text-xl font-bold text-slate-900">{m.value}</p>
                <p className="text-xs text-slate-400 mt-1">{m.threshold}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-700">Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {health.services.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${s.healthy ? "bg-green-500" : "bg-red-500"}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.detail}</p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    s.healthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {s.healthy ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {s.healthy ? "Reachable" : "Unreachable"}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">{s.latencyMs}ms</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5" />
        Checked {new Date(health.checkedAt).toLocaleString()}
      </p>
    </div>
  );
}
