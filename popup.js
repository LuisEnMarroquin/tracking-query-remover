'use strict'

const DISABLED_HOSTS_KEY = 'disabledHosts'

const hostLabel = document.getElementById('host')
const controls = document.getElementById('controls')
const toggle = document.getElementById('toggle')
const note = document.getElementById('note')

function normalizeHost (hostname) {
  return hostname.toLowerCase().replace(/^www\./, '')
}

function readCurrentHost (callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs && tabs[0]

    if (!tab || !tab.url) {
      callback(null)
      return
    }

    try {
      const url = new URL(tab.url)
      const supported = url.protocol === 'http:' || url.protocol === 'https:'
      callback(supported ? normalizeHost(url.hostname) : null)
    } catch (error) {
      callback(null)
    }
  })
}

function saveDisabledHosts (host, disabled) {
  chrome.storage.sync.get({ [DISABLED_HOSTS_KEY]: [] }, items => {
    const stored = items[DISABLED_HOSTS_KEY].filter(entry => normalizeHost(String(entry)) !== host)
    const disabledHosts = disabled ? stored.concat(host) : stored

    chrome.storage.sync.set({ [DISABLED_HOSTS_KEY]: disabledHosts }, () => {
      note.hidden = false
    })
  })
}

readCurrentHost(host => {
  if (host === null) {
    hostLabel.textContent = 'This page cannot be cleaned.'
    return
  }

  hostLabel.textContent = host

  chrome.storage.sync.get({ [DISABLED_HOSTS_KEY]: [] }, items => {
    const disabled = items[DISABLED_HOSTS_KEY].some(entry => normalizeHost(String(entry)) === host)

    toggle.checked = !disabled
    controls.hidden = false
    toggle.addEventListener('change', () => saveDisabledHosts(host, !toggle.checked))
  })
})
