import React, { useState } from 'react';
import { useAppStore, DEFAULT_PRESETS, VERSION } from '../../store/appStore';

const IconSun = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="settings-row">
      <div className="settings-row-info">
        <div className="settings-row-label">{label}</div>
        {desc && <div className="settings-row-desc">{desc}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className="toggle-track" /><div className="toggle-thumb" />
      </label>
    </div>
  );
}

function PresetEditor({ preset, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(preset);
  return (
    <div className="settings-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--sp-2)' }}>
      <div className="settings-row" style={{ cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
        <div className="settings-row-info">
          <div className="settings-row-label">{preset.label}</div>
          <div className="settings-row-desc" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {preset.system.slice(0, 60)}{preset.system.length > 60 ? '...' : ''}
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDelete(); }}>Delete</button>
      </div>
      {expanded && (
        <div style={{ padding: 'var(--sp-4)', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="input" value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">System prompt</label>
            <textarea className="input" rows={4} value={draft.system} onChange={e => setDraft(d => ({ ...d, system: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { onUpdate(draft); setExpanded(false); }}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setExpanded(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsTab() {
  const {
    theme, setTheme,
    settings, updateSettings,
    customPresets, addCustomPreset, updateCustomPreset, deleteCustomPreset,
    discordConnected, discordToken, discordUser,
    updateAvailable,
  } = useAppStore();

  const [addingPreset, setAddingPreset] = useState(false);
  const [newPreset, setNewPreset] = useState({ label: '', system: '' });

  const handleAddPreset = () => {
    if (!newPreset.label.trim()) return;
    addCustomPreset(newPreset);
    setNewPreset({ label: '', system: '' });
    setAddingPreset(false);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title">Settings</div>
          <div className="page-subtitle">v{VERSION} — Configure Discord Agent.</div>
        </div>

        {/* Update banner in settings */}
        {updateAvailable && (
          <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-4)', marginBottom: 'var(--sp-6)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 2 }}>
                Update available — v{updateAvailable.version}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>A newer version is available on GitHub.</div>
            </div>
            <button className="btn btn-primary btn-sm"
              onClick={() => window.open(updateAvailable.url, '_blank', 'noopener')}>
              Download
            </button>
          </div>
        )}

        {/* ── Appearance ── */}
        <div className="settings-section">
          <div className="settings-section-title">Appearance</div>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Theme</div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                {[{ id: 'dark', label: 'Dark', icon: IconMoon }, { id: 'light', label: 'Light', icon: IconSun }].map(({ id, label, icon: Icon }) => (
                  <button key={id} className={`btn btn-sm ${theme === id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTheme(id)}>
                    <Icon /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Message Behavior ── */}
        <div className="settings-section">
          <div className="settings-section-title">Message Behavior</div>
          <div className="settings-card">
            <ToggleRow
              label="Message send delay"
              desc="Wait a random amount of time before sending, to feel more human."
              checked={settings.messageDelayEnabled}
              onChange={v => updateSettings({ messageDelayEnabled: v })}
            />
            {settings.messageDelayEnabled && (
              <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
                <div className="settings-row-info" style={{ marginRight: 0 }}>
                  <div className="settings-row-label">Delay range</div>
                  <div className="settings-row-desc">
                    Replies are sent after a random delay between min and max seconds.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>Min (seconds)</div>
                    <input type="number" className="input" min={0} max={60}
                      value={settings.messageDelayMin}
                      onChange={e => updateSettings({ messageDelayMin: Number(e.target.value) })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>Max (seconds)</div>
                    <input type="number" className="input" min={0} max={120}
                      value={settings.messageDelayMax}
                      onChange={e => updateSettings({ messageDelayMax: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
            )}
            <ToggleRow
              label="Show typing indicator"
              desc="Displays the typing indicator in Discord while the delay is counting down. Requires message delay to be enabled."
              checked={settings.typingIndicatorEnabled}
              onChange={v => updateSettings({ typingIndicatorEnabled: v })}
            />
          </div>
        </div>

        {/* ── Friend Requests ── */}
        <div className="settings-section">
          <div className="settings-section-title">Friend Requests</div>
          <div className="settings-card">
            <ToggleRow
              label="Auto-accept friend requests"
              desc="Automatically accept incoming friend requests and send a greeting message."
              checked={settings.autoAcceptFriendRequests}
              onChange={v => updateSettings({ autoAcceptFriendRequests: v })}
            />
            {settings.autoAcceptFriendRequests && (
              <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <div className="settings-row-label">Greeting message</div>
                <textarea className="input" rows={2}
                  placeholder="Hey! Thanks for adding me. What can I help you with?"
                  value={settings.friendRequestGreeting}
                  onChange={e => updateSettings({ friendRequestGreeting: e.target.value })}
                  style={{ width: '100%' }} />
                <div className="form-hint">Sent automatically when a friend request is accepted.</div>
              </div>
            )}
          </div>
        </div>

        {/* ── AI Settings ── */}
        <div className="settings-section">
          <div className="settings-section-title">AI Settings</div>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Context window limit</div>
                <div className="settings-row-desc">Max tokens of history sent to AI per request.</div>
              </div>
              <select className="input select" style={{ width: 100 }}
                value={settings.contextLimit}
                onChange={e => updateSettings({ contextLimit: Number(e.target.value) })}>
                {[2048, 4096, 8192, 16384, 32768].map(v => (
                  <option key={v} value={v}>{(v/1000).toFixed(0)}k</option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Default persona</div>
                <div className="settings-row-desc">Used when no per-conversation persona is set.</div>
              </div>
              <select className="input select" style={{ width: 160 }}
                value={settings.defaultPresetId}
                onChange={e => updateSettings({ defaultPresetId: e.target.value })}>
                {DEFAULT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Custom Presets ── */}
        <div className="settings-section">
          <div className="settings-section-title">Custom Prompt Presets</div>
          {customPresets.map(preset => (
            <PresetEditor key={preset.id} preset={preset}
              onUpdate={u => updateCustomPreset(preset.id, u)}
              onDelete={() => deleteCustomPreset(preset.id)} />
          ))}
          {addingPreset ? (
            <div className="settings-card" style={{ padding: 'var(--sp-4)' }}>
              <div className="form-group">
                <label className="form-label">Preset name</label>
                <input className="input" placeholder="My Custom Preset" value={newPreset.label}
                  onChange={e => setNewPreset(p => ({ ...p, label: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">System prompt</label>
                <textarea className="input" rows={4} placeholder="You are..." value={newPreset.system}
                  onChange={e => setNewPreset(p => ({ ...p, system: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddPreset}>Save preset</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setAddingPreset(false); setNewPreset({ label: '', system: '' }); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setAddingPreset(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add custom preset
            </button>
          )}
        </div>

        {/* ── Discord ── */}
        <div className="settings-section">
          <div className="settings-section-title">Discord</div>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Connection</div>
              </div>
              <span className={`badge ${discordConnected ? 'badge-success' : 'badge-muted'}`}>
                <span className={`status-dot ${discordConnected ? 'online' : 'offline'}`} />
                {discordConnected ? `Connected as ${discordUser?.username || '...'}` : 'Not connected'}
              </span>
            </div>
            {discordToken && (
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Token storage</div>
                  <div className="settings-row-desc">Stored locally on this device only — never transmitted elsewhere.</div>
                </div>
                <span className="badge badge-muted">Local</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
