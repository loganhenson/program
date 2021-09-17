const fs = require('fs').promises

const cliLinkPath = '/usr/local/bin/vterm'
const vtermPath = '/Applications/vterm.app/Contents/Resources/app/scripts/vterm.sh'

module.exports = async () => {
  return fs.symlink(vtermPath, cliLinkPath);
};
