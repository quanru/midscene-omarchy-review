import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRequest } from '../scripts/validate-request.mjs';
import { matchesOfficialSnapshot, officialRepository } from '../scripts/dispatch-request.mjs';

const valid = `### Official Marketplace Issue URL

https://github.com/omacom/omarchy-plugin-marketplace/issues/8772

### Plugin repository URL

https://github.com/manateelazycat/omarchy-workspace-gallery

### Exact commit SHA

486a431858f05e37ba3fcb0cc7fb29efc563e671

### Plugin ID

io.github.manateelazycat.workspace-gallery

### Open IPC method

open

### Expected visible result

The Workspace Gallery panel is open.`;

test('extracts a pinned public review request', () => {
  assert.deepEqual(validateRequest(valid), {
    officialIssue: 'https://github.com/omacom/omarchy-plugin-marketplace/issues/8772',
    repository: 'manateelazycat/omarchy-workspace-gallery',
    sha: '486a431858f05e37ba3fcb0cc7fb29efc563e671',
    id: 'io.github.manateelazycat.workspace-gallery',
    openMethod: 'open',
    visibleAssertion: 'The Workspace Gallery panel is open.',
  });
});

test('rejects a lookalike official host and shell-shaped method', () => {
  assert.throws(() => validateRequest(valid.replace('https://github.com/omacom', 'https://github.com.attacker.test/omacom')), /Official Issue/);
  assert.throws(() => validateRequest(valid.replace('### Open IPC method\n\nopen', '### Open IPC method\n\nopen;id')), /Invalid IPC/);
});

test('matches the repository declared in a Marketplace submission or update', () => {
  const body = '### Verification action\n\nVerify and publish a newer upstream commit\n\n### Repository URL\n\nhttps://github.com/manateelazycat/omarchy-workspace-gallery\n\n### Target commit\n\n486a431858f05e37ba3fcb0cc7fb29efc563e671';
  assert.equal(officialRepository(body), 'manateelazycat/omarchy-workspace-gallery');
  assert.throws(() => officialRepository(body.replace('github.com/', 'github.com.attacker.test/')), /invalid/);
});

test('requires the official bot baseline at the exact commit and plugin ID', () => {
  const request = validateRequest(valid);
  const snapshot = { repository: request.repository, commitSha: request.sha, pluginIds: [request.id], outcome: 'passed' };
  const comment = (user = 'github-actions[bot]') => ({
    user: { login: user },
    body: `<!-- marketplace-security-baseline:v4 ${Buffer.from(JSON.stringify(snapshot)).toString('base64')} -->`,
  });
  assert.equal(matchesOfficialSnapshot([comment()], request), true);
  assert.equal(matchesOfficialSnapshot([comment('attacker')], request), false);
  assert.equal(matchesOfficialSnapshot([comment()], { ...request, sha: 'a'.repeat(40) }), false);
});
