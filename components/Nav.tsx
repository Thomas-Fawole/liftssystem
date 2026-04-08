'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const path = usePathname();

  return (
    <nav
      style={{
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--black)',
      }}
      className="sticky top-0 z-50"
    >
      <div
        style={{ maxWidth: 1400 }}
        className="mx-auto px-6 flex items-center justify-between h-14"
      >
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-3 group no-underline">
          <div
            style={{
              width: 28,
              height: 28,
              background: 'var(--accent)',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 18,
              fontWeight: 300,
              letterSpacing: '-0.04em',
              color: 'var(--white)',
            }}
          >
            Lifts Media
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'var(--mid-grey)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginLeft: 4,
              paddingTop: 1,
            }}
          >
            Intelligence
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          <NavLink href="/" label="Dashboard" active={path === '/'} />
          <NavLink href="/research" label="New Prospect" active={path === '/research'} />
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? 'var(--accent)' : 'var(--mid-grey)',
        padding: '6px 14px',
        borderRadius: 3,
        background: active ? 'rgba(200,245,53,0.07)' : 'transparent',
        border: active ? '1px solid rgba(200,245,53,0.15)' : '1px solid transparent',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </Link>
  );
}
