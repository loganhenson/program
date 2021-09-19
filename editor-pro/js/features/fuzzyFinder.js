const execa = require('execa')
const os = require('os')

export default {
  async findInProjectFileOrDirectory (directory, fileOrDirectoryName) {
    return new Promise(async (resolve, reject) => {
      const args = [
        `\*${fileOrDirectoryName}\*`,
        directory,
        '--hidden',
        '--glob',
        '--no-ignore',
        '--exclude=vendor',
        '--exclude=elm-stuff',
        '--exclude=.git',
        '--exclude=.idea',
        '--exclude=node_modules',
      ];

      try {
        const {stdout} = await execa("fd", args);

        resolve(getOutput(stdout));
      } catch (error) {
        console.log(error)
        if (error.errno === "ENOENT") {
          reject("The 'fd' cli is not available. Install fd.")
        } else if (typeof error === "string") {
          resolve([]);
        }
      }
    })
  },
  async findProject (projectName) {
    return new Promise(async (resolve, reject) => {
      const home = os.homedir()
      const args = [
        "--type=d",
        "--max-depth=3",
        `--full-path`,
        `${home}/(Desktop|Sites)/${projectName}([^/]*)$`,
        home,
      ];

      try {
        const {stdout} = await execa("fd", args);

        resolve(getOutput(stdout));
      } catch (error) {
        console.log(error)
        if (error.errno === "ENOENT") {
          reject("The 'fd' cli is not available. Install Php.")
        } else if (typeof error === "string") {
          resolve([]);
        }
      }
    })
  },
}

function getOutput(output) {
  return output.split("\n").map((line) => {
    return line;
  });
}
