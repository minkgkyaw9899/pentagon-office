const assert = require('node:assert/strict');
const run = require('./release-runtime.cjs');
const required = ['Code quality','Coverage >85%'].map(name=>({name,status:'completed',conclusion:'success',app:{slug:'github-actions'}}));
function fixture(options={}) {
  const writes=[], notices=[];
  let reads=0;
  const context={ref:'refs/heads/'+(options.branch||'develop'),sha:'head',eventName:options.eventName||'push',payload:options.payload||{},repo:{owner:'owner',repo:'repo'}};
  const github={rest:{git:{
    getRef:async()=>({data:{object:{sha:options.moved || (options.moveDuring && reads++>0) ? 'new-head':'head'}}}),
    listMatchingRefs:'refs',
    getTag:async()=>({data:{object:{type:'commit',sha:'head'}}}),
    createRef:async args=>{writes.push(args);}
  },repos:{
    listPullRequestsAssociatedWithCommit:'pulls',listCommitStatusesForRef:'statuses',
    getContent:async args=>{ assert.equal(args.ref,'head'); return {data:{type:'file',encoding:'base64',content:Buffer.from(options.version||'0.1.0\n').toString('base64')}}; }
  },checks:{listForRef:'checks'}},paginate:async endpoint=>{
    if(endpoint==='checks') return options.checks||required;
    if(endpoint==='statuses') return options.statuses||[];
    if(endpoint==='refs') return options.refs||[];
    if(endpoint==='pulls') return options.pulls||[{merged_at:'today',base:{ref:options.branch||'develop'},merge_commit_sha:'head'}];
    throw Error('Unexpected endpoint');
  }};
  const summary={addHeading:()=>summary,addTable:()=>summary,write:async()=>{}};
  return {github,context,core:{notice:m=>notices.push(m),summary},writes,notices};
}
async function execute(options){const f=fixture(options);await run(f.github,f.context,f.core);return f;}
const ref=(tag,sha='old',type='commit')=>({ref:'refs/tags/'+tag,object:{type,sha}});
(async()=>{
  let count=0;
  for(const [branch,tag] of [['develop','v0.1.0-alpha.1'],['staging','v0.1.0-beta.1'],['main','v0.1.0']]) {
    const f=await execute({branch});assert.equal(f.writes[0].ref,'refs/tags/'+tag);assert.equal(f.writes[0].sha,'head');count++;
  }
  let f=await execute({refs:[ref('v0.1.0-alpha.9'),ref('v0.1.0-alpha.10')]});assert.equal(f.writes[0].ref,'refs/tags/v0.1.0-alpha.11');count++;
  for(const options of [{moved:true},{moveDuring:true},{branch:'feat/task'},{pulls:[]},{pulls:[{merged_at:null,base:{ref:'develop'},merge_commit_sha:'head'}]},{pulls:[{merged_at:'today',base:{ref:'main'},merge_commit_sha:'head'}]},{checks:[]},{checks:required.slice(0,1)},{checks:[...required,{name:'Lint',status:'completed',conclusion:'failure'}]},{checks:[...required,{name:'Lint',status:'in_progress'}]},{statuses:[{id:1,context:'external',state:'pending'}]}]) {
    f=await execute(options);assert.equal(f.writes.length,0);count++;
  }
  for(const refs of [[ref('v0.1.0-alpha.3','head')],[ref('v0.1.0-alpha.3','annotated','tag')]]) {
    f=await execute({refs});assert.equal(f.writes.length,0);count++;
  }
  for(const options of [{branch:'main',refs:[ref('v0.1.0')]},{version:'0.1.0-alpha.1'},{version:'../invalid'}]) {
    f=fixture(options);await assert.rejects(run(f.github,f.context,f.core));assert.equal(f.writes.length,0);count++;
  }
  const workflowRun={head_branch:'develop',head_sha:'head',event:'push',repository:{full_name:'owner/repo'}};
  f=await execute({eventName:'workflow_run',payload:{workflow_run:workflowRun}});assert.equal(f.writes.length,1);count++;
  for(const event of [{...workflowRun,event:'pull_request'},{...workflowRun,head_branch:'feat/task'},{...workflowRun,repository:{full_name:'fork/repo'}}]) {
    f=await execute({eventName:'workflow_run',payload:{workflow_run:event}});assert.equal(f.writes.length,0);count++;
  }
  f=await execute({eventName:'status',payload:{sha:'head',branches:[{name:'develop'},{name:'develop'}]}});assert.equal(f.writes.length,1);count++;
  f=await execute({eventName:'status',payload:{sha:'head',branches:[{name:'feat/task'}]}});assert.equal(f.writes.length,0);count++;
  f=await execute({checks:[...required,{name:'Create release tag',status:'in_progress'}]});assert.equal(f.writes.length,1);count++;
  f=await execute({statuses:[{id:1,context:'external',state:'failure'},{id:2,context:'external',state:'success'}]});assert.equal(f.writes.length,1);count++;
  console.log(`${count} automatic-release runtime cases passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
