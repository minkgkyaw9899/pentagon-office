function releaseTag(branch, version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('Version must be X.Y.Z without a prefix, suffix, or leading zeroes.');
  }
  const suffix = { develop: '-alpha', staging: '-beta', main: '' };
  if (!Object.hasOwn(suffix, branch)) throw new Error('Release tags require develop, staging, or main.');
  return `v${version}${suffix[branch]}`;
}
module.exports = { releaseTag };
