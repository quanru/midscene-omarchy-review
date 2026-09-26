import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateRequest } from './validate-request.mjs';

const workerOwner = 'quanru';
const workerRepo = 'doubao-say';
const workerWorkflow = 'midscene-omarchy-4.0.3.yml';
const workerRef = 'research/omarchy-plugin-visual-review';

export function officialRepository(body) {
  const match = /^### Repository URL\s+([^\s]+)\s*$/m.exec(body);
  if (!match) throw new Error('Official Marketplace Issue has no Repository URL field');
  const url = new URL(match[1]);
  if (url.origin !== 'https://github.com' || url.search || url.hash ||
      !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname)) {
    throw new Error('Official Marketplace repository URL is invalid');
  }
  return url.pathname.replace(/^\/|\/$/g, '').toLowerCase();
}

async function api(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2026-03-10',
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} at ${new URL(url).pathname}`);
  return response.status === 204 ? undefined : response.json();
}

const comment = (repo, number, token, body) => api(
  `https://api.github.com/repos/${repo}/issues/${number}/comments`, token,
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) },
);

async function dispatch() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (event.action !== 'labeled' || event.label?.name !== 'approved-to-run' ||
      !event.issue?.title?.startsWith('[Visual review] ')) {
    throw new Error('Expected an approved visual review Issue');
  }
  const request = validateRequest(event.issue.body || '');
  const portalToken = process.env.GITHUB_TOKEN;
  const workerToken = process.env.WORKER_TOKEN;
  if (!portalToken || !workerToken) throw new Error('Portal or worker GitHub App token is missing');

  const officialNumber = Number(new URL(request.officialIssue).pathname.split('/').at(-1));
  const official = await api(
    `https://api.github.com/repos/omacom/omarchy-plugin-marketplace/issues/${officialNumber}`,
    portalToken,
  );
  if (official.pull_request || official.state !== 'open') throw new Error('Official submission Issue must be open');
  if (officialRepository(official.body || '') !== request.repository.toLowerCase()) {
    throw new Error('Plugin repository does not match the official Marketplace Issue');
  }
  const commit = await api(
    `https://api.github.com/repos/${request.repository}/commits/${request.sha}`,
    portalToken,
  );
  if (commit.sha.toLowerCase() !== request.sha.toLowerCase()) throw new Error('Exact plugin commit was not found');

  const payload = {
    ref: workerRef,
    inputs: {
      project: 'omarchy-plugin-smoke',
      plugin_repository: request.repository,
      plugin_sha: request.sha,
      plugin_id: request.id,
      plugin_open_method: request.openMethod,
      visible_assertion: request.visibleAssertion,
    },
  };
  const run = await api(
    `https://api.github.com/repos/${workerOwner}/${workerRepo}/actions/workflows/${workerWorkflow}/dispatches`,
    workerToken,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) },
  );
  if (!run?.run_url || !run?.html_url) throw new Error('Workflow dispatch did not return a run URL');
  await comment(process.env.GITHUB_REPOSITORY, event.issue.number, portalToken,
    `Started the [real Omarchy desktop CI run](${run.html_url}) for \`${request.repository}@${request.sha}\`. This is a visual smoke check, not a Marketplace verification decision.`);

  const deadline = Date.now() + 55 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20_000));
    const status = await api(run.run_url, workerToken);
    if (status.status !== 'completed') continue;
    const success = status.conclusion === 'success';
    const text = success
      ? 'The CI run completed successfully. Review the native Midscene report and screenshots in the `omarchy-midscene-omarchy-plugin-smoke` artifact before making claims about the plugin.'
      : `The CI run ended with \`${status.conclusion}\`. Review its logs and screenshots before attributing the result to the plugin.`;
    await comment(process.env.GITHUB_REPOSITORY, event.issue.number, portalToken,
      `${text}\n\n[Open the CI run](${run.html_url}). A maintainer will review the evidence before linking it to the official Issue.`);
    return;
  }
  throw new Error(`Timed out waiting for worker run ${run.html_url}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await dispatch();
