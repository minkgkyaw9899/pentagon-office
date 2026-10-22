const fs = require('node:fs');
const path = require('node:path');
const { planRelease } = require('./release-tag.cjs');
const releaseRuntime = require('./release-runtime.cjs');

const workflowPath = path.join(__dirname, '../workflows/release-tag.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const marker = '          script: |\n';
if (!workflow.includes(marker)) throw new Error('Release workflow script marker is missing.');
const script = `${planRelease.toString()}\nawait (${releaseRuntime.toString()})(github, context, core);\n`;
const generated = workflow.split(marker)[0] + marker + script.split('\n')
  .filter((line, index, lines) => index !== lines.length - 1 || line !== '')
  .map(line => `            ${line}\n`).join('');
if (process.argv.includes('--check')) {
  if (generated !== workflow) throw new Error('Run node .github/scripts/sync-release-workflow.cjs and commit the generated workflow.');
  console.log('Release workflow matches the tested production modules.');
} else {
  fs.writeFileSync(workflowPath, generated);
}
