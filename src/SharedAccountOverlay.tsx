import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { accountOverlayEvent, accountOverlayUrl } from './runtime/account-overlay';
import './SharedAccountOverlay.css';

/** Hosts the management dialog itself; no duplicate account form or account API. */
export function SharedAccountOverlay({ managementUrl, open, onClose }: { managementUrl: string; open: boolean; onClose(): void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [url] = useState(() => accountOverlayUrl(managementUrl, window.location.href));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const action = accountOverlayEvent(event, frame.current?.contentWindow ?? null, url);
      if (action === 'ready') { setReady(true); return; }
      if (action === 'auth-invalid') window.dispatchEvent(new Event('argus:auth-invalid'));
      if (action) onClose();
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
    };
  }, [onClose, url]);
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage({ type: open ? 'argus:account-open' : 'argus:account-hide' }, new URL(url).origin);
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    frame.current?.focus();
    return () => {
      if (root) root.inert = wasInert;
      previousFocus?.focus();
    };
  }, [open, ready, url]);
  return createPortal(<div className="shared-account-overlay" hidden={!open || !ready}>
    <iframe ref={frame} title="账号设置" src={url} />
  </div>, document.body);
}
