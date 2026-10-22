const { planRelease } = require('./release-tag.cjs');

module.exports = async function releaseRuntime(github, context, core) {
const event = context.payload.workflow_run;
const statusEvent = context.eventName === 'status' ? context.payload : null;
const branches = event ? [event.head_branch] : statusEvent ? (statusEvent.branches || []).map(b => b.name) : [context.ref.replace('refs/heads/', '')];
const sha = event ? event.head_sha : statusEvent ? statusEvent.sha : context.sha;
if (event && (event.event !== 'push' || event.repository?.full_name !== `${context.repo.owner}/${context.repo.repo}`)) return;
for (const branch of [...new Set(branches)].filter(b => ['develop','staging','main'].includes(b))) {
  await releaseBranch(branch,sha);
}
async function releaseBranch(branch,sha) {
const params = context.repo;
const wait = message => core.notice('No tag created: ' + message);
const currentTip = async () => (await github.rest.git.getRef({...params,ref:`heads/${branch}`})).data.object.sha;
if (await currentTip() !== sha) return wait('branch has advanced beyond this commit.');
const pulls = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit,{...params,commit_sha:sha,per_page:100});
if (!pulls.some(pr => pr.merged_at && pr.base.ref === branch && pr.merge_commit_sha === sha)) {
  return wait('this commit is not a completed PR merge into the delivery branch.');
}
const checks = await github.paginate(github.rest.checks.listForRef,{...params,ref:sha,per_page:100});
for (const name of ['Code quality','Coverage >85%']) {
  if (!checks.some(c => c.name === name && c.status === 'completed' && c.conclusion === 'success' && c.app?.slug === 'github-actions')) {
    return wait(`waiting for a successful ${name} check on ${sha}.`);
  }
}
for (const check of checks.filter(c => c.name !== 'Create release tag')) {
  if (check.status !== 'completed' || check.conclusion !== 'success') return wait(`${check.name} is not successful.`);
}
const statuses = await github.paginate(github.rest.repos.listCommitStatusesForRef,{...params,ref:sha,per_page:100});
const latest = new Map();
for (const status of [...statuses].sort((a,b) => a.id-b.id)) latest.set(status.context,status);
for (const status of latest.values()) {
  if (status.state !== 'success') return wait(`${status.context} is ${status.state}.`);
}
const {data: file} = await github.rest.repos.getContent({...params,path:'VERSION',ref:sha});
if (Array.isArray(file) || file.type !== 'file' || file.encoding !== 'base64') throw new Error('VERSION must be a regular text file.');
const version = Buffer.from(file.content,'base64').toString('utf8').trim();
// Validate VERSION before using it in an API path.
planRelease(branch,version,[],sha);
const rawRefs = await github.paginate(github.rest.git.listMatchingRefs,{...params,ref:`tags/v${version}`,per_page:100});
const refs = [];
for (const ref of rawRefs) {
  let object = ref.object;
  while (object.type === 'tag') object = (await github.rest.git.getTag({...params,tag_sha:object.sha})).data.object;
  refs.push({ref:ref.ref,sha:object.type === 'commit' ? object.sha : null});
}
const plan = planRelease(branch,version,refs,sha);
if (plan.exists) return core.notice(`${plan.tag} already identifies ${sha}; no change needed.`);
if (await currentTip() !== sha) return wait('branch advanced while evaluating release readiness.');
await github.rest.git.createRef({...params,ref:`refs/tags/${plan.tag}`,sha});
core.notice(`Created ${plan.tag} at ${sha}.`);
await core.summary.addHeading('Automatic release tag').addTable([
  [{data:'Branch',header:true},{data:'Tag',header:true},{data:'Commit',header:true}],
  [branch,plan.tag,sha]
]).write();

}
};
