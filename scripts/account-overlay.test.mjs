import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('shared account overlay stays attached to its caller and ignores foreign messages', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { accountOverlayUrl, accountOverlayEvent } = await server.ssrLoadModule('/src/runtime/account-overlay.ts');
    const url = accountOverlayUrl('http://127.0.0.1:5173/applications/studio', 'http://127.0.0.1:5173/office/apps?filter=created');
    assert.equal(new URL(url).pathname, '/settings/account');
    assert.equal(new URL(url).searchParams.get('embed'), '1');
    assert.equal(new URL(url).searchParams.get('return_to'), 'http://127.0.0.1:5173/office/apps?filter=created');
    const legacy = accountOverlayUrl('http://127.0.0.1:5173/applications/studio', 'http://127.0.0.1:5174/conversations/command-1');
    assert.equal(new URL(legacy).searchParams.get('return_to'), 'http://127.0.0.1:5174/office/conversations/command-1');
    const frame = {};
    const event = { origin: 'http://127.0.0.1:5173', source: frame, data: { type: 'argus:account-close' } };
    assert.equal(accountOverlayEvent(event, frame, url), 'close');
    assert.equal(accountOverlayEvent({ ...event, source: {} }, frame, url), null);
    assert.equal(accountOverlayEvent({ ...event, origin: 'https://untrusted.example' }, frame, url), null);
    assert.equal(accountOverlayEvent({ ...event, data: { type: 'argus:auth-invalid' } }, frame, url), 'auth-invalid');
    assert.equal(accountOverlayEvent({ ...event, data: null }, frame, url), null);
  } finally { await server.close(); }
});
