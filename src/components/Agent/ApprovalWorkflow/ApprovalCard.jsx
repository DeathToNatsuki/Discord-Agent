import React, { useState } from 'react';

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const IconEdit = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function ApprovalCard({ item, onApprove, onReject }) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(item.draftContent);

  const handleApprove = () => {
    onApprove(item, editing ? editedContent : item.draftContent);
  };

  const time = new Date(item.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="approval-card">
      <div className="approval-card-header">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', flex: 1 }}>
          AI Draft
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {item.model} · {time}
        </span>
        {item.usage?.output && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
            {item.usage.output} tokens
          </span>
        )}
      </div>

      <div className="approval-card-body">
        {editing ? (
          <textarea
            className="input approval-draft"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={3}
            autoFocus
          />
        ) : (
          <div className="approval-draft" style={{ cursor: 'text' }} onClick={() => setEditing(true)}>
            {item.draftContent}
          </div>
        )}

        <div className="approval-actions">
          <button
            className="btn btn-sm"
            style={{ background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid rgba(0,184,148,0.2)' }}
            onClick={handleApprove}
          >
            <IconCheck />
            {editing ? 'Send edited' : 'Send'}
          </button>
          {!editing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              <IconEdit />
              Edit
            </button>
          )}
          {editing && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setEditedContent(item.draftContent); }}>
              Cancel
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onReject(item)}>
            <IconX />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
