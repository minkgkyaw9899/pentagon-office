const assert = require('node:assert/strict');
const { releaseTag } = require('./release-tag.cjs');
let count = 0;
for (const [branch, expected] of [['develop', 'v1.2.3-alpha'], ['staging', 'v1.2.3-beta'], ['main', 'v1.2.3']]) {
  assert.equal(releaseTag(branch, '1.2.3'), expected); count++;
}
for (const version of ['', 'v1.2.3', '1.2', '01.2.3', '1.02.3', '1.2.03', '1.2.3-alpha', '1.2.3+build', ' 1.2.3', '1.2.3\n', '-1.2.3', '1.2.3/other']) {
  assert.throws(() => releaseTag('main', version)); count++;
}
for (const branch of ['feat/task', 'hotfix/task', 'constructor', '__proto__']) {
  assert.throws(() => releaseTag(branch, '1.2.3')); count++;
}
assert.equal(releaseTag('main', '0.0.0'), 'v0.0.0'); count++;
console.log(`${count} release-tag cases passed`);
