import React, { useState } from 'react';
import { useAppStore } from '../../../store/appStore';

const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

const IconDownload = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function MemoryPanel({ conversationId, onClose }) {
  const { memories, addMemory, deleteMemory, clearMemory } = useAppStore();
  const [newMemory, setNewMemory] = useState('');
  const [adding, setAdding] = useState(false);

  const convMemories = memories[conversationId] || [];

  const handleAdd = () => {
    if (!newMemory.trim()) return;
    addMemory(conversationId, newMemory.trim());
    setNewMemory('');
    setAdding(false);
  };

  const handleExport = () => {
    const data = JSON.stringify({ conversationId, memories: convMemories }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memories-${conversationId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    if (confirm('Clear all memories for this conversation?')) {
      clearMemory(conversationId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span className="panel-title">Memory</span>
        <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={handleExport} title="Export memories">
            <IconDownload />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <IconX />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-3)' }}>
        {/* Add memory */}
        {adding ? (
          <div style={{ marginBottom: 'var(--sp-3)' }}>
            <textarea
              className="input"
              rows={3}
              placeholder="Add a memory note..."
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) handleAdd();
                if (e.key === 'Escape') { setAdding(false); setNewMemory(''); }
              }}
            />
            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setAdding(false); setNewMemory(''); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 'var(--sp-3)' }}
            onClick={() => setAdding(true)}
          >
            <IconPlus />
            Add memory note
          </button>
        )}

        {/* Memory list */}
        {convMemories.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--sp-6)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
              <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96-.46 2.5 2.5 0 01-1.07-4.54A3 3 0 015 11.5 3 3 0 017.5 8.7a2.5 2.5 0 01.55-2.7A2.5 2.5 0 019.5 2z"/>
              <path d="M14.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 004.96-.46 2.5 2.5 0 001.07-4.54A3 3 0 0119 11.5 3 3 0 0016.5 8.7a2.5 2.5 0 00-.55-2.7A2.5 2.5 0 0014.5 2z"/>
            </svg>
            <span style={{ fontSize: 12 }}>No memories yet</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>
              Memories help the AI personalize responses
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {convMemories.map((mem) => (
              <div key={mem.id} className="memory-item">
                <div style={{ flex: 1 }}>
                  <div className="memory-item-content">{mem.content}</div>
                  <div className="memory-item-date">
                    {new Date(mem.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => deleteMemory(conversationId, mem.id)}
                  style={{ flexShrink: 0, color: 'var(--text-muted)' }}
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {convMemories.length > 0 && (
        <div style={{
          padding: 'var(--sp-3)',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            className="btn btn-danger btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleClearAll}
          >
            <IconTrash />
            Clear all memories
          </button>
        </div>
      )}
    </div>
  );
}
