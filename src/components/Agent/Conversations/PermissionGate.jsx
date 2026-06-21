import React from 'react';
import { useAppStore } from '../../../store/appStore';

const IconShield = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

export default function PermissionGate({ conversation }) {
  const { grantConversationPermission } = useAppStore();

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--sp-8)',
    }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          background: 'var(--accent-dim)',
          borderRadius: 'var(--r-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--sp-5)',
          border: '1px solid rgba(108,92,231,0.2)',
        }}>
          <IconShield />
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--sp-2)', color: 'var(--text-primary)' }}>
          Allow access to conversation history?
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--sp-5)' }}>
          To generate AI responses for <strong style={{ color: 'var(--text-primary)' }}>{conversation.name}</strong>,
          this app needs to read your conversation history with this user.
        </div>

        <div style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--sp-4)',
          marginBottom: 'var(--sp-5)',
          textAlign: 'left',
        }}>
          <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>What this allows</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {[
              'Read recent messages from this conversation',
              'Pass message history to the AI as context',
              'Generate response drafts for your review',
              'Store memory notes about this conversation locally',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {item}
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--sp-3) 0' }} />

          <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>What this does not do</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {[
              'Send any message without your explicit approval',
              'Upload data to external servers (except the AI API)',
              'Access other conversations without separate permission',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 'var(--sp-4)', lineHeight: 1.6 }}>
          You can revoke this permission at any time from the conversation settings panel.
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => grantConversationPermission(conversation.id)}
          >
            Allow Access
          </button>
        </div>
      </div>
    </div>
  );
}
