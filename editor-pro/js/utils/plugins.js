export {
  getPlugin,
  getPluginNameFromFilePath,
  elmOnly,
  phpOnly,
  javascriptOnly,
}

const pluginsList = {
  elm: 'elm',
  php: 'php',
  javascript: 'javascript',
  terminal: 'terminal',
}

function getPluginNameFromFilePath (filePath) {
  return [
    elmOnly(filePath, () => pluginsList.elm),
    phpOnly(filePath, () => pluginsList.php),
    javascriptOnly(filePath, () => pluginsList.javascript),
  ].find(plugin => plugin !== false)
}

function elmOnly (filePath, callback) {
  if (!filePath.endsWith('.elm')) {
    return false
  }

  return callback()
}

function javascriptOnly (filePath, callback) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) {
    return false
  }

  return callback()
}

function phpOnly (filePath, callback) {
  if (!filePath.endsWith('.php')) {
    return false
  }

  return callback()
}

async function getPlugin (name) {
  return import(`../plugins/${pluginsList[name]}.js`)
}
