import React from 'react';
import { VERSION } from '../../store/appStore';

const TECH_STACK = [
  { name: 'React 18',        role: 'UI framework',          url: 'https://react.dev' },
  { name: 'Vite 5',          role: 'Build tool & dev server', url: 'https://vitejs.dev' },
  { name: 'Zustand',         role: 'State management',      url: 'https://zustand-demo.pmnd.rs' },
  { name: 'Chrome/Edge App', role: 'Native-like window',    url: 'https://developer.chrome.com/docs/apps' },
  { name: 'Inter',           role: 'UI typography',         url: 'https://rsms.me/inter' },
  { name: 'JetBrains Mono',  role: 'Monospace font',        url: 'https://www.jetbrains.com/legalnotices/monospace' },
  { name: 'Discord API',     role: 'Messaging integration', url: 'https://discord.com/developers/docs' },
  { name: 'Anthropic API',   role: 'Claude AI',             url: 'https://docs.anthropic.com' },
  { name: 'OpenAI API',      role: 'ChatGPT / GPT-4',       url: 'https://platform.openai.com' },
  { name: 'Ollama',          role: 'Local model runtime',   url: 'https://ollama.com' },
];

const LICENSES = [
  { name: 'React',    license: 'MIT',  url: 'https://github.com/facebook/react/blob/main/LICENSE' },
  { name: 'Vite',     license: 'MIT',  url: 'https://github.com/vitejs/vite/blob/main/LICENSE' },
  { name: 'Zustand',  license: 'MIT',  url: 'https://github.com/pmndrs/zustand/blob/main/LICENSE' },
];

const LogoMark = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <path d="M8 28L18 8L28 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 21h12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const IconExternalLink = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

export default function CreditsTab() {
  const openLink = (url) => window.open(url, '_blank', 'noopener');

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div className="page-container">

        {/* Hero */}
        <div className="credits-hero">
          <div className="credits-logo">
            <LogoMark />
          </div>
          <div>
            <div className="credits-app-name">Discord Agent</div>
            <div className="credits-version">Version {VERSION}</div>
            <div style={{ marginTop: 'var(--sp-2)', fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.6 }}>
              An AI-powered application for intelligently managing Discord direct message conversations.
            </div>
          </div>
        </div>

        {/* Technology stack */}
        <div className="settings-section">
          <div className="settings-section-title">Technology Stack</div>
          <div className="tech-stack-grid">
            {TECH_STACK.map((tech) => (
              <div key={tech.name} className="tech-card" style={{ cursor: 'pointer' }} onClick={() => openLink(tech.url)}>
                <div className="tech-card-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {tech.name} <IconExternalLink />
                </div>
                <div className="tech-card-role">{tech.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture */}
        <div className="settings-section">
          <div className="settings-section-title">Architecture</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {[
              { layer: 'UI Layer',       desc: 'React 18 — component rendering, hooks, reactive state' },
              { layer: 'State',          desc: 'Zustand — lightweight global store, zero boilerplate' },
              { layer: 'Dev Server',     desc: 'Vite 5 — instant HMR, sub-second startup, ESM-native' },
              { layer: 'App Window',     desc: 'Chrome/Edge --app mode — frameless native-looking window, no Electron' },
              { layer: 'AI Abstraction', desc: 'Provider-agnostic service layer — 6+ AI providers, single interface' },
              { layer: 'Discord Layer',  desc: 'REST + WebSocket gateway for real-time message handling' },
              { layer: 'Memory System',  desc: 'Per-conversation local notes that augment AI context over time' },
            ].map(({ layer, desc }) => (
              <div key={layer} style={{
                display: 'flex', gap: 'var(--sp-4)', padding: 'var(--sp-3) var(--sp-4)',
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-md)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', width: 130, flexShrink: 0 }}>{layer}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Licenses */}
        <div className="settings-section">
          <div className="settings-section-title">Open Source Licenses</div>
          {LICENSES.map((item) => (
            <div key={item.name} className="license-item">
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.license} License</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => openLink(item.url)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
                View <IconExternalLink />
              </button>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{
          padding: 'var(--sp-4)', background: 'var(--warning-dim)',
          border: '1px solid rgba(253,203,110,0.2)', borderRadius: 'var(--r-lg)',
          marginBottom: 'var(--sp-5)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 'var(--sp-2)' }}>Disclaimer</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Using a Discord user token may violate Discord's Terms of Service. Users are solely responsible
            for their own compliance. This software is provided for educational and personal use only.
          </div>
        </div>

        {/* Author + Links */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-4)', background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-lg)',
          marginBottom: 'var(--sp-3)', cursor: 'pointer',
        }} onClick={() => openLink('https://github.com/DeathToNatsuki')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Made by DeathToNatsuki</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>github.com/DeathToNatsuki</div>
          </div>
          <IconExternalLink />
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-2)', paddingBottom: 'var(--sp-10)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => openLink('https://github.com/DeathToNatsuki/Discord-Agent')}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            GitHub Repository <IconExternalLink />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => openLink('https://github.com/DeathToNatsuki/Discord-Agent/issues')}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Report an Issue <IconExternalLink />
          </button>
        </div>

      </div>
    </div>
  );
}
