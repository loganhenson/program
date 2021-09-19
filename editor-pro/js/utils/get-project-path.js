const path = require('path');

module.exports = (process) => {
  if (process.env.videdir) {
    return process.env.videdir
  }

  if (process.env.debug) {
    return process.cwd()
  }

  if (process.argv[1]) {
    return path.isAbsolute(process.argv[1])
      ? process.argv[1]
      : path.resolve(process.cwd(), process.argv[1])
  }

  return process.cwd()
}
