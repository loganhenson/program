const fs = require('fs').promises

const cliLinkPath = '/usr/local/bin/vide'
const videPath = '/Applications/vide.app/Contents/Resources/app/scripts/vide.sh'

module.exports = async () => {
  return fs.symlink(videPath, cliLinkPath);
};
