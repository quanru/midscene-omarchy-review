import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { stageReport } from '../scripts/stage-report.mjs';

test('stages a direct HTML report and keeps earlier report links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omarchy-stage-'));
  try {
    const source = join(root, 'artifact');
    const site = join(root, 'docs');
    await mkdir(join(source, 'report', 'midscene-e2e-abc', 'screenshots'), { recursive: true });
    await mkdir(join(site, 'reports', '1'), { recursive: true });
    await writeFile(join(source, 'report', 'midscene-e2e-abc', 'index.html'), '<h1>Native report</h1>');
    await writeFile(join(source, 'report', 'midscene-e2e-abc', 'screenshots', 'image.jpeg'), 'image');
    await writeFile(join(site, 'reports', '1', 'metadata.json'), JSON.stringify({ runId: '1', repository: 'older/repo', sha: 'a'.repeat(40) }));
    await stageReport(source, site, '2', 'owner/repo', 'b'.repeat(40));
    assert.equal(await readFile(join(site, 'reports', '2', 'index.html'), 'utf8'), '<h1>Native report</h1>');
    assert.equal(await readFile(join(site, 'reports', '2', 'screenshots', 'image.jpeg'), 'utf8'), 'image');
    const homepage = await readFile(join(site, 'index.html'), 'utf8');
    assert.match(homepage, /reports\/1\//);
    assert.match(homepage, /reports\/2\//);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
