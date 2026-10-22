const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const reportDirectory = path.join(root, '.coverage');
fs.mkdirSync(reportDirectory, { recursive: true });
const report = path.join(reportDirectory, 'lcov.info');
fs.rmSync(report, { force: true });
const tests = fs.readdirSync(__dirname).filter(name => name.endsWith('.test.cjs'))
  .map(name => path.join(__dirname, name));
if (!tests.length) throw new Error('No tests found.');
const sources = fs.readdirSync(__dirname).filter(name => name.startsWith('release-') && name.endsWith('.cjs') && !name.endsWith('.test.cjs'));
if (!sources.length) throw new Error('No production sources found.');
const result = spawnSync(process.execPath, [
  '--experimental-test-coverage',
  ...sources.map(source => `--test-coverage-include=**/.github/scripts/${source}`),
  '--test-coverage-lines=85.01',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', `--test-reporter-destination=${report}`,
  '--test', ...tests
], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const contents = fs.readFileSync(report, 'utf8');
for (const source of sources) {
  if (!contents.split('\n').some(line => line.startsWith('SF:') && line.endsWith('/' + source))) {
    throw new Error('Missing production source in coverage report: ' + source);
  }
}
const found = [...contents.matchAll(/^LF:(\d+)$/gm)].reduce((sum, match) => sum + Number(match[1]), 0);
const hit = [...contents.matchAll(/^LH:(\d+)$/gm)].reduce((sum, match) => sum + Number(match[1]), 0);
if (!found || hit / found <= 0.85) throw new Error('Measured production line coverage must be strictly greater than 85%.');
console.log(`Verified production line coverage: ${(100 * hit / found).toFixed(2)}% (${hit}/${found}).`);
