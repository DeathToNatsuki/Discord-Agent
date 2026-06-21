import React, { useState } from 'react';
import { useAppStore, PROVIDERS } from '../../../store/appStore';
import { AIProviderService, STATIC_MODELS, LOCAL_MODEL_LIBRARY, getModelCompatibility } from '../../../services/aiService';

const PROVIDER_ICONS = {
  claude:      { symbol: 'C', color: '#d97706' },
  openai:      { symbol: 'G', color: '#10b981' },
  gemini:      { symbol: 'G', color: '#3b82f6' },
  openrouter:  { symbol: 'OR', color: '#8b5cf6' },
  ollama:      { symbol: 'O', color: '#f59e0b' },
  lmstudio:    { symbol: 'LM', color: '#ec4899' },
  custom:      { symbol: '?', color: '#6c5ce7' },
};

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const IconChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function AIProviderPanel({ fullPage = false }) {
  const { providers, activeProvider, setActiveProvider, updateProvider, systemInfo } = useAppStore();
  const [expandedProvider, setExpandedProvider] = useState(null);
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [activeTab, setActiveTab] = useState('cloud'); // 'cloud' | 'local' | 'models'

  const handleTest = async (providerId) => {
    const config = providers[providerId];
    setTesting((t) => ({ ...t, [providerId]: true }));
    try {
      const service = new AIProviderService({ providerId, ...config });
      const result = await service.testConnection();
      setTestResults((r) => ({ ...r, [providerId]: result }));
    } catch (err) {
      setTestResults((r) => ({ ...r, [providerId]: { success: false, error: err.message } }));
    } finally {
      setTesting((t) => ({ ...t, [providerId]: false }));
    }
  };

  const handleSetActive = (providerId) => {
    setActiveProvider(providerId);
    updateProvider(providerId, { enabled: true });
  };

  const cloudProviders = ['claude', 'openai', 'gemini', 'openrouter', 'custom'];
  const localProviders = ['ollama', 'lmstudio'];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      maxWidth: fullPage ? 720 : undefined,
      margin: fullPage ? '0 auto' : undefined,
      padding: fullPage ? 'var(--sp-8) var(--sp-10)' : undefined,
      width: fullPage ? '100%' : undefined,
    }}>
      {fullPage && (
        <div className="page-header">
          <div className="page-title">AI Model</div>
          <div className="page-subtitle">Connect cloud or local AI providers to power your responses.</div>
        </div>
      )}
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 var(--sp-3)', gap: 'var(--sp-1)', flexShrink: 0 }}>
        {[
          { id: 'cloud', label: 'Cloud' },
          { id: 'local', label: 'Local' },
          { id: 'models', label: 'Model Library' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'var(--sp-3) var(--sp-3)',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
              transition: 'all var(--t-fast)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-3)' }}>
        {/* Active model display */}
        {activeProvider && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(108,92,231,0.2)',
            borderRadius: 'var(--r-md)',
            marginBottom: 'var(--sp-3)',
            fontSize: 12,
          }}>
            <span className="status-dot online" />
            <span style={{ color: 'var(--text-secondary)' }}>Active:</span>
            <span style={{ fontWeight: 500, color: 'var(--accent)' }}>
              {PROVIDERS[activeProvider]?.name} / {providers[activeProvider]?.selectedModel}
            </span>
          </div>
        )}

        {/* Cloud providers */}
        {activeTab === 'cloud' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {cloudProviders.map((pid) => (
              <ProviderCard
                key={pid}
                providerId={pid}
                config={providers[pid]}
                isActive={activeProvider === pid}
                isExpanded={expandedProvider === pid}
                testResult={testResults[pid]}
                testing={testing[pid]}
                onExpand={() => setExpandedProvider(expandedProvider === pid ? null : pid)}
                onUpdate={(updates) => updateProvider(pid, updates)}
                onTest={() => handleTest(pid)}
                onSetActive={() => handleSetActive(pid)}
              />
            ))}
          </div>
        )}

        {/* Local providers */}
        {activeTab === 'local' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--sp-2)', lineHeight: 1.6 }}>
              Connect to locally-running AI models via Ollama or LM Studio.
            </div>
            {localProviders.map((pid) => (
              <LocalProviderCard
                key={pid}
                providerId={pid}
                config={providers[pid]}
                isActive={activeProvider === pid}
                isExpanded={expandedProvider === pid}
                testResult={testResults[pid]}
                testing={testing[pid]}
                onExpand={() => setExpandedProvider(expandedProvider === pid ? null : pid)}
                onUpdate={(updates) => updateProvider(pid, updates)}
                onTest={() => handleTest(pid)}
                onSetActive={() => handleSetActive(pid)}
              />
            ))}
          </div>
        )}

        {/* Model library */}
        {activeTab === 'models' && (
          <ModelLibrary systemInfo={systemInfo} />
        )}
      </div>
    </div>
  );
}

