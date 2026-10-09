export function accountOverlayUrl(managementUrl: string, callerUrl: string) {
  const url = new URL('/settings/account', managementUrl);
  const caller = new URL(callerUrl);
  if (!caller.pathname.startsWith('/office/')) caller.pathname = `/office${caller.pathname}`;
  url.searchParams.set('embed', '1');
  url.searchParams.set('preload', '1');
  url.searchParams.set('return_to', caller.toString());
  return url.toString();
}

export function accountOverlayEvent(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, frame: Window | null, url: string): 'ready' | 'close' | 'auth-invalid' | null {
  if (!frame || event.source !== frame || event.origin !== new URL(url).origin) return null;
  if (event.data?.type === 'argus:account-ready') return 'ready';
  if (event.data?.type === 'argus:account-close') return 'close';
  if (event.data?.type === 'argus:auth-invalid') return 'auth-invalid';
  return null;
}
