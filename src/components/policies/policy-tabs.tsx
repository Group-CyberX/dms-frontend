'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader, Play, Plus, Trash2, Unlock, Eye } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/feedback';
import { useConfirm } from '@/hooks/use-confirm';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';

/** Small helpers shared by every tab. */
async function getJson<T>(path: string, fallback: T): Promise<T> {
  const res = await fetchWithAuth(`${API}${path}`);
  if (!res.ok) return fallback;
  const text = await res.text();
  if (!text.trim()) return fallback;
  return JSON.parse(text) as T;
}

function Panel({ title, description, action, children }: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-gray-500">{children}</p>;
}

function Busy() {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-gray-500">
      <Loader className="mr-2 h-4 w-4 animate-spin text-[#953002]" /> Loading…
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Metadata standards                                                  */
/* ------------------------------------------------------------------ */

type MetadataKey = {
  key: string;
  documentCount: number;
  distinctValues: number;
  sampleValues: string[];
};

export function MetadataTab() {
  const [rows, setRows] = useState<MetadataKey[] | null>(null);

  useEffect(() => {
    getJson<MetadataKey[]>('/policies/metadata-keys', []).then(setRows);
  }, []);

  if (!rows) return <Busy />;

  return (
    <Panel
      title="Metadata standards"
      description="Every metadata field in use across the library, and how widely each is applied."
    >
      {rows.length === 0 ? (
        <Empty>No metadata has been recorded against any document yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-4 font-medium">Field</th>
                <th className="pb-2 pr-4 font-medium">Documents</th>
                <th className="pb-2 pr-4 font-medium">Distinct values</th>
                <th className="pb-2 font-medium">Examples</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-gray-900">{row.key}</td>
                  <td className="py-3 pr-4 tabular-nums text-gray-700">{row.documentCount}</td>
                  <td className="py-3 pr-4 tabular-nums text-gray-700">{row.distinctValues}</td>
                  <td className="py-3 text-gray-500">
                    {row.sampleValues.length === 0
                      ? '—'
                      : row.sampleValues.map((v) => (v.length > 34 ? `${v.slice(0, 34)}…` : v)).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Retention                                                           */
/* ------------------------------------------------------------------ */

type RetentionPolicy = {
  policyId: string;
  name: string;
  scope: 'ALL' | 'TAG';
  matchValue?: string | null;
  retainDays: number;
  action: 'FLAG' | 'ARCHIVE';
  active: boolean;
  lastRunAt?: string | null;
  lastRunAffected?: number | null;
};

export function RetentionTab({ canEdit }: { canEdit: boolean }) {
  const confirm = useConfirm();
  const [policies, setPolicies] = useState<RetentionPolicy[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<{ id: string; titles: string[] } | null>(null);
  const [form, setForm] = useState({
    name: '', scope: 'ALL' as 'ALL' | 'TAG', matchValue: '',
    retainDays: 365, action: 'FLAG' as 'FLAG' | 'ARCHIVE',
  });

  const load = useCallback(() => {
    getJson<RetentionPolicy[]>('/policies/retention', []).then(setPolicies);
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    if (!form.name.trim()) { notify.error('Give the policy a name.'); return; }
    const res = await fetchWithAuth(`${API}/policies/retention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, active: true, matchValue: form.scope === 'TAG' ? form.matchValue : null }),
    });
    if (!res.ok) { notify.error((await res.text()) || 'Could not save the policy'); return; }
    setCreating(false);
    setForm({ name: '', scope: 'ALL', matchValue: '', retainDays: 365, action: 'FLAG' });
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!(await confirm({
      title: `Delete retention policy "${name}"?`,
      description: 'Documents already archived under it are not affected.',
      confirmLabel: 'Delete policy',
      tone: 'destructive',
    }))) return;
    await fetchWithAuth(`${API}/policies/retention/${id}`, { method: 'DELETE' });
    load();
  };

  const showPreview = async (id: string) => {
    const rows = await getJson<{ title: string }[]>(`/policies/retention/${id}/preview`, []);
    setPreview({ id, titles: rows.map((r) => r.title) });
  };

  const run = async (id: string, action: string) => {
    if (action === 'ARCHIVE' && !(await confirm({
      title: 'Archive every due document?',
      description: "All documents past this policy's retention period move to the recycle bin.",
      confirmLabel: 'Archive them',
      tone: 'destructive',
    }))) return;
    const res = await fetchWithAuth(`${API}/policies/retention/${id}/run`, { method: 'POST' });
    if (!res.ok) { notify.error('Could not run the policy'); return; }
    const body = await res.json();
    notify.success(`Policy applied to ${body.affected} document(s).`);
    load();
  };

  if (!policies) return <Busy />;

  return (
    <Panel
      title="Retention policies"
      description="How long documents are kept before they are flagged for review or archived. Active policies run automatically each morning."
      action={canEdit && (
        <Button onClick={() => setCreating((v) => !v)} className="bg-[#953002] hover:bg-[#7a2702]">
          <Plus className="mr-1 h-4 w-4" /> New policy
        </Button>
      )}
    >
      {creating && (
        <div className="mb-5 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Name</span>
            <input className="w-full rounded border border-gray-300 px-2 py-1.5" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Invoices — 7 year retention" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Keep for (days)</span>
            <input type="number" min={1} className="w-full rounded border border-gray-300 px-2 py-1.5"
              value={form.retainDays}
              onChange={(e) => setForm({ ...form, retainDays: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Applies to</span>
            <select className="w-full rounded border border-gray-300 px-2 py-1.5" value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as 'ALL' | 'TAG' })}>
              <option value="ALL">Every document</option>
              <option value="TAG">Documents with a tag</option>
            </select>
          </label>
          {form.scope === 'TAG' ? (
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Tag</span>
              <input className="w-full rounded border border-gray-300 px-2 py-1.5" value={form.matchValue}
                onChange={(e) => setForm({ ...form, matchValue: e.target.value })} placeholder="invoice" />
            </label>
          ) : <div />}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">When due</span>
            <select className="w-full rounded border border-gray-300 px-2 py-1.5" value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value as 'FLAG' | 'ARCHIVE' })}>
              <option value="FLAG">Flag for review only</option>
              <option value="ARCHIVE">Move to recycle bin</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button onClick={create} className="bg-[#953002] hover:bg-[#7a2702]">Save policy</Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {policies.length === 0 ? (
        <Empty>No retention policies yet. Documents are kept indefinitely until one is added.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {policies.map((p) => (
            <div key={p.policyId} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {p.scope === 'ALL' ? 'Every document' : `Documents tagged "${p.matchValue}"`}
                    {' · '}kept {p.retainDays} days
                    {' · '}
                    <span className={p.action === 'ARCHIVE' ? 'text-amber-700' : 'text-gray-500'}>
                      {p.action === 'ARCHIVE' ? 'moves to recycle bin' : 'flags for review'}
                    </span>
                  </p>
                  {p.lastRunAt && (
                    <p className="mt-1 text-xs text-gray-400">
                      Last run {new Date(p.lastRunAt).toLocaleString()} · {p.lastRunAffected ?? 0} document(s)
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => showPreview(p.policyId)}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                  </Button>
                  {canEdit && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => run(p.policyId, p.action)}>
                        <Play className="mr-1 h-3.5 w-3.5" /> Run now
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => remove(p.policyId, p.name)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {preview?.id === p.policyId && (
                <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3 text-xs">
                  <p className="mb-1 font-medium text-gray-700">
                    {preview.titles.length} document(s) currently due
                  </p>
                  {preview.titles.length > 0 && (
                    <p className="text-gray-600">
                      {preview.titles.slice(0, 8).join(', ')}
                      {preview.titles.length > 8 ? ` and ${preview.titles.length - 8} more` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

type Rule = {
  ruleId: string;
  name: string;
  matchPhrase: string;
  applyTag: string;
  active: boolean;
  timesApplied: number;
};

export function ClassificationTab({ canEdit }: { canEdit: boolean }) {
  const confirm = useConfirm();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', matchPhrase: '', applyTag: '' });

  const load = useCallback(() => {
    getJson<Rule[]>('/policies/classification', []).then(setRules);
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    if (!form.name.trim() || !form.matchPhrase.trim() || !form.applyTag.trim()) {
      notify.error('Every field is needed to create a rule.');
      return;
    }
    const res = await fetchWithAuth(`${API}/policies/classification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, active: true }),
    });
    if (!res.ok) { notify.error((await res.text()) || 'Could not save the rule'); return; }
    setCreating(false);
    setForm({ name: '', matchPhrase: '', applyTag: '' });
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!(await confirm({
      title: `Delete classification rule "${name}"?`,
      description: 'Tags it has already applied stay on their documents.',
      confirmLabel: 'Delete rule',
      tone: 'destructive',
    }))) return;
    await fetchWithAuth(`${API}/policies/classification/${id}`, { method: 'DELETE' });
    load();
  };

  const applyAll = async () => {
    const res = await fetchWithAuth(`${API}/policies/classification/apply`, { method: 'POST' });
    if (!res.ok) { notify.error('Could not run the rules'); return; }
    const body = await res.json();
    notify.success(`${body.tagsApplied} tag(s) applied.`);
    load();
  };

  if (!rules) return <Busy />;

  return (
    <Panel
      title="Classification rules"
      description="Documents are tagged automatically when a phrase appears in the title or extracted text."
      action={canEdit && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={applyAll}>
            <Play className="mr-1 h-4 w-4" /> Run on all documents
          </Button>
          <Button onClick={() => setCreating((v) => !v)} className="bg-[#953002] hover:bg-[#7a2702]">
            <Plus className="mr-1 h-4 w-4" /> New rule
          </Button>
        </div>
      )}
    >
      {creating && (
        <div className="mb-5 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Rule name</span>
            <input className="w-full rounded border border-gray-300 px-2 py-1.5" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Purchase orders" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">When it contains</span>
            <input className="w-full rounded border border-gray-300 px-2 py-1.5" value={form.matchPhrase}
              onChange={(e) => setForm({ ...form, matchPhrase: e.target.value })} placeholder="PO-" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Apply tag</span>
            <input className="w-full rounded border border-gray-300 px-2 py-1.5" value={form.applyTag}
              onChange={(e) => setForm({ ...form, applyTag: e.target.value })} placeholder="purchase-order" />
          </label>
          <div className="flex items-end gap-2 sm:col-span-3">
            <Button onClick={create} className="bg-[#953002] hover:bg-[#7a2702]">Save rule</Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <Empty>No classification rules yet. Add one to tag documents as they arrive.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((r) => (
            <div key={r.ruleId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Contains <code className="rounded bg-gray-100 px-1 py-0.5">{r.matchPhrase}</code>
                  {' → tag '}
                  <span className="rounded-full bg-[#953002]/10 px-2 py-0.5 text-[#953002]">{r.applyTag}</span>
                  {' · '}applied {r.timesApplied} time(s)
                </p>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => remove(r.ruleId, r.name)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Locks                                                               */
/* ------------------------------------------------------------------ */

type LockRow = {
  documentId: string;
  title: string;
  lockedByUsername: string;
  lockedAt: string;
  expired: boolean;
};

export function LocksTab({ canEdit }: { canEdit: boolean }) {
  const confirm = useConfirm();
  const [rows, setRows] = useState<LockRow[] | null>(null);

  const load = useCallback(() => {
    getJson<LockRow[]>('/policies/locks', []).then(setRows);
  }, []);
  useEffect(load, [load]);

  const release = async (id: string, title: string) => {
    if (!(await confirm({
      title: `Release the edit lock on "${title}"?`,
      description: 'Whoever is editing it will lose any unsaved work.',
      confirmLabel: 'Release lock',
      tone: 'destructive',
    }))) return;
    const res = await fetchWithAuth(`${API}/policies/locks/${id}/release`, { method: 'POST' });
    if (!res.ok) { notify.error('Could not release the lock'); return; }
    load();
  };

  if (!rows) return <Busy />;

  return (
    <Panel
      title="Document locks"
      description="Documents currently held for editing. A lock older than the timeout is treated as abandoned and can be taken over automatically."
    >
      {rows.length === 0 ? (
        <Empty>No document is locked for editing right now.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.documentId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">{row.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Held by {row.lockedByUsername || 'unknown'} since {new Date(row.lockedAt).toLocaleString()}
                  {row.expired && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">expired</span>
                  )}
                </p>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => release(row.documentId, row.title)}>
                  <Unlock className="mr-1 h-3.5 w-3.5" /> Release
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

type TagRow = { tagId: string; tagName: string; documentCount: number };

export function TagsTab({ canDelete }: { canDelete: boolean }) {
  const confirm = useConfirm();
  const [rows, setRows] = useState<TagRow[] | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    getJson<TagRow[]>('/policies/tags', []).then(setRows);
  }, []);
  useEffect(load, [load]);

  const remove = async (id: string, name: string, count: number) => {
    if (!(await confirm({
      title: `Delete the tag "${name}"?`,
      description: `It will be removed from ${count} document${count === 1 ? '' : 's'}.`,
      confirmLabel: 'Delete tag',
      tone: 'destructive',
    }))) return;
    const res = await fetchWithAuth(`${API}/policies/tags/${id}`, { method: 'DELETE' });
    if (!res.ok) { notify.error('Could not delete the tag'); return; }
    load();
  };

  if (!rows) return <Busy />;

  const visible = rows.filter((r) => r.tagName.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Panel
      title="Tag vocabulary"
      description="Every tag in use and how many documents carry it. Deleting a tag removes it from those documents."
      action={
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter tags…"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
      }
    >
      {visible.length === 0 ? (
        <Empty>{rows.length === 0 ? 'No tags have been created yet.' : 'No tag matches that filter.'}</Empty>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visible.map((tag) => (
            <span key={tag.tagId}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-2 text-sm">
              <span className="font-medium text-gray-800">{tag.tagName}</span>
              <span className="tabular-nums text-xs text-gray-500">{tag.documentCount}</span>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => remove(tag.tagId, tag.tagName, tag.documentCount)}
                  aria-label={`Delete tag ${tag.tagName}`}
                  className="rounded-full p-0.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}
