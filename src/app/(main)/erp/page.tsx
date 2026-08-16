'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertCircle, CheckCircle2, Link2, Loader2, Plus, RefreshCw, Trash2, X, XCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { hasPermission } from '@/lib/access-control';
import {
  getErpConnections, createErpConnection, deleteErpConnection, testErpConnection,
  syncErpConnection, getErpMappings, getErpTransactions, retryErpTransaction, getErpStats,
  getErpConnectionCounts,
  type ErpConnection, type ErpMapping, type ErpTransaction,
} from '@/lib/api-client';

/**
 * ERP Integration console.
 *
 * Three things live here: which ERP systems we talk to, how their field names
 * map onto ours, and what the last syncs did. Together these cover the
 * "universal connector" and "integration errors are logged and recoverable"
 * parts of the requirements.
 */
export default function ErpIntegrationPage() {
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.permissions);

  const canConfigure = hasPermission(permissions, role, 'canConfigureERPIntegration');
  const canSync = hasPermission(permissions, role, 'canSyncERPIntegration');
  const canDelete = hasPermission(permissions, role, 'canDeleteERPIntegration');

  const [connections, setConnections] = useState<ErpConnection[]>([]);
  const [transactions, setTransactions] = useState<ErpTransaction[]>([]);
  const [stats, setStats] = useState<{
    connections: number; transactions: number; failed: number;
    successfulToday: number; failedToday: number;
  } | null>(null);
  // Per-connection record and document counts, keyed by connection id.
  const [counts, setCounts] = useState<Record<string, { transactions: number; linkedDocuments: number }>>({});
  const [mappings, setMappings] = useState<ErpMapping[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({
    name: '',
    erpType: 'GENERIC',
    // Points at the bundled mock ERP by default - swap for a real base URL and
    // nothing else changes.
    apiEndpoint: 'http://localhost:8081/mock-erp',
    authType: 'API_KEY',
    apiKey: '',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [conns, txPage, s] = await Promise.all([
        getErpConnections(),
        getErpTransactions(0, 25),
        getErpStats(),
      ]);
      setConnections(conns);
      setTransactions(txPage.content ?? []);
      setStats(s);
      if (conns.length > 0 && !selectedConnection) {
        setSelectedConnection(conns[0].connectionId);
      }

      // Row counters, fetched alongside the table. There are as many requests
      // as there are connections - a handful at most - and each one is a pair
      // of database counts rather than a list being measured in the browser.
      const rowCounts = await Promise.all(
        conns.map(async (c) => {
          try {
            return [c.connectionId, await getErpConnectionCounts(c.connectionId)] as const;
          } catch {
            return [c.connectionId, { transactions: 0, linkedDocuments: 0 }] as const;
          }
        })
      );
      setCounts(Object.fromEntries(rowCounts));
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Could not load ERP data' });
    } finally {
      setLoading(false);
    }
  }, [selectedConnection]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedConnection) return;
    getErpMappings(selectedConnection).then(setMappings).catch(() => setMappings([]));
  }, [selectedConnection]);

  const handleTest = async (id: string) => {
    setBusyId(id); setBanner(null);
    try {
      const result = await testErpConnection(id);
      setBanner({ kind: result.success ? 'ok' : 'error', text: result.message });
      await load();
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Test failed' });
    } finally { setBusyId(null); }
  };

  const handleSync = async (id: string) => {
    setBusyId(id); setBanner(null);
    try {
      const result = await syncErpConnection(id);
      setBanner({ kind: result.success ? 'ok' : 'error', text: result.message });
      await load();
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Sync failed' });
    } finally { setBusyId(null); }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.apiEndpoint.trim()) {
      setBanner({ kind: 'error', text: 'Name and API endpoint are required' });
      return;
    }
    try {
      setBusyId('new');
      await createErpConnection(form);
      setShowAdd(false);
      setForm({ ...form, name: '', apiKey: '' });
      setBanner({ kind: 'ok', text: 'Connection created with default field mappings.' });
      await load();
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Could not create the connection' });
    } finally { setBusyId(null); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete the connection "${name}" and its field mappings?`)) return;
    try {
      await deleteErpConnection(id);
      if (selectedConnection === id) setSelectedConnection(null);
      await load();
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Could not delete' });
    }
  };

  const statusPill = (status: string) => {
    const map: Record<string, string> = {
      OK: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      UNKNOWN: 'bg-slate-100 text-slate-600',
    };
    return map[status] ?? map.UNKNOWN;
  };

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-bold text-gray-900">ERP Integration</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Connect the DMS to your ERP systems, map their fields, and link documents to transactions.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">

        {banner && (
          <div className={`flex items-start gap-2.5 rounded-lg border p-3.5 text-sm ${
            banner.kind === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'}`}>
            {banner.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                  : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{banner.text}</span>
            <button onClick={() => setBanner(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total connections', value: stats?.connections ?? 0 },
            { label: 'Synced records', value: stats?.transactions ?? 0 },
            { label: 'Successful today', value: stats?.successfulToday ?? 0 },
            { label: 'Failed today', value: stats?.failedToday ?? 0, danger: (stats?.failedToday ?? 0) > 0 },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{card.label}</p>
              <p className={`mt-1 text-2xl font-bold ${card.danger ? 'text-red-600' : 'text-gray-900'}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Connections */}
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-gray-800">ERP Connections</h2>
            {canConfigure && (
              <Button onClick={() => setShowAdd((v) => !v)} size="sm"
                      className="bg-[#8B2E00] hover:bg-[#722600] text-white gap-1.5">
                <Plus className="h-4 w-4" /> Add Connection
              </Button>
            )}
          </div>

          {showAdd && canConfigure && (
            <div className="grid grid-cols-1 gap-3 border-b border-gray-100 bg-slate-50/60 p-5 sm:grid-cols-2">
              <label className="text-xs font-medium text-gray-600">
                Name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                       placeholder="SAP S/4HANA - Production"
                       className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-600">
                ERP type
                <select value={form.erpType} onChange={(e) => setForm({ ...form, erpType: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {['GENERIC', 'SAP', 'ORACLE', 'DYNAMICS', 'INFOR', 'EPICOR'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600 sm:col-span-2">
                API endpoint
                <input value={form.apiEndpoint} onChange={(e) => setForm({ ...form, apiEndpoint: e.target.value })}
                       className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm" />
                <span className="mt-1 block text-[11px] font-normal text-gray-400">
                  Defaults to the bundled mock ERP. Point it at a real system and nothing else changes.
                </span>
              </label>
              <label className="text-xs font-medium text-gray-600">
                Auth type
                <select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {['API_KEY', 'BASIC', 'NONE'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600">
                API key <span className="font-normal text-gray-400">(encrypted at rest)</span>
                <input type="password" value={form.apiKey}
                       onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                       className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <Button onClick={handleCreate} disabled={busyId === 'new'}
                        className="bg-[#8B2E00] hover:bg-[#722600] text-white">
                  {busyId === 'new' ? 'Saving...' : 'Save connection'}
                </Button>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : connections.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              No ERP connections yet.{canConfigure && ' Add one to get started.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Name</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Endpoint</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Last sync</th>
                    <th className="px-3 py-2.5 font-medium">Linked docs</th>
                    <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((c) => (
                    <tr key={c.connectionId}
                        onClick={() => setSelectedConnection(c.connectionId)}
                        className={`cursor-pointer border-b border-gray-50 hover:bg-slate-50 ${
                          selectedConnection === c.connectionId ? 'bg-[#8B2E00]/5' : ''}`}>
                      <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-3 py-3 text-gray-600">{c.erpType}</td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-500">{c.apiEndpoint}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPill(c.status)}`}>
                          {c.status}
                        </span>
                        {c.lastErrorMessage && (
                          <p className="mt-1 max-w-[220px] truncate text-[11px] text-red-500"
                             title={c.lastErrorMessage}>{c.lastErrorMessage}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {/* Documents that were matched to records from this
                            connection - the number that shows the integration
                            is actually doing something. */}
                        <span className="font-semibold">{counts[c.connectionId]?.linkedDocuments ?? 0}</span>
                        <span className="ml-1 text-xs text-gray-400">
                          / {counts[c.connectionId]?.transactions ?? 0} records
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {canConfigure && (
                            <button onClick={(e) => { e.stopPropagation(); handleTest(c.connectionId); }}
                                    disabled={busyId === c.connectionId}
                                    className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-40">
                              {busyId === c.connectionId ? '…' : 'Test'}
                            </button>
                          )}
                          {canSync && (
                            <button onClick={(e) => { e.stopPropagation(); handleSync(c.connectionId); }}
                                    disabled={busyId === c.connectionId}
                                    className="flex items-center gap-1 rounded bg-[#8B2E00] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#722600] disabled:opacity-40">
                              <RefreshCw className="h-3 w-3" /> Sync
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c.connectionId, c.name); }}
                                    className="rounded p-1 text-red-500 hover:bg-red-50" aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Field mapping */}
        {selectedConnection && (
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <h2 className="text-sm font-bold text-gray-800">Field Mapping</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                How this ERP names its fields, and what the DMS stores them as. Supporting another ERP
                is rows in this table — not code.
              </p>
            </div>
            {mappings.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No mappings for this connection.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Record type</th>
                      <th className="px-3 py-2.5 font-medium">ERP field</th>
                      <th className="px-3 py-2.5 font-medium">DMS field</th>
                      <th className="px-5 py-2.5 font-medium">Reference key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.mappingId} className="border-b border-gray-50">
                        <td className="px-5 py-2.5 text-xs text-gray-500">{m.entityType}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-800">{m.erpField}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-[#8B2E00]">{m.dmsField}</td>
                        <td className="px-5 py-2.5">
                          {m.isReferenceKey && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              MATCH KEY
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Sync history */}
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-gray-800">Sync History</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Nothing synced yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Reference</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Synced</th>
                    <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.transactionId} className="border-b border-gray-50">
                      <td className="px-5 py-2.5 font-mono text-xs font-semibold text-gray-900">{t.externalRef}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{t.transactionType}</td>
                      <td className="px-3 py-2.5">
                        <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          t.syncStatus === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.syncStatus === 'SUCCESS' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {t.syncStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">
                        {t.syncedAt ? new Date(t.syncedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {t.syncStatus === 'FAILED' && canSync && (
                          <button
                            onClick={async () => { await retryErpTransaction(t.transactionId); await load(); }}
                            className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium hover:bg-gray-50">
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="flex items-center gap-1.5 pb-4 text-xs text-gray-400">
          <Link2 className="h-3 w-3" />
          Documents are linked to transactions automatically when OCR finds a matching reference in the file.
        </p>
      </div>
    </div>
  );
}
