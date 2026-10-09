import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { accountOverlayEvent, accountOverlayUrl } from './runtime/account-overlay';
import './SharedAccountOverlay.css';

/** Hosts the management dialog itself; no duplicate account form or account API. */
export function SharedAccountOverlay({ managementUrl, onClose }: { managementUrl: string; onClose(): void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [url] = useState(() => accountOverlayUrl(managementUrl, window.location.href));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    const receive = (event: MessageEvent) => {
      const action = accountOverlayEvent(event, frame.current?.contentWindow ?? null, url);
      if (action === 'ready') { setReady(true); return; }
      if (action === 'auth-invalid') window.dispatchEvent(new Event('argus:auth-invalid'));
      if (action) onClose();
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
      if (root) root.inert = wasInert;
      previousFocus?.focus();
    };
  }, [onClose, url]);
  return createPortal(<div className="shared-account-overlay">
    {!ready && <div className="shared-account-loading" role="status"><span>正在打开账号设置…</span><button type="button" onClick={onClose}>取消打开</button></div>}
    <iframe ref={frame} title="账号设置" src={url} onLoad={() => frame.current?.focus()} />
  </div>, document.body);
}
