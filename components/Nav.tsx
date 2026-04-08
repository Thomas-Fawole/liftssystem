'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const path = usePathname();

  return (
    <nav style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--black)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>

        {/* Wordmark */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 24, height: 24, background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--white)' }}>
            Lifts Media
          </span>
          <span className="nav-intelligence" style={{ fontSize: 9, color: 'var(--mid-grey)', letterSpacing: '0.15em', textTransform: 'uppercase', marginLeft: 2 }}>
            Intelligence
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <NavLink href="/" label="Dashboard" mobileLabel="Dash" active={path === '/'} />
          <NavLink href="/research" label="New Prospect" mobileLabel="+ New" active={path === '/research'} />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label, mobileLabel, active }: { href: string; label: string; mobileLabel: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? 'var(--accent)' : 'var(--mid-grey)',
        padding: '5px 10px',
        borderRadius: 3,
        background: active ? 'rgba(200,245,53,0.07)' : 'transparent',
        border: active ? '1px solid rgba(200,245,53,0.15)' : '1px solid transparent',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span className="nav-full-label">{label}</span>
      <span className="nav-short-label" style={{ display: 'none' }}>{mobileLabel}</span>
    </Link>
  );
}
