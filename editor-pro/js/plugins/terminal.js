const cp = require('child_process')
const rpc = require('vscode-jsonrpc')

let childProcess
let connection

let vtermServer = process.env.debug
  ? '/Users/loganhenson/vterm-server/vterm-server.js'
  : 'vterm-server';

const getEnv = async () => {
  const {stdout} = await execa(os.userInfo().shell, args, {env});
  return parseEnv(stdout);
};

export default {
  async ready(editor) {
    return new Promise(async (resolve, reject) => {
      childProcess = cp.spawn(vtermServer, {
        env: {...await getEnv(), LC_ALL: "en_US.UTF-8"},
      })
        .on('error', (err) => {
          reject(err)
        })

      connection = rpc.createMessageConnection(
        new rpc.StreamMessageReader(childProcess.stdout),
        new rpc.StreamMessageWriter(childProcess.stdin)
      )

      connection.listen()

      connection.onUnhandledNotification((e) => {
        console.log('unhandled', e)
      })

      connection.onError((e) => {
        console.log('error', e)
      })

      connection.onNotification(new rpc.NotificationType('output'), (e) => {
        editor.sendOutputToTerminal(e.message)
      })

      connection.onNotification(new rpc.NotificationType('resized'), (e) => {
        editor.sendResizedToTerminal(e.message)
      })

      connection.onRequest(new rpc.RequestType('window/showMessageRequest'), (e) => {
        new Notification('Terminal Server', {
          body: e.message,
        })
      })

      connection.onNotification(new rpc.NotificationType('window/logMessage'), (e) => {
        console.log('plugins:terminal:logMessage', e.message)
      })

      connection.sendRequest(new rpc.RequestType('initialize'), {
        processId: childProcess.pid,
        rootUri: editor.data.state.directory,
        capabilities: {
          workspace: {},
        },
        initializationOptions: {},
      }).then((response) => {
        connection.sendNotification(new rpc.NotificationType('initialized'))

        resolve()
      })
    })
  },
  async initialize(editor) {
    try {
      await this.ready(editor)
    } catch (e) {
      if (e.message.includes('ENOENT')) {
        throw Error('Is `vterm` in your PATH? Try running `npm install -g vterm`')
      }
    }

    this.registerHandlers(editor)
  },
  registerHandlers(editor) {
    editor.registerOnTerminalResize(({ height, width }) => {
      connection.sendRequest(new rpc.RequestType('resize'), { height, width })
    })

    editor.registerOnRequestRunTerminal(({ contents }) => {
      connection.sendRequest(new rpc.RequestType('run'), { contents })
    })
  }
}

const execa = require('execa');
const os = require('os');

const args = [
  '-ilc',
  'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit'
];

const env = {
  // Disables Oh My Zsh auto-update thing that can block the process.
  DISABLE_AUTO_UPDATE: 'true'
};

function ansiRegex({onlyFirst = false} = {}) {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
  ].join('|');

  return new RegExp(pattern, onlyFirst ? undefined : 'g');
}

function stripAnsi(string) {
  if (typeof string !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }

  return string.replace(ansiRegex(), '');
}

const parseEnv = env => {
  env = env.split('_SHELL_ENV_DELIMITER_')[1];
  const ret = {};

  for (const line of stripAnsi(env).split('\n').filter(line => Boolean(line))) {
    const [key, ...values] = line.split('=');
    ret[key] = values.join('=');
  }

  return ret;
};
