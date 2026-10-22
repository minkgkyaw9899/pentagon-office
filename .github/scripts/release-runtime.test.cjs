const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yamlPath = fs.existsSync(path.join(__dirname, '../workflows/release-tag.yml'))
  ? path.join(__dirname, '../workflows/release-tag.yml') : path.join(__dirname, 'release-tag.yml');
const script = fs.readFileSync(yamlPath, 'utf8').split('          script: |\n')[1]
  .split('\n').map(line => line.slice(12)).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('github', 'context', 'core', script);
function fixture(options = {}) {
  const writes = [];
  const checks = ['Code quality', 'Coverage >85%'].map(name => ({name,status:'completed',conclusion:'success',app:{slug:'github-actions'}}));
  const github = {rest: {git: {
    getRef: async ({ref}) => {
      if (ref.startsWith('heads/')) return {data:{object:{sha: options.moved ? 'new-head' : 'head'}}};
      if (options.existing) return {data:{object:{type:options.annotated?'tag':'commit',sha:options.existing}}};
      throw Object.assign(new Error('Not found'),{status:404});
    },
    getTag: async () => ({data:{object:{type:'commit',sha:'head'}}}),
    createRef: async args => { writes.push(args); }
  },checks:{listForRef:'checks'},repos:{listCommitStatusesForRef:'statuses'}},
  paginate: async endpoint => endpoint === 'checks' ? options.checks || checks : options.statuses || []};
  const context = {ref:options.ref || 'refs/heads/develop',sha:'head',repo:{owner:'owner',repo:'repo'}};
  const summary = {addHeading:()=>summary,addTable:()=>summary,write:async()=>{}};
  return {github,context,core:{notice:()=>{},summary},writes};
}
(async () => {
  process.env.RELEASE_VERSION = '1.2.3';
  let count = 0;
  for (const [branch, tag] of [['develop','v1.2.3-alpha'],['staging','v1.2.3-beta'],['main','v1.2.3']]) {
    const f=fixture({ref:'refs/heads/'+branch}); await run(f.github,f.context,f.core);
    assert.equal(f.writes[0].ref,'refs/tags/'+tag); assert.equal(f.writes[0].sha,'head'); count++;
  }
  for (const options of [{moved:true},{ref:'refs/tags/v1.2.3'},{ref:'refs/heads/feat/task'},{checks:[]},{checks:[{name:'Lint',status:'completed',conclusion:'failure'}]},{statuses:[{id:1,context:'external',state:'pending'}]},{existing:'other-head'}]) {
    const f=fixture(options); await assert.rejects(run(f.github,f.context,f.core)); assert.equal(f.writes.length,0); count++;
  }
  for (const options of [{existing:'head'},{existing:'tag-object',annotated:true}]) {
    const f=fixture(options); await run(f.github,f.context,f.core); assert.equal(f.writes.length,0); count++;
  }
  console.log(`${count} release-runtime cases passed`);
})().catch(error => {console.error(error);process.exitCode=1;});
