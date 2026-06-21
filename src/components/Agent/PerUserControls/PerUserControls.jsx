import React from 'react';
import { useAppStore, DEFAULT_PRESETS, RESPONSE_MODES } from '../../../store/appStore';

const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function PerUserControls({ conversationId, onClose }) {
  const { conversationConfigs, updateConversationConfig, customPresets, revokeConversationPermission } = useAppStore();
  const config   = conversationConfigs[conversationId] || {};
  const allPresets = [...DEFAULT_PRESETS, ...customPresets];
  const update   = (key, value) => updateConversationConfig(conversationId, { [key]: value });

  const handleRevoke = () => {
    if (confirm('Revoke AI access to this conversation?')) {
      revokeConversationPermission(conversationId);
      onClose?.();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span className="panel-title">AI Configuration</span>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><IconX /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

        {/* Enable toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--sp-3) var(--sp-4)', background: 'var(--bg-raised)',
          border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Enable AI</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Activate AI for this conversation</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={config.enabled || false} onChange={e => update('enabled', e.target.checked)} />
            <div className="toggle-track" /><div className="toggle-thumb" />
          </label>
        </div>

        {/* Preset */}
        <div className="form-group">
          <label className="form-label">AI Persona</label>
          <select className="input select" value={config.presetId || 'assistant'}
            onChange={e => {
              update('presetId', e.target.value);
              // Reset sentIntro so the new preset can send its intro
              update('sentIntro', false);
            }}>
            {allPresets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <div className="form-hint">
            {allPresets.find(p => p.id === (config.presetId || 'assistant'))?.introMessage
              ? 'This persona will introduce itself on the first message.'
              : 'This persona blends in silently.'}
          </div>
        </div>

        {/* Custom system prompt */}
        <div className="form-group">
          <label className="form-label">Custom System Prompt <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(overrides persona)</span></label>
          <textarea className="input" rows={4} placeholder="Leave blank to use persona above..."
            value={config.customSystemPrompt || ''}
            onChange={e => update('customSystemPrompt', e.target.value)} />
        </div>

        {/* Response mode */}
        <div className="form-group">
          <label className="form-label">Response Mode</label>
          <select className="input select" value={config.responseMode || 'manual'}
            onChange={e => update('responseMode', e.target.value)}>
            {Object.values(RESPONSE_MODES).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        {/* Trigger text */}
        {['contains', 'starts_with'].includes(config.responseMode) && (
          <div className="form-group">
            <label className="form-label">
              {config.responseMode === 'contains' ? 'Trigger text (message contains)' : 'Trigger text (message starts with)'}
            </label>
            <input className="input" placeholder="Enter trigger text..."
              value={config.responseTriggerText || ''}
              onChange={e => update('responseTriggerText', e.target.value)} />
          </div>
        )}

        {/* Approval mode — per conversation */}
        <div className="form-group">
          <label className="form-label">Before Sending</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {[
              { value: 'always', label: 'Ask me to approve each reply', desc: 'Drafts appear for your review before sending.' },
              { value: 'never',  label: 'Send automatically',           desc: 'Replies are sent immediately without confirmation.' },
            ].map(({ value, label, desc }) => (
              <label key={value} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', cursor: 'pointer',
                padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-md)',
                background: (config.approvalMode || 'always') === value ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${(config.approvalMode || 'always') === value ? 'rgba(108,92,231,0.3)' : 'var(--border-subtle)'}`,
                transition: 'all var(--t-fast)',
              }}>
                <input type="radio" name={`approval_${conversationId}`} value={value}
                  checked={(config.approvalMode || 'always') === value}
                  onChange={() => update('approvalMode', value)}
                  style={{ accentColor: 'var(--accent)', marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Revoke */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--sp-2)' }}>Data Access</div>
          <button className="btn btn-danger btn-sm" onClick={handleRevoke}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 010 12.73M5.64 5.64a9 9 0 000 12.73"/><line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            Revoke conversation access
          </button>
        </div>
      </div>
    </div>
  );
}
