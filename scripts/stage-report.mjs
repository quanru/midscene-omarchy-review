import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export async function stageReport(sourceDir, siteDir, runId, repository, sha) {
  if (!/^\d+$/.test(runId)) throw new Error('Run ID must contain digits only');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid repository');
  if (!/^[a-fA-F0-9]{40}$/.test(sha)) throw new Error('Invalid commit SHA');
  const reportRoot = join(sourceDir, 'report');
  const matches = (await readdir(reportRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('midscene-e2e-'));
  if (matches.length !== 1) throw new Error(`Expected one native Midscene report, found ${matches.length}`);
  const source = join(reportRoot, matches[0].name);
  await readFile(join(source, 'index.html'));
  const target = join(siteDir, 'reports', runId);
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, force: true });
  const metadata = { runId, repository, sha };
  await writeFile(join(target, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);

  const reportDirs = (await readdir(join(siteDir, 'reports'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name));
  const reports = [];
  for (const entry of reportDirs) {
    const item = JSON.parse(await readFile(join(siteDir, 'reports', entry.name, 'metadata.json'), 'utf8'));
    if (item.runId !== entry.name) throw new Error(`Invalid report metadata for ${entry.name}`);
    reports.push(item);
  }
  reports.sort((a, b) => Number(b.runId) - Number(a.runId));
  const items = reports.map((item) => `<li><a href="reports/${item.runId}/">${escapeHtml(item.repository)} at ${escapeHtml(item.sha.slice(0, 7))} — run ${item.runId}</a></li>`).join('\n');
  await writeFile(join(siteDir, 'index.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Midscene Omarchy visual reviews</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:3rem auto;padding:0 1rem;color:#17202a}a{color:#0969da}</style>
<h1>Midscene Omarchy visual reviews</h1>
<p>Reports below are scoped desktop observations. They are not Marketplace verification or security audits.</p>
<ul>${items}</ul>
<p><a href="https://github.com/quanru/midscene-omarchy-review/issues/new?template=plugin-review.yml">Request a visual review</a></p>
</html>
`);
  return target;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [sourceDir, runId, repository, sha] = process.argv.slice(2);
  if (!sourceDir || !runId || !repository || !sha) throw new Error('Usage: stage-report SOURCE RUN_ID OWNER/REPO SHA');
  console.log(await stageReport(sourceDir, 'docs', runId, repository, sha));
}
