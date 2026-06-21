import React, { useState, useEffect, useRef, useCallback } from 'react';

const LogoMark = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 10L6 2L10 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.5 7.5h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconMinus = () => (
  <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
    <path d="M1 1h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconSquare = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1.5" rx="1"/>
  </svg>
);

const IconSquareNested = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="3" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.3" rx="1"/>
    <rect x="1" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.3" rx="1" fill="var(--bg-surface)"/>
  </svg>
);

const IconX = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const dragRef = useRef(null);
  const dragState = useRef(null);

  // Track maximized state
  useEffect(() => {
    const check = () => {
      const isMax =
        window.screenX === 0 &&
        window.screenY === 0 &&
        window.outerWidth >= window.screen.availWidth - 4 &&
        window.outerHeight >= window.screen.availHeight - 4;
      setIsMaximized(isMax);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Drag-to-move the window
  const onMouseDown = useCallback((e) => {
    // Only drag on the bar itself, not buttons
    if (e.target.closest('button')) return;
    if (isMaximized) return;

    dragState.current = {
      startX: e.screenX - window.screenX,
      startY: e.screenY - window.screenY,
    };

    const onMove = (e) => {
      if (!dragState.current) return;
      window.moveTo(
        e.screenX - dragState.current.startX,
        e.screenY - dragState.current.startY
      );
    };

    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isMaximized]);

  // Double-click titlebar to maximize/restore
  const onDoubleClick = useCallback((e) => {
    if (e.target.closest('button')) return;
    handleMaximize();
  }, [isMaximized]);

  const handleMinimize = () => {
    // In --app mode, window.blur() + minimize via window API
    // Not directly possible in pure browser — we hide to taskbar via blur trick
    window.focus();
    // The most reliable cross-browser minimize for app-mode windows:
    window.open('', '_self');  // focus self, then...
    // Actually just blur which on most OS will minimize the standalone window
    setTimeout(() => window.blur(), 50);
  };

  const handleMaximize = () => {
    if (isMaximized) {
      // Restore to a reasonable size
      const w = 1280, h = 800;
      const x = Math.round((window.screen.availWidth - w) / 2);
      const y = Math.round((window.screen.availHeight - h) / 2);
      window.resizeTo(w, h);
      window.moveTo(x, y);
      setIsMaximized(false);
    } else {
      window.moveTo(0, 0);
      window.resizeTo(window.screen.availWidth, window.screen.availHeight);
      setIsMaximized(true);
    }
  };

  const handleClose = () => window.close();

  return (
    <div
      className="titlebar"
      ref={dragRef}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      style={{ cursor: isMaximized ? 'default' : 'move' }}
    >
      <div className="titlebar-left">
        <div className="titlebar-logo" style={{ pointerEvents: 'none' }}>
          <div className="titlebar-logo-mark">
            <LogoMark />
          </div>
          <span className="titlebar-app-name">Discord Agent</span>
        </div>
      </div>

      <div className="titlebar-spacer" />

      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={handleMinimize} title="Minimize">
          <IconMinus />
        </button>
        <button className="titlebar-btn" onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
          {isMaximized ? <IconSquareNested /> : <IconSquare />}
        </button>
        <button className="titlebar-btn close" onClick={handleClose} title="Close">
          <IconX />
        </button>
      </div>
    </div>
  );
}
