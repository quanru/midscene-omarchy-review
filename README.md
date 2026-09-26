# Midscene Omarchy plugin visual review

This public queue collects requests for a real Omarchy desktop check. The
plugin author does not need a Midscene API key, a VM image, or a workflow in
their own repository. The CI worker is currently hosted by the
[`quanru/doubao-say` pilot](https://github.com/quanru/doubao-say/tree/research/omarchy-plugin-visual-review).

## Request a review

1. Submit the plugin to the [Omarchy plugin marketplace](https://github.com/omacom/omarchy-plugin-marketplace/issues/new/choose).
2. [Open a visual review request](https://github.com/quanru/midscene-omarchy-review/issues/new?template=plugin-review.yml) here. Include the official Issue URL, public plugin repository, full commit SHA, manifest ID, IPC method that opens a visible surface, and one observable result.
3. A maintainer checks the request and runs that exact commit in a disposable
   Omarchy VM on GitHub Actions. Use `summon` for a panel, overlay, or menu,
   or the plugin's IPC method for a bar widget. The result, native Midscene report, and
   screenshots are linked on your request. If the evidence is useful and
   scoped correctly, we also link it on the official submission Issue.

The visual check is behavioral evidence. It does not approve, verify, or
security-audit a plugin. The official Marketplace continues its own checks and
maintainer review.

## Pilot operating procedure

The request form is live. A repository-local Actions workflow validates the
form and marks valid Issues `ready-for-maintainer`. The worker is in a separate
repository because its Omarchy VM image and model credentials are private to
that repository. After checking the official Issue and request, a maintainer
adds `approved-to-run`. The dispatch workflow uses a GitHub App token scoped to
the worker repository and its Actions permission; it links the worker run and
its result back to this Issue. The App must be installed and its client ID and
private key configured before that label can be used. Until then, the
maintainer manually starts the worker:

```sh
gh workflow run midscene-omarchy-4.0.3.yml \
  --repo quanru/doubao-say \
  --ref research/omarchy-plugin-visual-review \
  -f project=omarchy-plugin-smoke \
  -f plugin_repository=OWNER/REPOSITORY \
  -f plugin_sha=FULL_40_CHARACTER_SHA \
  -f plugin_id=MANIFEST_ID \
  -f plugin_open_method=open \
  -f visible_assertion='The expected surface is open and visible.'
```

After the run, review its test result, native HTML replay, screenshots, and
exact commit before posting a factual summary. A green visual assertion alone
does not establish that every control or persistence path works. Do not claim
Marketplace approval or security assurance.

The App needs only Actions write permission on `quanru/doubao-say` for dispatch.
This repository's own `GITHUB_TOKEN` reads the approved request and comments
back on it. The App does not host a desktop or give the plugin author access
to model credentials.

### Dispatch App setup

1. Create a GitHub App owned by `quanru` with **Actions: Read and write** as
   its only requested repository permission. It needs no webhook subscription.
2. Install it on **Selected repositories**, selecting only `doubao-say`.
3. Set this repository variable `REVIEW_DISPATCH_APP_CLIENT_ID` to the App's
   client ID. Store its generated private key as this repository secret
   `REVIEW_DISPATCH_APP_PRIVATE_KEY`.
4. After reviewing a valid request, add `approved-to-run`. The workflow first
   confirms that the plugin repository matches the linked official Issue and
   that the exact commit exists, then dispatches the worker. It posts the run
   and final status here. A maintainer inspects the native report before
   commenting on the official Issue.

Do not put a personal GitHub OAuth token in this public repository's Secrets.
