import React from 'react';
import { useAppStore } from '../../store/appStore';

export default function UpdateBanner() {
  const { updateAvailable, dismissUpdate } = useAppStore();
  if (!updateAvailable) return null;

  const openRelease = () => {
    window.open(updateAvailable.url, '_blank', 'noopener');
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 'var(--sp-4)',
      right: 'var(--sp-4)',
      zIndex: 300,
      maxWidth: 380,
      background: 'var(--bg-raised)',
      border: '1px solid var(--accent)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-lg), var(--shadow-accent)',
      padding: 'var(--sp-4)',
      animation: 'slideInRight 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--r-md)',
          background: 'var(--accent-dim)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            Update available — v{updateAvailable.version}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 'var(--sp-3)' }}>
            A new version of Discord Agent is available. Download it from GitHub to get the latest features and fixes.
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button className="btn btn-primary btn-sm" onClick={openRelease}>
              Download v{updateAvailable.version}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={dismissUpdate}>
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
