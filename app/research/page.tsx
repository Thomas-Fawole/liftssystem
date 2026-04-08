'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';

const INDUSTRIES = [
  'E-commerce', 'SaaS / Tech', 'Fashion & Apparel', 'Food & Beverage',
  'Health & Wellness', 'Financial Services', 'Real Estate', 'Media & Entertainment',
  'Hospitality & Travel', 'Professional Services', 'Education', 'Non-Profit', 'Other',
];
const CHANNELS = ['Email', 'LinkedIn', 'Instagram DM', 'Twitter/X', 'Cold Call'];
const TONES = ['Professional', 'Conversational', 'Bold & Direct', 'Warm & Friendly', 'Consultative'];

interface FormData {
  company: string;
  industry: string;
  website: string;
  notes: string;
  channel: string;
  tone: string;
}

interface Analysis {
  lead_score: number;
  pain_points: string[];
  outreach_message: string;
}

function scoreColor(s: number) {
  if (s >= 75) return 'var(--accent)';
  if (s >= 50) return '#f5c842';
  return '#ff6b4a';
}

export default function ResearchPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    company: '', industry: '', website: '', notes: '', channel: '', tone: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: Analysis; id: number } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const valid = form.company && form.industry && form.channel && form.tone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setResult({ analysis: data.analysis, id: data.prospect.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.analysis.outreach_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(20,20,18,0.8)',
    border: '1px solid var(--border-light)',
    borderRadius: 4,
    padding: '11px 14px',
    color: 'var(--white)',
    fontSize: 13,
    fontFamily: 'DM Mono, monospace',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  const labelStyle = {
    fontSize: 9,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: 'var(--mid-grey)',
    display: 'block',
    marginBottom: 7,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>
      <Nav />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Header */}
        <div className="animate-fade-up" style={{ paddingTop: 48, paddingBottom: 40 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 10 }}>
            Prospect Research
          </p>
          <h1 style={{ fontSize: 52, color: 'var(--white)', marginBottom: 10 }}>
            Analyse a New Lead
          </h1>
          <p style={{ color: 'var(--mid-grey)', fontSize: 13, maxWidth: 520 }}>
            Fill in what you know. Our AI will score the lead, surface key pain points, and generate a personalised outreach message.
          </p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="animate-fade-up delay-1">
            {/* Two-column grid for most fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Company */}
              <div>
                <label style={labelStyle}>Company Name *</label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={form.company}
                  onChange={set('company')}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
                />
              </div>

              {/* Industry */}
              <div>
                <label style={labelStyle}>Industry *</label>
                <select
                  value={form.industry}
                  onChange={set('industry')}
                  required
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {/* Website */}
              <div>
                <label style={labelStyle}>Website URL</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={set('website')}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
                />
              </div>

              {/* Channel */}
              <div>
                <label style={labelStyle}>Outreach Channel *</label>
                <select
                  value={form.channel}
                  onChange={set('channel')}
                  required
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
                >
                  <option value="">Select channel...</option>
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Tone */}
              <div>
                <label style={labelStyle}>Message Tone *</label>
                <select
                  value={form.tone}
                  onChange={set('tone')}
                  required
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
                >
                  <option value="">Select tone...</option>
                  {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Notes — full width */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Additional Notes</label>
              <textarea
                placeholder="Any context: recent funding, product launches, known challenges, mutual connections..."
                value={form.notes}
                onChange={set('notes')}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,107,74,0.08)',
                border: '1px solid rgba(255,107,74,0.25)',
                borderRadius: 4,
                padding: '12px 16px',
                color: '#ff6b4a',
                fontSize: 12,
                marginBottom: 20,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!valid || loading}
              style={{
                background: valid && !loading ? 'var(--accent)' : 'var(--border-light)',
                color: valid && !loading ? 'var(--black)' : 'var(--mid-grey)',
                border: 'none',
                borderRadius: 4,
                padding: '13px 32px',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: 'DM Mono, monospace',
                cursor: valid && !loading ? 'pointer' : 'not-allowed',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: 14, height: 14,
                    border: '2px solid rgba(0,0,0,0.2)',
                    borderTopColor: 'var(--black)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Analysing with Claude...
                </>
              ) : (
                'Analyse Prospect →'
              )}
            </button>
          </form>

        ) : (
          /* Result */
          <div>
            {/* Score hero */}
            <div
              className="animate-fade-up"
              style={{
                border: '1px solid var(--border-light)',
                borderRadius: 6,
                padding: '32px 36px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 32,
                background: 'rgba(15,15,13,0.8)',
              }}
            >
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 6 }}>
                  Lead Score
                </p>
                <p style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: 72,
                  fontWeight: 300,
                  letterSpacing: '-0.05em',
                  color: scoreColor(result.analysis.lead_score),
                  lineHeight: 1,
                }}>
                  {result.analysis.lead_score}
                  <span style={{ fontSize: 24, color: 'var(--mid-grey)' }}>/100</span>
                </p>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: 32, flex: 1 }}>
                <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)', marginBottom: 12 }}>
                  Identified Pain Points
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {result.analysis.pain_points.map((pt, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, fontSize: 12, color: 'var(--white)' }}>
                      <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}>—</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Outreach Message */}
            <div
              className="animate-fade-up delay-1"
              style={{
                border: '1px solid var(--border-light)',
                borderRadius: 6,
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'rgba(20,20,18,0.95)',
                borderBottom: '1px solid var(--border-light)',
              }}>
                <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-grey)' }}>
                  Outreach Message — {form.channel} · {form.tone}
                </span>
                <button
                  onClick={copyMessage}
                  style={{
                    background: copied ? 'rgba(200,245,53,0.1)' : 'transparent',
                    border: `1px solid ${copied ? 'rgba(200,245,53,0.3)' : 'var(--border-light)'}`,
                    borderRadius: 3,
                    color: copied ? 'var(--accent)' : 'var(--mid-grey)',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontFamily: 'DM Mono, monospace',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ padding: '22px 24px' }}>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--white)', whiteSpace: 'pre-wrap' }}>
                  {result.analysis.outreach_message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="animate-fade-up delay-2" style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => router.push(`/prospects/${result.id}`)}
                style={{
                  background: 'var(--accent)',
                  color: 'var(--black)',
                  border: 'none',
                  borderRadius: 4,
                  padding: '11px 24px',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer',
                }}
              >
                View Full Prospect →
              </button>
              <button
                onClick={() => { setResult(null); setForm({ company: '', industry: '', website: '', notes: '', channel: '', tone: '' }); }}
                style={{
                  background: 'transparent',
                  color: 'var(--mid-grey)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 4,
                  padding: '11px 24px',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer',
                }}
              >
                Research Another
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  background: 'transparent',
                  color: 'var(--mid-grey)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 4,
                  padding: '11px 24px',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer',
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
