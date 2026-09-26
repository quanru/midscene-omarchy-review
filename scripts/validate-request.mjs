import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function validateRequest(body) {
  const fields = new Map();
  let heading;
  for (const line of body.split(/\r?\n/)) {
    const match = /^### (.+)$/.exec(line);
    if (match) {
      heading = match[1];
      if (fields.has(heading)) throw new Error(`Duplicate field: ${heading}`);
      fields.set(heading, []);
    } else if (heading) fields.get(heading).push(line);
  }
  const field = (name) => {
    if (!fields.has(name)) throw new Error(`Missing field: ${name}`);
    const value = fields.get(name).join(' ').replace(/\s+/g, ' ').trim();
    if (!value || value === '_No response_') throw new Error(`Empty field: ${name}`);
    return value;
  };
  const official = new URL(field('Official Marketplace Issue URL'));
  if (official.origin !== 'https://github.com' ||
      !/^\/omacom\/omarchy-plugin-marketplace\/issues\/[1-9]\d*\/?$/.test(official.pathname) ||
      official.search || official.hash || official.username || official.password) {
    throw new Error('Official Issue must be an omacom/omarchy-plugin-marketplace Issue URL');
  }
  const repository = new URL(field('Plugin repository URL'));
  if (repository.origin !== 'https://github.com' || repository.search || repository.hash ||
      repository.username || repository.password ||
      !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(repository.pathname)) {
    throw new Error('Plugin repository must be a public GitHub root URL');
  }
  const sha = field('Exact commit SHA');
  const id = field('Plugin ID');
  const openMethod = field('Open IPC method');
  const visibleAssertion = field('Expected visible result');
  if (!/^[a-fA-F0-9]{40}$/.test(sha)) throw new Error('Commit SHA must be 40 hex characters');
  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/.test(id)) throw new Error('Invalid plugin ID');
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(openMethod)) throw new Error('Invalid IPC method');
  if (visibleAssertion.length > 500) throw new Error('Expected result exceeds 500 characters');
  return { officialIssue: official.href, repository: repository.pathname.replace(/^\/|\/$/g, ''), sha, id, openMethod, visibleAssertion };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (!event.issue?.title?.startsWith('[Visual review] ')) throw new Error('Not a visual review request');
  const request = validateRequest(event.issue.body || '');
  console.log(`Valid request for ${request.repository}@${request.sha}; official Issue ${request.officialIssue}`);
}
