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

module.exports = async () => {
    const {stdout} = await execa(os.userInfo().shell, args, {env});
    return parseEnv(stdout);
};
