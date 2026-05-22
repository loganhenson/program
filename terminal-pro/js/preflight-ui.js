import { invoke } from '@tauri-apps/api/core'
import { exit } from '@tauri-apps/plugin-process'

const ROOT_ID = 'preflight-root'

export function gate(report, onPass) {
  if (report.all_ok) {
    onPass()
    return
  }
  render(report, onPass)
}

function render(report, onPass) {
  let root = document.getElementById(ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = ROOT_ID
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      background: '#1e1e1e',
      color: '#d4d4d4',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
      overflow: 'auto',
      zIndex: '99999',
    })
    document.body.appendChild(root)
  }
  root.innerHTML = ''

  const card = document.createElement('div')
  Object.assign(card.style, {
    maxWidth: '640px',
    margin: '60px auto',
    padding: '32px',
    background: '#262626',
    border: '1px solid #3a3a3a',
    borderRadius: '8px',
  })

  const heading = document.createElement('h1')
  heading.textContent = 'Missing dependencies'
  Object.assign(heading.style, { margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' })
  card.appendChild(heading)

  const subhead = document.createElement('p')
  subhead.textContent = "We couldn't find some of the tools this app needs. Install each missing item below, then click Recheck."
  Object.assign(subhead.style, { margin: '0 0 24px 0', color: '#aaaaaa' })
  card.appendChild(subhead)

  for (const result of report.results) {
    card.appendChild(renderResult(result))
  }

  const buttonRow = document.createElement('div')
  Object.assign(buttonRow.style, { display: 'flex', gap: '12px', marginTop: '24px' })

  const recheckBtn = button('Recheck', '#2b6cb0')
  recheckBtn.onclick = async () => {
    recheckBtn.disabled = true
    recheckBtn.textContent = 'Checking…'
    try {
      const fresh = await invoke('preflight')
      if (fresh.all_ok) {
        root.remove()
        onPass()
      } else {
        render(fresh, onPass)
      }
    } catch (e) {
      recheckBtn.disabled = false
      recheckBtn.textContent = 'Recheck'
      console.error('preflight invocation failed', e)
    }
  }
  buttonRow.appendChild(recheckBtn)

  const quitBtn = button('Quit', '#444')
  quitBtn.onclick = () => exit(0)
  buttonRow.appendChild(quitBtn)

  card.appendChild(buttonRow)
  root.appendChild(card)
}

function renderResult(result) {
  const row = document.createElement('div')
  Object.assign(row.style, {
    padding: '12px 0',
    borderTop: '1px solid #333',
  })

  const isOk = result.status.kind === 'ok'

  const titleLine = document.createElement('div')
  Object.assign(titleLine.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '500',
  })

  const icon = document.createElement('span')
  icon.textContent = isOk ? '✓' : '✗'
  Object.assign(icon.style, {
    color: isOk ? '#2bb36b' : '#e06c75',
    fontWeight: '700',
    fontSize: '16px',
    width: '16px',
    textAlign: 'center',
  })
  titleLine.appendChild(icon)

  const label = document.createElement('span')
  label.textContent = result.label
  titleLine.appendChild(label)

  row.appendChild(titleLine)

  if (!isOk) {
    const detail = document.createElement('div')
    detail.textContent = describeStatus(result.status)
    Object.assign(detail.style, { color: '#aaaaaa', margin: '6px 0 8px 26px', fontSize: '13px' })
    row.appendChild(detail)

    for (const cmd of result.install_commands) {
      row.appendChild(installRow(cmd))
    }

    if (result.docs_url) {
      const docs = document.createElement('a')
      docs.href = result.docs_url
      docs.textContent = result.docs_url
      docs.target = '_blank'
      Object.assign(docs.style, {
        display: 'block',
        marginLeft: '26px',
        color: '#5d9ed8',
        fontSize: '12px',
        textDecoration: 'none',
      })
      row.appendChild(docs)
    }
  }

  return row
}

function describeStatus(status) {
  switch (status.kind) {
    case 'missing':
      return 'Not found on this system. Install it with the command below:'
    case 'bad_version':
      return `Found version ${status.found}, but ${status.required} is required.`
    case 'error':
      return `Probe error: ${status.message}`
    default:
      return ''
  }
}

function installRow(cmd) {
  const wrapper = document.createElement('div')
  Object.assign(wrapper.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '6px 0 4px 26px',
  })

  const code = document.createElement('code')
  code.textContent = cmd
  Object.assign(code.style, {
    flex: '1',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    padding: '6px 10px',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontSize: '12px',
    color: '#e0e0e0',
    userSelect: 'text',
    whiteSpace: 'nowrap',
    overflow: 'auto',
  })
  wrapper.appendChild(code)

  const copy = button('Copy', '#3a3a3a')
  Object.assign(copy.style, { padding: '4px 10px', fontSize: '12px' })
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(cmd)
      copy.textContent = 'Copied'
      setTimeout(() => (copy.textContent = 'Copy'), 1500)
    } catch (e) {
      copy.textContent = 'Failed'
      console.error('clipboard write failed', e)
    }
  }
  wrapper.appendChild(copy)

  return wrapper
}

function button(text, bg) {
  const btn = document.createElement('button')
  btn.textContent = text
  Object.assign(btn.style, {
    background: bg,
    color: '#ffffff',
    border: '0',
    borderRadius: '4px',
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  })
  return btn
}
