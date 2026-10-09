import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('Skill installation only accepts targets in the current team', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
  try {
    const { isCurrentTeamSkillTarget } = await server.ssrLoadModule('/src/runtime/skill-install-scope.ts');
    const scope = { teamId: 'a', employeeIds: ['employee-a'], projectIds: ['project-a'] };
    assert.equal(isCurrentTeamSkillTarget(scope, 'digital-employee', 'employee-a'), true);
    assert.equal(isCurrentTeamSkillTarget(scope, 'project', 'project-a'), true);
    assert.equal(isCurrentTeamSkillTarget(scope, 'digital-employee', 'employee-b'), false);
    assert.equal(isCurrentTeamSkillTarget(scope, 'project', 'project-b'), false);
    assert.equal(isCurrentTeamSkillTarget(scope, 'project', 'employee-a'), false);
    assert.equal(isCurrentTeamSkillTarget({ ...scope, teamId: null }, 'project', 'project-a'), false);
  } finally {
    await server.close();
  }
});
