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
that repository. Until a narrowly scoped GitHub App dispatches that worker,
the maintainer manually starts it after checking the public request:

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

The future App needs access only to read approved review requests, dispatch
the worker workflow, and post evidence links. It will not host a desktop or
give the plugin author access to model credentials.
