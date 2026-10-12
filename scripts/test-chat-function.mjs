import assert from "node:assert/strict";
import onRequest from "../cloud-functions/api/chat.ts";

const baseContext = (request, env = {}) => ({ request, env, clientIp: "127.0.0.1" });

const getResponse = await onRequest(baseContext(new Request("https://example.test/api/chat")));
assert.equal(getResponse.status, 405);

const validBody = {
  idempotencyKey: "test-run",
  conversationId: "conversation-test",
  prompt: "请给出项目风险清单",
  participants: [{ id: "project-manager", name: "项目管理专家" }],
  attachments: [],
};

const missingKeyResponse = await onRequest(baseContext(new Request("https://example.test/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(validBody),
})));
assert.equal(missingKeyResponse.status, 503);

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response([
  'data: {"choices":[{"delta":{"content":"先识别"}}]}',
  '',
  'data: {"choices":[{"delta":{"content":"关键依赖。"}}]}',
  '',
  'data: [DONE]',
  '',
].join("\n"), { headers: { "Content-Type": "text/event-stream" } });

try {
  const successResponse = await onRequest(baseContext(new Request("https://example.test/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validBody),
  }), { MAKERS_MODELS_KEY: "test-only-key" }));
  assert.equal(successResponse.status, 200);
  const output = await successResponse.text();
  assert.match(output, /run\.started/);
  assert.match(output, /先识别/);
  assert.match(output, /关键依赖/);
  assert.match(output, /run\.completed/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("chat function contract: ok");
