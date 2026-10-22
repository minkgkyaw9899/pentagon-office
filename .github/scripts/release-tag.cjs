function planRelease(branch, version, refs, sha) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('VERSION must contain X.Y.Z without a prefix, suffix, or leading zeroes.');
  }
  const channels = { develop: 'alpha', staging: 'beta', main: '' };
  if (!Object.hasOwn(channels, branch)) throw new Error('Releases require develop, staging, or main.');
  const channel = channels[branch];
  const prefix = `v${version}${channel ? '-' + channel + '.' : ''}`;
  const matches = refs.filter(r => {
    const name = r.ref.replace('refs/tags/', '');
    return channel ? name.startsWith(prefix) && /^[1-9]\d*$/.test(name.slice(prefix.length)) : name === prefix;
  });
  const existing = matches.find(r => r.sha === sha);
  if (existing) return { tag: existing.ref.replace('refs/tags/', ''), exists: true };
  if (!channel) {
    if (matches.length) throw new Error(`${prefix} already identifies another commit. Bump VERSION before the next stable release.`);
    return { tag: prefix, exists: false };
  }
  const max = matches.reduce((max, r) => {
    const number = BigInt(r.ref.replace('refs/tags/', '').slice(prefix.length));
    return number > max ? number : max;
  }, 0n);
  return { tag: prefix + (max + 1n), exists: false };
}
module.exports = { planRelease };
