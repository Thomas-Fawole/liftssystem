'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

type Status = 'All' | 'New' | 'Contacted' | 'Replied' | 'Closed';
type SortKey = 'lead_score' | 'date_added' | 'company';
type SortDir = 'asc' | 'desc';

interface Prospect {
  id: number;
  company: string;
  industry: string;
  website: string | null;
  channel: string;
  tone: string;
  lead_score: number;
  pain_points: string;
  outreach_message: string;
  status: 'New' | 'Contacted' | 'Replied' | 'Closed';
  date_added: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  New:       { color: 'var(--white)',    bg: 'rgba(245,245,240,0.06)', border: 'rgba(245,245,240,0.12)' },
  Contacted: { color: 'var(--accent)',   bg: 'rgba(200,245,53,0.07)',  border: 'rgba(200,245,53,0.2)'  },
  Replied:   { color: '#60d4f5',         bg: 'rgba(96,212,245,0.07)',  border: 'rgba(96,212,245,0.2)'  },
  Closed:    { color: 'var(--mid-grey)', bg: 'rgba(122,122,117,0.07)', border: 'rgba(122,122,117,0.2)' },
};

function scoreColor(s: number) {
  if (s >= 75) return 'var(--accent)';
  if (s >= 50) return '#f5c842';
  return '#ff6b4a';
}

