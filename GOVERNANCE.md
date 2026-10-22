# Repository governance

## Delivery branches

- `feat/*` -> `develop` (including feature branches from forks).
- Same-repository `develop` -> `staging` -> `main`.
- `hotfix/*` -> `staging` or `main`.
- Direct pushes, force pushes and deletion are blocked on all three delivery branches, including for administrators. There are no bypass actors.
- Keep the long-lived promotion branches; after a hotfix, reconcile the fix into the next feature/promotion cycle.

## Reviews

The authorized reviewer is currently `@minkgkyaw9899`. Every PR from another author, including hotfixes, needs that person's approval of its current head commit. Owner-authored PRs are exempt from the approval requirement, but must pass every other gate. Hotfixes currently require one authorized approval; two-person approval is deferred until a second authorized reviewer exists. All review threads must be resolved. CODEOWNERS also identifies the owner for native review requests.

The governance workflow runs trusted base/default-branch code without checking out PR code. The review event workflow has no permissions; its completion triggers a trusted policy evaluation. Approvals are reevaluated on new commits and review changes. CI completion and commit statuses also refresh policy. The policy job checks both the PR head and its test merge commit when present. A failed, skipped, cancelled, neutral or pending reported check blocks the policy status.

## Required CI and security

All three delivery branches require these GitHub Actions checks:

- `Repository policy`: allowed branch route, authorized approval, and all reported checks successful.
- `Code quality`: the application CI must run its real lint, type and quality gates under this exact job name.
- `Coverage >85%`: the application CI must run real tests and fail unless measured line coverage is strictly greater than 85 percent. Missing coverage, empty coverage, failed tests and failed coverage uploads must fail this job.

CodeQL results are required with no outstanding code scanning alerts. CodeQL default setup is enabled. GitHub may wait to run analysis until supported application source exists.

Copilot automatic reviews target `staging` and `main`, including new pushes, excluding drafts. Review requests depend on GitHub Copilot eligibility and available credits. Copilot is not an authorized substitute for the owner's human approval.

## Bootstrap limitations

The initial repository contains skills and documentation, with no application, test suite or build manifest. Therefore no application quality/coverage checks are fabricated. Required application CI checks intentionally remain missing and prevent merges until real CI is added. No claim of 85 percent coverage has been made.

GitHub's native Code Quality setup API currently returns `Code quality is not available for this repository`. Native Code Quality and coverage rules, if accepted by the rules API, still need this feature enabled and actual coverage uploads before they can evaluate application changes. The required `Coverage >85%` CI gate must wait for the coverage upload; native coverage rules alone do not wait for reports. GitHub documents native Code Quality as requiring GitHub Team or Enterprise Cloud.

The repository owner authorized a one-time governance bootstrap on `main`, followed by creation/protection of `develop` and `staging`. Future changes follow the PR flow above. Since the required application gates have no producers yet, enabling the first application CI may need a deliberate owner-managed bootstrap; do not disable protections or invent passing results to conceal that limitation.

## Release tags

Use **Actions -> Release tag -> Run workflow**, select the delivery branch, and enter a plain semantic version such as `1.2.3`:

| Branch | Tag |
| --- | --- |
| `develop` | `v1.2.3-alpha` |
| `staging` | `v1.2.3-beta` |
| `main` | `v1.2.3` |

This is an explicit release action, not a tag on every merge. The repository has no application version manifest yet, so the release version is an input. Only stable `X.Y.Z` inputs are accepted; the workflow adds the prefix and branch suffix. No initial release version is assumed.

The workflow tags the selected delivery branch's dispatch commit only if it is still the current branch head. Application `Code quality` and `Coverage >85%` checks must have succeeded at that commit; all other reported checks/statuses must also be successful. No quality results are fabricated. PR checks alone do not satisfy checks on a different post-merge commit: application CI needs push triggers on all delivery branches.

Tags are immutable: a retry for a tag already pointing to the same commit succeeds without changes; reusing the same tag for a different commit fails. Release tag protections also prohibit updates and deletion of `v[0-9]*` tags. Repeated alpha/beta releases require a new version under this exact-name convention; numbered prereleases can be introduced separately if needed. No GitHub Release object or package publication is created. Tags created with `GITHUB_TOKEN` do not trigger downstream tag-push workflows.

The release workflow becomes available for dispatch after it reaches the default branch through the normal promotion PRs. The existing application CI/Code Quality/CodeQL blockers must be resolved before those PRs can merge or release tags can be created.
