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
- `Code quality`: ESLint checks the repository automation JavaScript, actionlint checks all workflows, and the generated release workflow must match the tested production modules. Application lint/type gates must be added when application code exists.
- `Coverage >85%`: real tests measure the release production modules using Node V8 coverage, excluding test files. Every discovered release production module must appear in the LCOV report. The job enforces a minimum of 85.01% line coverage, checks that measured coverage is strictly greater than 85%, and saves the report as an artifact. Failed tests, missing sources/reports, and failed artifact uploads fail the job. This is coverage of current release automation, not coverage of a future application; expand the source scope and test tooling when application code is added.

CodeQL results are required with no outstanding code scanning alerts. Advanced CodeQL analysis scans `.github/scripts` as JavaScript/TypeScript on PRs and protected-branch pushes. Bundled skill examples are outside this scan scope. The previously failing default setup is disabled so it does not conflict with the committed advanced workflow.

Copilot automatic reviews target `staging` and `main`, including new pushes, excluding drafts. Review requests depend on GitHub Copilot eligibility and available credits. Copilot is not an authorized substitute for the owner's human approval.

## Bootstrap limitations

The initial repository had only skills and documentation. This PR adds real CI for the release automation it introduces: lint/workflow validation, 54 behavioral cases, and measured production-source coverage. Both quality jobs run on PRs and delivery-branch pushes. No future application coverage is claimed.

GitHub's native Code Quality setup API currently returns `Code quality is not available for this repository`. Native Code Quality and coverage rules, if accepted by the rules API, still need this feature enabled and actual coverage uploads before they can evaluate application changes. The required `Coverage >85%` CI gate must wait for the coverage upload; native coverage rules alone do not wait for reports. GitHub documents native Code Quality as requiring GitHub Team or Enterprise Cloud.

The repository owner authorized a one-time governance bootstrap on `main`, followed by creation/protection of `develop` and `staging`. Future changes follow the PR flow above. The native Code Quality entitlement remains a separate prerequisite; passing Actions checks do not activate that GitHub feature.

## Release tags

The base release version is stored in the root `VERSION` file, initially `0.1.0`. Change it through a feature PR and promote the same version through delivery branches.

After a PR merge into a delivery branch, tags are generated automatically once application quality/coverage and every reported check/status on the resulting commit have succeeded:

| Branch | Tag sequence for VERSION 0.1.0 |
| --- | --- |
| `develop` | `v0.1.0-alpha.1`, `v0.1.0-alpha.2`, ... |
| `staging` | `v0.1.0-beta.1`, `v0.1.0-beta.2`, ... |
| `main` | `v0.1.0` |

Alpha and beta counters are independent for each base version. The next number is one above the highest matching existing tag, compared numerically. Reruns for a commit already tagged in that channel reuse the existing tag. Stable tags never move: bump `VERSION` before a subsequent stable release. A main hotfix therefore needs its own patch version bump, such as `0.1.1`.

The workflow starts on delivery-branch pushes and reevaluates readiness when push CI workflows finish or commit statuses change. Incomplete or failed checks create no release tag. Only a completed PR merge commit at the current delivery branch tip is eligible. If the branch advances before a pending release is ready, that older commit is skipped; the current tip is considered on its own push/CI events. This deliberately avoids issuing delayed releases for superseded commits.

Application `Code quality` and `Coverage >85%` checks must run on delivery-branch pushes, because PR checks on a different commit do not prove the post-merge commit. The workflow reads `VERSION` at the exact candidate SHA using the GitHub API; it never checks out or executes PR code. Same-branch release runs are serialized. No GitHub Release object or package publication is created. GITHUB_TOKEN-created tags do not trigger downstream tag-push workflows.

Version tags matching `v[0-9]*` are protected against updates/deletion. An optional **Actions -> Release tags -> Run workflow** retries the selected delivery branch using the committed VERSION; it does not accept an arbitrary version override.

The workflow must reach the default branch through promotion PRs for CI-completion/status callbacks to activate. Passing real quality/coverage and CodeQL results are required; native Code Quality availability remains a separate repository prerequisite. No release tags are fabricated during setup.