// ── Cloud provider card ───────────────────────────────────────────────────────

function ProviderCard({ providerId, config, isActive, isExpanded, testResult, testing, onExpand, onUpdate, onTest, onSetActive }) {
  const provider = PROVIDERS[providerId];
  const icon = PROVIDER_ICONS[providerId];
  const models = STATIC_MODELS[providerId] || [];

  return (
    <div className={`provider-card ${isActive ? 'active' : ''}`}>
      <div className="provider-card-header" onClick={onExpand} style={{ cursor: 'pointer', marginBottom: 0 }}>
        <div className="provider-icon" style={{ background: `${icon.color}20`, color: icon.color, fontSize: 11, fontWeight: 700 }}>
          {icon.symbol}
        </div>
        <div style={{ flex: 1 }}>
          <div className="provider-name">{provider.name}</div>
          <div className="provider-type">{provider.type === 'cloud' ? 'Cloud API' : 'Local'}</div>
        </div>
        {isActive && <span className="badge badge-accent">Active</span>}
        {testResult?.success === true && !isActive && <span className="badge badge-success">Connected</span>}
        {testResult?.success === false && <span className="badge badge-error">Error</span>}
        <span style={{ color: 'var(--text-muted)', marginLeft: 'var(--sp-2)' }}>
          {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border-subtle)' }}>
          {/* API Key */}
          {providerId !== 'custom' ? (
            <div className="form-group">
              <label className="form-label">API Key</label>
              <input
                type="password"
                className="input"
                placeholder={`Enter ${provider.name} API key...`}
                value={config?.apiKey || ''}
                onChange={(e) => onUpdate({ apiKey: e.target.value })}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">API Base URL</label>
                <input
                  className="input"
                  placeholder="https://api.example.com"
                  value={config?.host || ''}
                  onChange={(e) => onUpdate({ host: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">API Key (optional)</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Leave blank if not required"
                  value={config?.apiKey || ''}
                  onChange={(e) => onUpdate({ apiKey: e.target.value })}
                />
              </div>
            </>
          )}

          {/* Model selection */}
          {models.length > 0 && (
            <div className="form-group">
              <label className="form-label">Model</label>
              <select
                className="input select"
                value={config?.selectedModel || ''}
                onChange={(e) => onUpdate({ selectedModel: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.tier})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom model */}
          {(providerId === 'custom' || providerId === 'openrouter') && (
            <div className="form-group">
              <label className="form-label">Model ID {providerId === 'openrouter' ? '(or select above)' : ''}</label>
              <input
                className="input"
                placeholder="model-name-here"
                value={config?.selectedModel || ''}
                onChange={(e) => onUpdate({ selectedModel: e.target.value })}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
            </div>
          )}

          {testResult?.error && (
            <div style={{ fontSize: 11, color: 'var(--error)', padding: 'var(--sp-2)', background: 'var(--error-dim)', borderRadius: 'var(--r-sm)', marginBottom: 'var(--sp-3)' }}>
              {testResult.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button className="btn btn-secondary btn-sm" onClick={onTest} disabled={testing}>
              {testing ? <><span className="spinner spinner-sm" /> Testing...</> : 'Test connection'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={onSetActive}>
              Use this model
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Local provider card ───────────────────────────────────────────────────────

function LocalProviderCard({ providerId, config, isActive, isExpanded, testResult, testing, onExpand, onUpdate, onTest, onSetActive }) {
  const provider = PROVIDERS[providerId];
  const icon = PROVIDER_ICONS[providerId];
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const handleFetchModels = async () => {
    setLoadingModels(true);
    try {
      const service = new AIProviderService({ providerId, ...config });
      const models = await service.listModels();
      setAvailableModels(models);
    } catch (err) {
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <div className={`provider-card ${isActive ? 'active' : ''}`}>
      <div className="provider-card-header" onClick={onExpand} style={{ cursor: 'pointer', marginBottom: 0 }}>
        <div className="provider-icon" style={{ background: `${icon.color}20`, color: icon.color, fontSize: 11, fontWeight: 700 }}>
          {icon.symbol}
        </div>
        <div style={{ flex: 1 }}>
          <div className="provider-name">{provider.name}</div>
          <div className="provider-type">Local inference</div>
        </div>
        {isActive && <span className="badge badge-accent">Active</span>}
        {testResult?.success === true && !isActive && <span className="badge badge-success">Found</span>}
        {testResult?.success === false && <span className="badge badge-error">Not found</span>}
        <span style={{ color: 'var(--text-muted)', marginLeft: 'var(--sp-2)' }}>
          {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="form-group">
            <label className="form-label">Host URL</label>
            <input
              className="input"
              placeholder={providerId === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
              value={config?.host || ''}
              onChange={(e) => onUpdate({ host: e.target.value })}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Model</label>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              {availableModels.length > 0 ? (
                <select
                  className="input select"
                  value={config?.selectedModel || ''}
                  onChange={(e) => onUpdate({ selectedModel: e.target.value })}
                  style={{ flex: 1 }}
                >
                  <option value="">Select a model...</option>
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  placeholder="e.g. llama3.2:3b"
                  value={config?.selectedModel || ''}
                  onChange={(e) => onUpdate({ selectedModel: e.target.value })}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />
              )}
              <button className="btn btn-secondary btn-sm" onClick={handleFetchModels} disabled={loadingModels} style={{ flexShrink: 0 }}>
                {loadingModels ? <span className="spinner spinner-sm" /> : 'Detect'}
              </button>
            </div>
          </div>

          {testResult?.error && (
            <div style={{ fontSize: 11, color: 'var(--error)', padding: 'var(--sp-2)', background: 'var(--error-dim)', borderRadius: 'var(--r-sm)', marginBottom: 'var(--sp-3)' }}>
              {testResult.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button className="btn btn-secondary btn-sm" onClick={onTest} disabled={testing}>
              {testing ? <><span className="spinner spinner-sm" /> Testing...</> : 'Test connection'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={onSetActive}>
              Use this model
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Model library ─────────────────────────────────────────────────────────────

function ModelLibrary({ systemInfo }) {
  const compatLabel = {
    compatible:   { label: 'Compatible', cls: 'compat-compatible' },
    partial:      { label: 'Partial', cls: 'compat-partial' },
    incompatible: { label: 'Not Recommended', cls: 'compat-incompatible' },
    unknown:      { label: 'Unknown', cls: 'compat-unknown' },
  };

  const ramGB = systemInfo ? Math.round(systemInfo.totalMemory / (1024 ** 3)) : null;

  return (
    <div>
      {ramGB && (
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 'var(--sp-3)',
          padding: 'var(--sp-2) var(--sp-3)',
          background: 'var(--bg-raised)',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          Detected: <strong style={{ color: 'var(--text-secondary)' }}>{ramGB}GB RAM</strong>
          {systemInfo?.cpus?.[0]?.model && ` · ${systemInfo.cpus[0].model.trim()}`}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {LOCAL_MODEL_LIBRARY.map((model) => {
          const compat = getModelCompatibility(model, systemInfo);
          const c = compatLabel[compat];

          return (
            <div key={model.id} className="model-library-item">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{model.name}</span>
                  <span className={`model-compat-badge ${c.cls}`}>{c.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.5 }}>
                  {model.description}
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-3)', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>Size: {model.size}</span>
                  <span>RAM: {model.ramRequired}GB+</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', flexShrink: 0 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(model.pullCommand);
                    alert(`Copied!\n\nRun in terminal:\n${model.pullCommand}`);
                  }}
                  style={{ fontSize: 11 }}
                >
                  Copy command
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-3)', background: 'var(--bg-raised)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Models are downloaded and run locally via Ollama. Install Ollama from{' '}
        <button
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', padding: 0, textDecoration: 'underline' }}
          onClick={() => window.electronAPI?.openExternal('https://ollama.com') || window.open('https://ollama.com')}
        >
          ollama.com
        </button>
        {' '}then copy the command above into your terminal.
      </div>
    </div>
  );
}
