const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');

const script = path.resolve('.github/scripts/apply-upstream-update.sh');
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'upstream-update-test-'));
const git = (...args) => cp.execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (name, content) => {
  const dest = path.join(repo, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
};
const apply = (revision, expectedStatus) => {
  const result = cp.spawnSync('bash', [script, revision], { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, expectedStatus, result.stderr);
  return result;
};

git('init', '-b', 'main');
git('config', 'user.name', 'Test');
git('config', 'user.email', 'test@example.invalid');
put('rules.txt', 'a\nb\nc\nd\ne\nf\n');
put('binary.bin', Buffer.from([0, 1, 2, 3]));
put('.github/workflows/existing.yml', 'name: old\n');
git('add', '-A');
git('commit', '-m', 'base');
const base = git('rev-parse', 'HEAD');
git('checkout', '-b', 'upstream');
put('rules.txt', 'a\nb\nc\nd\ne\nf upstream\n');
put('binary.bin', Buffer.from([0, 9, 8, 7]));
put('.github/workflows/existing.yml', 'name: updated\n');
put('.github/workflows/new.yml', 'name: added\n');
put('new.txt', 'new upstream file\n');
git('add', '-A');
git('commit', '-m', 'upstream');
const upstream = git('rev-parse', 'HEAD');
git('checkout', 'main');
put('rules.txt', 'a local\nb\nc\nd\ne\nf\n');
put('.upstream-sync/last-upstream-commit', base + '\n');
git('add', '-A');
git('commit', '-m', 'local');

const result = apply(upstream, 0);
assert.equal(fs.readFileSync(path.join(repo, 'rules.txt'), 'utf8'), 'a local\nb\nc\nd\ne\nf upstream\n');
assert.deepEqual(fs.readFileSync(path.join(repo, 'binary.bin')), Buffer.from([0, 9, 8, 7]));
assert.equal(fs.readFileSync(path.join(repo, '.github/workflows/existing.yml'), 'utf8'), 'name: old\n');
assert(!fs.existsSync(path.join(repo, '.github/workflows/new.yml')));
assert.equal(fs.readFileSync(path.join(repo, '.upstream-sync/workflows/existing.yml'), 'utf8'), 'name: updated\n');
assert(fs.existsSync(path.join(repo, '.upstream-sync/workflows/new.yml')));
assert(result.stdout.includes('::warning::'));
assert.equal(git('diff', '--cached', '--name-only', '--', '.github/workflows'), '');
assert.equal(fs.readFileSync(path.join(repo, '.upstream-sync/last-upstream-commit'), 'utf8').trim(), upstream);
git('commit', '-m', 'sync');
apply(upstream, 0);
assert.equal(git('status', '--porcelain'), '');

git('checkout', 'upstream');
put('rules.txt', 'a upstream conflict\nb\nc\nd\ne\nf upstream\n');
git('add', 'rules.txt');
git('commit', '-m', 'conflict');
const conflicting = git('rev-parse', 'HEAD');
git('checkout', 'main');
assert.notEqual(cp.spawnSync('bash', [script, conflicting], { cwd: repo }).status, 0);
assert.equal(git('diff', '--name-only', '--diff-filter=U'), 'rules.txt');
console.log('Upstream update tests passed: local changes, binary updates, deferred workflows, no-op and conflict handling.');
