import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRequest } from '../scripts/validate-request.mjs';

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
