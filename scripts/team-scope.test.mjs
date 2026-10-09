import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('switching teams isolates employees, history, Skills and resources', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  const previousFetch = globalThis.fetch;
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: { getItem: () => 'test-token' } };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    const team = body.scope_id || body.space_id;
    let data;
    if (url.endsWith('/v1/spaces/list')) data = { items: ['a', 'b'].map(id => ({ space: { space_id: id, kind: 'team', name: id, status: 'active' } })) };
    else if (url.endsWith('/catalog/list')) data = { items: ['a', 'b'].map(id => ({ application_id: id, team_id: id, name: id })) };
    else if (url.endsWith('/participation-bindings/list')) data = { items: [{ binding: { participation_binding_id: team, scope_type: body.scope_type, scope_id: team }, deployment_revision: { application_id: team } }] };
    else if (url.endsWith('/commands/work')) data = { items: ['a', 'b'].filter(id => !team || id === team).map(id => ({ command_id: id, purpose: 'employee', scope_type: 'team', scope_id: id })) };
    else if (url.endsWith('/commands/detail')) data = { employee_turns: [] };
    else if (url.endsWith('/skills/catalog')) data = { items: ['a', 'b'].map(id => ({ skill_id: id })) };
    else if (url.endsWith('/skills/spaces/list')) data = { items: [{ skill_id: team }] };
    else if (url.endsWith('/knowledge/bases/list')) data = { knowledge_bases: [{ knowledge_base_id: team, name: team }] };
    else if (url.endsWith('/knowledge/documents/list')) data = { documents: [{ id: body.knowledge_base_id, filename: `${body.knowledge_base_id}.txt`, title: '', updated_at: '' }] };
    else throw new Error(`Unexpected request ${url}`);
    return new Response(JSON.stringify({ status: true, data }));
  };
  try {
    const { loadArgusUserData } = await server.ssrLoadModule('/src/runtime/argus-data.ts');
    for (const team of ['a', 'b']) {
      const data = await loadArgusUserData('/api', 'ws', new AbortController().signal, team);
      assert.deepEqual(data.applications.map(x => x.application_id), [team]);
      assert.deepEqual(data.work.map(x => x.command_id), [team]);
      assert.deepEqual(data.skills.map(x => x.skill_id), [team]);
      assert.deepEqual(data.resources.flatMap(x => x.resources.map(f => f.name)), [`${team}.txt`]);
      assert.deepEqual(data.bindings.map(x => x.binding.scope_id), [team]);
    }
    const empty = await loadArgusUserData('/api', 'ws', new AbortController().signal, null);
    assert.deepEqual(empty, { applications: [], bindings: [], work: [], skills: [], resources: [] });
    assert.ok(calls.filter(x => x.url.endsWith('/commands/detail')).every(x => ['a', 'b'].includes(x.body.command_id)));
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.window = previousWindow;
    await server.close();
  }
});

test('team selection survives reload, separates account caches and drops revoked membership', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const storage = new Map([['argus.access_token', 'test-token']]);
  let user = 1;
  let active = ['a', 'b'];
  let destination = '';
  globalThis.window = {
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    location: { assign: value => { destination = value; } },
  };
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    const data = url.endsWith('/user/me') ? { id: user } : {
      items: [{ space: { space_id: body.cursor ? 'b' : 'a', name: body.cursor ? '乙团队' : '甲团队', status: active.includes(body.cursor ? 'b' : 'a') ? 'active' : 'disabled' } }],
      next_cursor: body.cursor ? '' : 'second',
    };
    return new Response(JSON.stringify({ status: true, data }));
  };
  try {
    const scope = await server.ssrLoadModule('/src/runtime/team-scope.ts');
    const reload = () => scope.initializeTeamScope('/api', 'ws', new AbortController().signal);
    await reload();
    assert.equal(scope.getActiveTeam().id, 'a');
    storage.set(scope.teamStorageKey('projects'), 'team-a-project');
    scope.selectTeam('b', '/office/apps');
    assert.equal(destination, '/office/apps');
    await reload();
    assert.equal(scope.getActiveTeam().id, 'b');
    assert.equal(storage.get(scope.teamStorageKey('projects')), undefined);
    await reload();
    assert.equal(scope.getActiveTeam().id, 'b');
    scope.selectTeam('a', '/office/apps');
    await reload();
    assert.equal(storage.get(scope.teamStorageKey('projects')), 'team-a-project');
    user = 2;
    await reload();
    assert.equal(storage.get(scope.teamStorageKey('projects')), undefined);
    active = [];
    await reload();
    assert.equal(scope.getActiveTeam(), null);
    assert.deepEqual(scope.getUserTeams(), []);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
    await server.close();
  }
});
