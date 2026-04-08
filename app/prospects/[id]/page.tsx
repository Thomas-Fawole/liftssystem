'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';

interface Contact {
  name?: string;
  role?: string;
  email?: string;
  linkedin?: string;
  phone?: string;
  source?: string;
}

interface Message {
  id: number;
  prospect_id: number;
  channel: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: 'sent' | 'failed';
  error: string | null;
  sent_at: string;
}

interface Prospect {
  id: number;
  company: string;
  industry: string;
  website: string | null;
  notes: string | null;
  channel: string;
  tone: string;
  lead_score: number;
  pain_points: string;
  outreach_message: string;
  status: 'New' | 'Contacted' | 'Replied' | 'Closed';
  date_added: string;
  contacts: string;
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

const STATUSES = ['New', 'Contacted', 'Replied', 'Closed'];

export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');

  // Send form state
  const [sendChannel, setSendChannel] = useState<'email' | 'sms'>('email');
  const [sendTo, setSendTo] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [markContacted, setMarkContacted] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchProspect = async () => {
    const r = await fetch(`/api/prospects/${id}`);
    if (r.status === 404) { setNotFound(true); setLoading(false); return; }
    const d = await r.json();
    if (d.prospect) {
      setProspect(d.prospect);
      setSendBody(d.prospect.outreach_message || '');
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    const r = await fetch(`/api/messages?prospectId=${id}`);
    const d = await r.json();
    setMessages(d.messages || []);
  };

  useEffect(() => {
    fetchProspect();
    fetchMessages();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!prospect) return;
    setUpdating(true);
    const res = await fetch(`/api/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setProspect(data.prospect);
    setUpdating(false);
  };

  const scrapeContacts = async () => {
    if (!prospect) return;
    setScraping(true);
    setScrapeMsg('');
    try {
      const res = await fetch('/api/scrape-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: prospect.id, website: prospect.website, company: prospect.company }),
      });
      const data = await res.json();
      if (data.message) setScrapeMsg(data.message);
      else if (data.contacts?.length === 0) setScrapeMsg('No contacts found on this website.');
      else setScrapeMsg('');
      await fetchProspect();
    } catch {
      setScrapeMsg('Failed to scrape. Check the website URL.');
    } finally {
      setScraping(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospect || !sendTo || !sendBody) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: prospect.id,
          channel: sendChannel,
          recipient: sendTo,
          subject: sendChannel === 'email' ? sendSubject : undefined,
          message: sendBody,
          markAsContacted: markContacted,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ ok: true, msg: `${sendChannel === 'email' ? 'Email' : 'SMS'} sent to ${sendTo}` });
        await fetchMessages();
        if (markContacted) await fetchProspect();
      } else {
        setSendResult({ ok: false, msg: data.error || 'Send failed' });
      }
    } catch {
      setSendResult({ ok: false, msg: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  const prefillFromContact = (c: Contact) => {
    if (sendChannel === 'email' && c.email) setSendTo(c.email);
    if (sendChannel === 'sms' && c.phone) setSendTo(c.phone);
  };

  const copyMessage = () => {
    if (!prospect) return;
    navigator.clipboard.writeText(prospect.outreach_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEmail = (email: string) => navigator.clipboard.writeText(email);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>
      <Nav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border-light)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  );

  if (notFound || !prospect) return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>
      <Nav />
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 48, fontFamily: 'Cormorant Garamond, serif', color: 'var(--white)', marginBottom: 16 }}>404</p>
        <p style={{ color: 'var(--mid-grey)', marginBottom: 24 }}>Prospect not found.</p>
        <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>← Back to Dashboard</Link>
      </div>
    </div>
  );

  const painPoints: string[] = JSON.parse(prospect.pain_points || '[]');
  const contacts: Contact[] = JSON.parse(prospect.contacts || '[]');
  const st = STATUS_STYLES[prospect.status];

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(20,20,18,0.8)',
    border: '1px solid var(--border-light)',
    borderRadius: 4,
    padding: '9px 12px',
    color: 'var(--white)',
    fontSize: 12,
    fontFamily: 'DM Mono, monospace',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>
      <Nav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Back */}
        <div style={{ paddingTop: 32, paddingBottom: 32 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--mid-grey)', cursor: 'pointer', fontSize: 11, letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace', padding: 0 }}>
            ← Back
          </button>
        </div>

        {/* Hero */}
        <div className="animate-fade-up" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 8 }}>{prospect.industry}</p>
              <h1 style={{ fontSize: 52, color: 'var(--white)', marginBottom: 10 }}>{prospect.company}</h1>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {prospect.website && (
                  <a href={prospect.website} target="_blank" rel="noreferrer" style={{ color: 'var(--mid-grey)', fontSize: 11, textDecoration: 'none' }}>{prospect.website} ↗</a>
                )}
                <span style={{ color: 'var(--mid-grey)', fontSize: 11 }}>Added {prospect.date_added}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 3, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                  {prospect.status}
                </span>
                {messages.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--mid-grey)' }}>· {messages.filter(m => m.status === 'sent').length} message{messages.filter(m => m.status === 'sent').length !== 1 ? 's' : ''} sent</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 4 }}>Lead Score</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 68, fontWeight: 300, letterSpacing: '-0.05em', color: scoreColor(prospect.lead_score), lineHeight: 1 }}>
                {prospect.lead_score}<span style={{ fontSize: 22, color: 'var(--mid-grey)', marginLeft: 2 }}>/100</span>
              </p>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-light)', marginBottom: 28 }} />

        {/* Pain Points + Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="animate-fade-up delay-1" style={{ border: '1px solid var(--border-light)', borderRadius: 6, padding: '22px 24px', background: 'rgba(15,15,13,0.6)' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 16 }}>Identified Pain Points</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {painPoints.map((pt, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, fontSize: 12, color: 'var(--white)', lineHeight: 1.55 }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>—</span>{pt}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up delay-2" style={{ border: '1px solid var(--border-light)', borderRadius: 6, padding: '22px 24px', background: 'rgba(15,15,13,0.6)' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 16 }}>Prospect Details</p>
            {[['Channel', prospect.channel], ['Tone', prospect.tone], ['Industry', prospect.industry], ['Added', prospect.date_added]].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, color: 'var(--mid-grey)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: 12, color: 'var(--white)', textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
            {prospect.notes && (
              <div style={{ marginTop: 4 }}>
                <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 6 }}>Notes</p>
                <p style={{ fontSize: 11, color: 'var(--white)', lineHeight: 1.6 }}>{prospect.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Finder */}
        <div className="animate-fade-up delay-3" style={{ border: '1px solid var(--border-light)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(20,20,18,0.95)', borderBottom: contacts.length > 0 ? '1px solid var(--border-light)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>Contact Finder</span>
              {contacts.length > 0 && (
                <span style={{ fontSize: 9, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 10, background: 'rgba(200,245,53,0.1)', color: 'var(--accent)', border: '1px solid rgba(200,245,53,0.2)' }}>
                  {contacts.length} found
                </span>
              )}
            </div>
            <button
              onClick={scrapeContacts}
              disabled={scraping || !prospect.website}
              style={{ background: scraping ? 'transparent' : 'var(--accent)', color: scraping ? 'var(--mid-grey)' : 'var(--black)', border: scraping ? '1px solid var(--border-light)' : 'none', borderRadius: 3, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', cursor: scraping || !prospect.website ? 'not-allowed' : 'pointer', fontFamily: 'DM Mono, monospace', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, opacity: !prospect.website ? 0.4 : 1, transition: 'all 0.15s ease' }}
            >
              {scraping ? <><span style={{ width: 12, height: 12, border: '1.5px solid var(--border-light)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Scraping...</> : contacts.length > 0 ? 'Re-scrape' : 'Find Contacts'}
            </button>
          </div>

          {!prospect.website && <div style={{ padding: '16px 20px' }}><p style={{ fontSize: 11, color: 'var(--mid-grey)' }}>Add a website URL to enable contact scraping.</p></div>}
          {scrapeMsg && <div style={{ padding: '14px 20px', borderBottom: contacts.length > 0 ? '1px solid var(--border)' : 'none' }}><p style={{ fontSize: 11, color: 'var(--mid-grey)' }}>{scrapeMsg}</p></div>}

          {contacts.length > 0 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 2fr 1fr', padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(20,20,18,0.5)' }}>
                {['Name / Role', 'Source', 'Email', 'Actions'].map(h => (
                  <span key={h} style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>{h}</span>
                ))}
              </div>
              {contacts.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 2fr 1fr', padding: '11px 20px', borderBottom: i < contacts.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    {c.name ? <span style={{ fontSize: 12, color: 'var(--white)', display: 'block' }}>{c.name}</span> : <span style={{ fontSize: 11, color: 'var(--mid-grey)', fontStyle: 'italic' }}>Unknown</span>}
                    {c.role && <span style={{ fontSize: 10, color: 'var(--mid-grey)' }}>{c.role}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--mid-grey)', textTransform: 'capitalize' }}>{c.source || '—'}</span>
                  <div>
                    {c.email ? <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>{c.email}</span> : <span style={{ fontSize: 10, color: 'var(--mid-grey)' }}>—</span>}
                    {c.phone && <span style={{ fontSize: 10, color: 'var(--mid-grey)', display: 'block', marginTop: 2 }}>{c.phone}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.email && (
                      <>
                        <button onClick={() => copyEmail(c.email!)} style={{ fontSize: 9, padding: '3px 8px', border: '1px solid var(--border-light)', borderRadius: 3, background: 'transparent', color: 'var(--mid-grey)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Copy</button>
                        <button
                          onClick={() => { setSendChannel('email'); setSendTo(c.email!); document.getElementById('send-panel')?.scrollIntoView({ behavior: 'smooth' }); }}
                          style={{ fontSize: 9, padding: '3px 8px', border: '1px solid rgba(200,245,53,0.3)', borderRadius: 3, background: 'rgba(200,245,53,0.06)', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
                        >
                          Send
                        </button>
                      </>
                    )}
                    {c.phone && (
                      <button
                        onClick={() => { setSendChannel('sms'); setSendTo(c.phone!); document.getElementById('send-panel')?.scrollIntoView({ behavior: 'smooth' }); }}
                        style={{ fontSize: 9, padding: '3px 8px', border: '1px solid rgba(96,212,245,0.3)', borderRadius: 3, background: 'rgba(96,212,245,0.06)', color: '#60d4f5', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
                      >
                        SMS
                      </button>
                    )}
                    {c.linkedin && (
                      <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 9, padding: '3px 8px', border: '1px solid var(--border-light)', borderRadius: 3, color: 'var(--mid-grey)', textDecoration: 'none', fontFamily: 'DM Mono, monospace' }}>LI ↗</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Send Outreach Panel ── */}
        <div id="send-panel" className="animate-fade-up delay-4" style={{ border: '1px solid var(--border-light)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(20,20,18,0.95)', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>Send Outreach</span>
            {/* Channel toggle */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['email', 'sms'] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => { setSendChannel(ch); setSendTo(''); setSendResult(null); }}
                  style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 3, border: '1px solid', fontFamily: 'DM Mono, monospace', cursor: 'pointer', transition: 'all 0.12s ease', ...(sendChannel === ch ? { background: 'var(--accent)', color: 'var(--black)', borderColor: 'var(--accent)' } : { background: 'transparent', color: 'var(--mid-grey)', borderColor: 'var(--border-light)' }) }}
                >
                  {ch === 'email' ? '✉ Email' : '✆ SMS'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={sendMessage} style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: sendChannel === 'email' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
              {/* To */}
              <div>
                <label style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mid-grey)', display: 'block', marginBottom: 6 }}>
                  {sendChannel === 'email' ? 'To (email address)' : 'To (phone number)'}
                </label>
                <input
                  type={sendChannel === 'email' ? 'email' : 'tel'}
                  placeholder={sendChannel === 'email' ? 'contact@company.com' : '+447700900000'}
                  value={sendTo}
                  onChange={e => setSendTo(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
                />
                {/* Quick-fill from contacts */}
                {contacts.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {contacts.filter(c => sendChannel === 'email' ? c.email : c.phone).map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => prefillFromContact(c)}
                        style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--border-light)', borderRadius: 10, background: 'transparent', color: 'var(--mid-grey)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
                      >
                        {c.name || (sendChannel === 'email' ? c.email : c.phone)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject — email only */}
              {sendChannel === 'email' && (
                <div>
                  <label style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mid-grey)', display: 'block', marginBottom: 6 }}>Subject</label>
                  <input
                    type="text"
                    placeholder="Introduction from Lifts Media"
                    value={sendSubject}
                    onChange={e => setSendSubject(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
                  />
                </div>
              )}
            </div>

            {/* Message body */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>
                  Message{sendChannel === 'sms' ? ` (${sendBody.length} chars)` : ''}
                </label>
                <button
                  type="button"
                  onClick={() => setSendBody(prospect.outreach_message)}
                  style={{ fontSize: 9, letterSpacing: '0.08em', padding: '2px 8px', border: '1px solid var(--border-light)', borderRadius: 3, background: 'transparent', color: 'var(--mid-grey)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
                >
                  Reset to AI message
                </button>
              </div>
              <textarea
                value={sendBody}
                onChange={e => setSendBody(e.target.value)}
                required
                rows={sendChannel === 'sms' ? 4 : 8}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
              />
            </div>

            {/* Options + Submit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: 'var(--mid-grey)' }}>
                <input
                  type="checkbox"
                  checked={markContacted}
                  onChange={e => setMarkContacted(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                />
                Mark prospect as Contacted after send
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {sendResult && (
                  <span style={{ fontSize: 11, color: sendResult.ok ? 'var(--accent)' : '#ff6b4a' }}>
                    {sendResult.ok ? '✓ ' : '✗ '}{sendResult.msg}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={sending || !sendTo || !sendBody}
                  style={{ background: sending || !sendTo || !sendBody ? 'var(--border-light)' : 'var(--accent)', color: sending || !sendTo || !sendBody ? 'var(--mid-grey)' : 'var(--black)', border: 'none', borderRadius: 4, padding: '10px 24px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', cursor: sending || !sendTo || !sendBody ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s ease' }}
                >
                  {sending ? (
                    <><span style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--black)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Sending...</>
                  ) : `Send ${sendChannel === 'email' ? 'Email' : 'SMS'} →`}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Message History */}
        {messages.length > 0 && (
          <div className="animate-fade-up delay-5" style={{ border: '1px solid var(--border-light)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', background: 'rgba(20,20,18,0.95)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>Message History</span>
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,245,240,0.06)', color: 'var(--mid-grey)', border: '1px solid rgba(245,245,240,0.1)' }}>{messages.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 90px 1.8fr 80px 100px', padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(20,20,18,0.5)' }}>
              {['Channel', 'Status', 'Recipient', 'Type', 'Sent At'].map(h => (
                <span key={h} style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>{h}</span>
              ))}
            </div>
            {messages.map((m, i) => (
              <div
                key={m.id}
                style={{ display: 'grid', gridTemplateColumns: '80px 90px 1.8fr 80px 100px', padding: '11px 20px', borderBottom: i < messages.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 11, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.channel}</span>
                <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, width: 'fit-content', ...(m.status === 'sent' ? { color: 'var(--accent)', background: 'rgba(200,245,53,0.07)', border: '1px solid rgba(200,245,53,0.2)' } : { color: '#ff6b4a', background: 'rgba(255,107,74,0.07)', border: '1px solid rgba(255,107,74,0.2)' }) }}>
                  {m.status}
                </span>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--white)', display: 'block' }}>{m.recipient}</span>
                  {m.subject && <span style={{ fontSize: 10, color: 'var(--mid-grey)' }}>{m.subject}</span>}
                  {m.error && <span style={{ fontSize: 10, color: '#ff6b4a' }}>{m.error}</span>}
                </div>
                <span style={{ fontSize: 10, color: 'var(--mid-grey)', textTransform: 'capitalize' }}>{m.channel}</span>
                <span style={{ fontSize: 10, color: 'var(--mid-grey)' }}>{new Date(m.sent_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Status Editor */}
        <div style={{ border: '1px solid var(--border-light)', borderRadius: 6, padding: '20px 24px', marginBottom: 16, background: 'rgba(15,15,13,0.6)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)', flexShrink: 0 }}>Update Status</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {STATUSES.map(s => {
              const ss = STATUS_STYLES[s];
              const isActive = prospect.status === s;
              return (
                <button key={s} onClick={() => updateStatus(s)} disabled={updating || isActive} style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: `1px solid ${isActive ? ss.border : 'var(--border-light)'}`, cursor: isActive || updating ? 'default' : 'pointer', fontFamily: 'DM Mono, monospace', color: isActive ? ss.color : 'var(--mid-grey)', background: isActive ? ss.bg : 'transparent', opacity: updating ? 0.6 : 1, transition: 'all 0.15s ease' }}>
                  {s}{isActive && ' ✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Outreach Message */}
        <div style={{ border: '1px solid var(--border-light)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(20,20,18,0.95)', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>
              AI Outreach Message — {prospect.channel} · {prospect.tone}
            </span>
            <button onClick={copyMessage} style={{ background: copied ? 'rgba(200,245,53,0.1)' : 'transparent', border: `1px solid ${copied ? 'rgba(200,245,53,0.3)' : 'var(--border-light)'}`, borderRadius: 3, color: copied ? 'var(--accent)' : 'var(--mid-grey)', fontSize: 10, letterSpacing: '0.08em', padding: '5px 14px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', transition: 'all 0.15s ease' }}>
              {copied ? '✓ Copied' : 'Copy Message'}
            </button>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--white)', whiteSpace: 'pre-wrap' }}>{prospect.outreach_message}</p>
          </div>
        </div>

      </main>
    </div>
  );
}
