const assert = require('node:assert/strict');
const { planRelease } = require('./release-tag.cjs');
const ref = (tag, sha = 'old') => ({ref:'refs/tags/'+tag, sha});
let count = 0;
function check(branch, refs, expected) {
  assert.deepEqual(planRelease(branch,'0.1.0',refs,'head'),expected); count++;
}
check('develop',[],{tag:'v0.1.0-alpha.1',exists:false});
check('staging',[],{tag:'v0.1.0-beta.1',exists:false});
check('main',[],{tag:'v0.1.0',exists:false});
check('develop',[ref('v0.1.0-alpha.9'),ref('v0.1.0-alpha.10'),ref('v0.1.0-alpha.2')],{tag:'v0.1.0-alpha.11',exists:false});
check('staging',[ref('v0.1.0-alpha.99'),ref('v0.1.0-beta.2'),ref('v0.2.0-beta.9')],{tag:'v0.1.0-beta.3',exists:false});
check('develop',[ref('v0.1.0-alpha.0'),ref('v0.1.0-alpha.01'),ref('v0.1.0-alpha.1.extra'),ref('v0.1.0-alpha.abc')],{tag:'v0.1.0-alpha.1',exists:false});
check('develop',[ref('v0.1.0-alpha.9007199254740992')],{tag:'v0.1.0-alpha.9007199254740993',exists:false});
check('develop',[ref('v0.1.0-alpha.3','head'),ref('v0.1.0-alpha.5')],{tag:'v0.1.0-alpha.3',exists:true});
check('main',[ref('v0.1.0','head')],{tag:'v0.1.0',exists:true});
assert.throws(()=>planRelease('main','0.1.0',[ref('v0.1.0')],'head')); count++;
for (const version of ['', 'v1.2.3', '1.2', '01.2.3', '1.02.3', '1.2.03', '1.2.3-alpha', '1.2.3+build', ' 1.2.3', '1.2.3\n', '-1.2.3', '1.2.3/other']) {
  assert.throws(() => planRelease('main',version,[],'head')); count++;
}
for (const branch of ['feat/task', 'hotfix/task', 'constructor', '__proto__']) {
  assert.throws(() => planRelease(branch,'0.1.0',[],'head')); count++;
}
console.log(`${count} release numbering cases passed`);
