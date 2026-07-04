import { useState } from 'react';
import './Header.css';

const NAV_LINKS = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

/* Simple cornerstone mark used as the placeholder logo */
function LogoIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="26" height="26" rx="7" fill="var(--text)" />
      <path
        d="M10 18.5 17 11l7 7.5v7H10v-7Z"
        fill="var(--panel)"
      />
      <path d="M10 25h14" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <a href="#top" className="brand" onClick={closeMenu}>
          <LogoIcon />
          <span className="brand-name">Cornerstone Home Solutions</span>
        </a>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <span className={`menu-bar ${menuOpen ? 'open' : ''}`} aria-hidden="true" />
        </button>

        <nav
          id="primary-navigation"
          className={`nav ${menuOpen ? 'nav-open' : ''}`}
          aria-label="Primary"
        >
          <ul className="nav-list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="nav-link" onClick={closeMenu}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#address-form" className="btn-primary header-cta" onClick={closeMenu}>
            Get Your Offer
          </a>
        </nav>
      </div>
    </header>
  );
}