export default function DashboardPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status>('All');
  const [sortKey, setSortKey] = useState<SortKey>('lead_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const fetchProspects = async () => {
    try {
      const res = await fetch('/api/prospects');
      const data = await res.json();
      setProspects(data.prospects || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProspects(); }, []);

  const stats = useMemo(() => {
    const total = prospects.length;
    const avgScore = total ? Math.round(prospects.reduce((a, p) => a + p.lead_score, 0) / total) : 0;
    const contacted = prospects.filter(p => p.status !== 'New').length;
    const replied = prospects.filter(p => p.status === 'Replied').length;
    const replyRate = contacted ? Math.round((replied / contacted) * 100) : 0;
    return { total, avgScore, contacted, replyRate };
  }, [prospects]);

  const filtered = useMemo(() => {
    let list = [...prospects];
    if (statusFilter !== 'All') list = list.filter(p => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.company.toLowerCase().includes(q) || p.industry.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const av = sortKey === 'lead_score' ? a.lead_score : (a[sortKey] ?? '');
      const bv = sortKey === 'lead_score' ? b.lead_score : (b[sortKey] ?? '');
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [prospects, statusFilter, sortDir, sortKey, search]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const emptyState = (
    <div style={{ padding: '64px 20px', textAlign: 'center' }}>
      <p style={{ color: 'var(--mid-grey)', marginBottom: 20, fontSize: 13 }}>
        {prospects.length === 0 ? 'No prospects yet. Start by researching your first lead.' : 'No prospects match your current filters.'}
      </p>
      {prospects.length === 0 && (
        <Link href="/research" style={{ display: 'inline-block', background: 'var(--accent)', color: 'var(--black)', padding: '10px 22px', borderRadius: 4, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'DM Mono, monospace' }}>
          Research First Prospect →
        </Link>
      )}
    </div>
  );

  const loadingState = (
    <div style={{ padding: '52px 20px', textAlign: 'center', color: 'var(--mid-grey)' }}>
      <div style={{ width: 22, height: 22, border: '2px solid var(--border-light)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
      Loading prospects...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>
      <Nav />
      <main className="page-main" style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div className="animate-fade-up page-header-pt">
          <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 10 }}>Lead Intelligence</p>
          <h1 className="hero-h1" style={{ color: 'var(--white)', marginBottom: 8 }}>Prospect Dashboard</h1>
          <p style={{ color: 'var(--mid-grey)', fontSize: 12 }}>{prospects.length} prospect{prospects.length !== 1 ? 's' : ''} in the system</p>
        </div>

        {/* Stats Bar */}
        <div className="animate-fade-up delay-1 stats-grid" style={{ background: 'var(--border-light)', border: '1px solid var(--border-light)', borderRadius: 6, overflow: 'hidden', marginBottom: 28 }}>
          {[
            { label: 'Total Prospects', value: stats.total, suffix: '', accent: false },
            { label: 'Avg Lead Score',  value: stats.avgScore, suffix: '/100', accent: true },
            { label: 'Contacted',       value: stats.contacted, suffix: '', accent: false },
            { label: 'Reply Rate',      value: stats.replyRate, suffix: '%', accent: false },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--black)', padding: '20px 20px' }}>
              <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 8 }}>{s.label}</p>
              <p className="stats-value" style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, letterSpacing: '-0.04em', color: s.accent ? scoreColor(s.value) : 'var(--white)', lineHeight: 1 }}>
                {loading ? '—' : s.value}
                {!loading && s.suffix && <span style={{ fontSize: 16, color: 'var(--mid-grey)', marginLeft: 2 }}>{s.suffix}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="animate-fade-up delay-2 controls-row" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search company or industry..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="controls-search"
            style={{ background: 'var(--border)', border: '1px solid var(--border-light)', borderRadius: 4, padding: '8px 14px', color: 'var(--white)', fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', width: 240 }}
          />

          {/* Status filter — scrollable on mobile */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
            {(['All', 'New', 'Contacted', 'Replied', 'Closed'] as Status[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 3, border: '1px solid', cursor: 'pointer', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap', transition: 'all 0.12s ease', ...(statusFilter === s ? { background: 'var(--accent)', color: 'var(--black)', borderColor: 'var(--accent)' } : { background: 'transparent', color: 'var(--mid-grey)', borderColor: 'var(--border-light)' }) }}>
                {s}
              </button>
            ))}
          </div>

          <div className="controls-sort" style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--mid-grey)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sort:</span>
            {([['lead_score', 'Score'], ['date_added', 'Date'], ['company', 'Name']] as [SortKey, string][]).map(([key, label]) => (
              <button key={key} onClick={() => toggleSort(key)} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 3, border: '1px solid', cursor: 'pointer', fontFamily: 'DM Mono, monospace', transition: 'all 0.12s ease', ...(sortKey === key ? { background: 'rgba(245,245,240,0.08)', color: 'var(--white)', borderColor: 'var(--border-light)' } : { background: 'transparent', color: 'var(--mid-grey)', borderColor: 'transparent' }) }}>
                {label}{sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
              </button>
            ))}
          </div>
        </div>

        {/* ── Desktop Table ── */}
        <div className="animate-fade-up delay-3 prospect-table" style={{ border: '1px solid var(--border-light)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 70px 110px 100px 100px 120px', background: 'rgba(20,20,18,0.95)', borderBottom: '1px solid var(--border-light)', padding: '10px 20px' }}>
            {['Company', 'Industry', 'Score', 'Channel', 'Status', 'Added', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>{h}</span>
            ))}
          </div>
          {loading ? loadingState : filtered.length === 0 ? emptyState : filtered.map((p, idx) => <ProspectRow key={p.id} prospect={p} idx={idx} onUpdate={fetchProspects} />)}
        </div>

        {/* ── Mobile Cards ── */}
        <div className="animate-fade-up delay-3 prospect-cards">
          <div style={{ border: '1px solid var(--border-light)', borderRadius: 6, overflow: 'hidden' }}>
            {loading ? loadingState : filtered.length === 0 ? emptyState : filtered.map((p, idx) => (
              <ProspectCard key={p.id} prospect={p} idx={idx} onUpdate={fetchProspects} />
            ))}
          </div>
        </div>

        {filtered.length > 0 && (
          <p style={{ fontSize: 10, color: 'var(--mid-grey)', marginTop: 10 }}>
            Showing {filtered.length} of {prospects.length} prospects
          </p>
        )}
      </main>
    </div>
  );
}

function ProspectRow({ prospect: p, idx, onUpdate }: { prospect: Prospect; idx: number; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const st = STATUS_STYLES[p.status];

  const updateStatus = async (status: string) => {
    setUpdating(true);
    await fetch(`/api/prospects/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    await onUpdate();
    setUpdating(false);
  };

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 70px 110px 100px 100px 120px', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s ease' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Link href={`/prospects/${p.id}`} style={{ color: 'var(--white)', textDecoration: 'none', fontSize: 13 }}>{p.company}</Link>
      <span style={{ color: 'var(--mid-grey)', fontSize: 11 }}>{p.industry}</span>
      <span style={{ color: scoreColor(p.lead_score), fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 500 }}>{p.lead_score}</span>
      <span style={{ color: 'var(--mid-grey)', fontSize: 11, textTransform: 'capitalize' }}>{p.channel}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3, color: st.color, background: st.bg, border: `1px solid ${st.border}`, width: 'fit-content' }}>{p.status}</span>
      <span style={{ color: 'var(--mid-grey)', fontSize: 11 }}>{p.date_added}</span>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
        <select value={p.status} onChange={e => updateStatus(e.target.value)} disabled={updating} style={{ background: 'var(--border)', border: '1px solid var(--border-light)', borderRadius: 3, color: 'var(--mid-grey)', fontSize: 9, padding: '4px 6px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', outline: 'none', opacity: updating ? 0.5 : 1 }}>
          <option>New</option><option>Contacted</option><option>Replied</option><option>Closed</option>
        </select>
        <Link href={`/prospects/${p.id}`} style={{ fontSize: 10, color: 'var(--mid-grey)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border-light)', borderRadius: 3 }}>View →</Link>
      </div>
    </div>
  );
}

function ProspectCard({ prospect: p, onUpdate }: { prospect: Prospect; idx: number; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const st = STATUS_STYLES[p.status];

  const updateStatus = async (status: string) => {
    setUpdating(true);
    await fetch(`/api/prospects/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    await onUpdate();
    setUpdating(false);
  };

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'transparent' }}>
      {/* Top row: company + score */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <Link href={`/prospects/${p.id}`} style={{ color: 'var(--white)', textDecoration: 'none', fontSize: 15, fontFamily: 'Cormorant Garamond, serif', letterSpacing: '-0.02em', display: 'block', marginBottom: 2 }}>
            {p.company}
          </Link>
          <span style={{ color: 'var(--mid-grey)', fontSize: 11 }}>{p.industry}</span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 300, color: scoreColor(p.lead_score), lineHeight: 1 }}>{p.lead_score}</span>
          <span style={{ fontSize: 11, color: 'var(--mid-grey)' }}>/100</span>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{p.status}</span>
        <span style={{ color: 'var(--mid-grey)', fontSize: 10, textTransform: 'capitalize' }}>{p.channel}</span>
        <span style={{ color: 'var(--mid-grey)', fontSize: 10 }}>{p.date_added}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={p.status} onChange={e => updateStatus(e.target.value)} disabled={updating} style={{ flex: 1, background: 'var(--border)', border: '1px solid var(--border-light)', borderRadius: 4, color: 'var(--mid-grey)', fontSize: 11, padding: '7px 10px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', outline: 'none', opacity: updating ? 0.5 : 1 }}>
          <option>New</option><option>Contacted</option><option>Replied</option><option>Closed</option>
        </select>
        <Link href={`/prospects/${p.id}`} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', padding: '7px 16px', border: '1px solid rgba(200,245,53,0.25)', borderRadius: 4, whiteSpace: 'nowrap', background: 'rgba(200,245,53,0.05)' }}>
          View →
        </Link>
      </div>
    </div>
  );
}
