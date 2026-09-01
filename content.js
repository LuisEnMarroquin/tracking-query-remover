'use strict'

// Parameters whose names are unambiguously used for marketing attribution.
// Comparisons are case-insensitive so copied links are cleaned consistently.
const GLOBAL_EXACT_PARAMS = new Set([
  '__hsfp',
  '__hssc',
  '__hstc',
  '__s',
  '__twitter_impression',
  '_epik',
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  '_kx',
  '_openstat',
  'adj_adgroup',
  'adj_campaign',
  'adj_creative',
  'adj_label',
  'adj_network',
  'adj_reattribution',
  'adj_t',
  'af_ad',
  'af_ad_id',
  'af_ad_type',
  'af_adset',
  'af_adset_id',
  'af_c_id',
  'af_channel',
  'af_click_lookback',
  'af_cost_currency',
  'af_cost_model',
  'af_cost_value',
  'af_keywords',
  'af_prt',
  'af_reengagement_window',
  'af_siteid',
  'af_sub1',
  'af_sub2',
  'af_sub3',
  'af_sub4',
  'af_sub5',
  'af_web_id',
  'ck_subscriber_id',
  'cjevent',
  'clickref',
  'clickref2',
  'cmpid',
  'dclid',
  'dicbo',
  'ef_id',
  'elqtrack',
  'elqtrackid',
  'elqaid',
  'elqat',
  'elqcampaignid',
  'fb_action_ids',
  'fb_action_maps',
  'fb_action_types',
  'fb_ref',
  'fb_source',
  'fbclid',
  'gad_campaignid',
  'gad_source',
  'gbraid',
  'gclid',
  'gclsrc',
  'ga_campaign',
  'ga_content',
  'ga_medium',
  'ga_place',
  'ga_source',
  'ga_term',
  'hsctatracking',
  'hsenc',
  'irclickid',
  'irgwc',
  'li_fat_id',
  'mc_cid',
  'mc_eid',
  'mc_tc',
  'mkt_tok',
  'matomo_campaign',
  'matomo_keyword',
  'matomo_kwd',
  'ml_subscriber',
  'ml_subscriber_hash',
  'msclkid',
  'pk_campaign',
  'pk_keyword',
  'pk_kwd',
  'piwik_campaign',
  'piwik_keyword',
  'piwik_kwd',
  'qclid',
  'rb_clickid',
  'rdt_cid',
  's_cid',
  'sccid',
  'soc_src',
  'soc_trk',
  'sscid',
  'srsltid',
  'tblci',
  'tracking_source',
  'ttclid',
  'twclid',
  'vero_conv',
  'vero_id',
  'wbraid',
  'wickedid',
  'yclid',
  'ysclid',
  'zanpid',
  '~campaign',
  '~channel',
  '~feature',
  '~stage',
  '~tags'
])

const GLOBAL_PARAM_PREFIXES = [
  'hsa_',
  'mtm_',
  'oly_',
  'sfmc_',
  'utm_',
  'vero_'
]

// These identifiers can be required to open preference, unsubscribe, or
// browser-view pages from an email. They remain removable everywhere else.
const EMAIL_FUNCTIONAL_PARAMS = new Set([
  '_hsenc',
  '_hsmi',
  '_kx',
  'ck_subscriber_id',
  'hsctatracking',
  'hsenc',
  'mc_cid',
  'mc_eid',
  'mc_tc',
  'mkt_tok',
  'ml_subscriber',
  'ml_subscriber_hash'
])

// Only compound route names are matched. Bare words such as "preferences" or
// "subscriptions" appear on ordinary application pages and used to keep email
// identifiers alive far outside the flows that need them.
const EMAIL_ROUTE_PATTERN = /(?:^|[\/_-])(?:unsubscrib(?:e|ed|ing)|opt[-_]?outs?|email[-_]?(?:preferences?|settings|subscriptions?|webview)|manage[-_]?(?:preferences?|subscriptions?|email)|subscription[-_]?(?:center|preferences?)|notification[-_]?preferences?|communication[-_]?preferences?|mailing[-_]?preferences?|update[-_]?profile|profile[-_]?center|view[-_]?in[-_]?browser|web[-_]?version)(?:[\/_-]|$)/i

const EMAIL_ROUTE_QUERY_KEYS = [ 'action', 'display', 'mode', 'page', 'view' ]

// `subdomains` restricts a rule to the hosts that actually serve the pages the
// parameters belong to. Without it, generic names such as `tag`, `ref` or
// `client` are stripped from unrelated properties on the same registered
// domain, for example aws.amazon.com or docs.google.com.
const DOMAIN_RULES = [
  {
    domains: [ 'youtube.com' ],
    exact: [
      'embeds_referring_euri',
      'embeds_referring_origin',
      'feature',
      'kw',
      'pp',
      'si',
      'source_ve_path'
    ]
  },
  {
    domains: [ 'spotify.com' ],
    exact: [ 'dlsi', 'nd', 'si' ]
  },
  {
    domains: [ 'instagram.com' ],
    exact: [ 'igsh', 'igshid' ]
  },
  {
    domains: [ 'reddit.com' ],
    exact: [
      'correlation_id',
      'rdt',
      'ref_campaign',
      'ref_source',
      'share_id'
    ]
  },
  {
    domains: [ 'twitter.com', 'x.com' ],
    exact: [ 'cn', 'cxt', 'mx', 'ref_src', 'ref_url', 's', 'src', 't' ]
  },
  {
    domains: [ 'facebook.com', 'messenger.com' ],
    exact: [
      '__cft__',
      '__tn__',
      'acontext',
      'comment_tracking',
      'epa',
      'fref',
      'hc_location',
      'hc_ref',
      'mibextid',
      'notif_id',
      'notif_t',
      'paipv',
      'pnref',
      'ref',
      'refsrc',
      'sfnsn'
    ]
  },
  {
    // `eid`, `midToken` and `midSig` resolve the destination of LinkedIn email
    // links, so they are kept even though they also carry attribution.
    domains: [ 'linkedin.com' ],
    exact: [
      'ebp',
      'lipi',
      'originalsubdomain',
      'refid',
      'trackingid',
      'trk',
      'trkinfo'
    ]
  },
  {
    domains: [ 'pinterest.com' ],
    exact: [ 'pp', 'source_url' ]
  },
  {
    domains: [
      'amazon.ae',
      'amazon.ca',
      'amazon.co.jp',
      'amazon.co.uk',
      'amazon.com',
      'amazon.com.au',
      'amazon.com.be',
      'amazon.com.br',
      'amazon.com.mx',
      'amazon.de',
      'amazon.eg',
      'amazon.es',
      'amazon.fr',
      'amazon.in',
      'amazon.it',
      'amazon.nl',
      'amazon.pl',
      'amazon.sa',
      'amazon.se',
      'amazon.sg',
      'amazon.com.tr'
    ],
    subdomains: [ 'www', 'smile', 'm' ],
    exact: [
      'ascsubtag',
      'camp',
      'creative',
      'creativeasin',
      'crid',
      'dib',
      'dib_tag',
      'linkcode',
      'qid',
      'ref',
      'sr',
      'sprefix',
      'tag'
    ],
    prefixes: [ 'pd_rd_', 'pf_rd_' ]
  },
  {
    // `var` selects the variation of a multi-variation listing, so removing it
    // would send shared links to the default option instead.
    domains: [
      'ebay.at',
      'ebay.be',
      'ebay.ca',
      'ebay.ch',
      'ebay.co.uk',
      'ebay.com',
      'ebay.com.au',
      'ebay.com.hk',
      'ebay.com.my',
      'ebay.com.sg',
      'ebay.de',
      'ebay.es',
      'ebay.fr',
      'ebay.ie',
      'ebay.it',
      'ebay.nl',
      'ebay.ph',
      'ebay.pl'
    ],
    subdomains: [ 'www', 'm' ],
    exact: [
      'campid',
      'customid',
      'media',
      'mkcid',
      'mkevt',
      'mkgroupid',
      'mkrid',
      'toolid'
    ]
  },
  {
    domains: [
      'google.ae',
      'google.at',
      'google.be',
      'google.ca',
      'google.ch',
      'google.cl',
      'google.co.id',
      'google.co.il',
      'google.co.in',
      'google.co.jp',
      'google.co.kr',
      'google.co.nz',
      'google.co.th',
      'google.co.uk',
      'google.co.za',
      'google.com',
      'google.com.ar',
      'google.com.au',
      'google.com.br',
      'google.com.co',
      'google.com.eg',
      'google.com.hk',
      'google.com.mx',
      'google.com.pe',
      'google.com.ph',
      'google.com.sa',
      'google.com.sg',
      'google.com.tr',
      'google.com.tw',
      'google.com.ua',
      'google.com.uy',
      'google.com.vn',
      'google.cz',
      'google.de',
      'google.dk',
      'google.es',
      'google.fi',
      'google.fr',
      'google.gr',
      'google.hu',
      'google.ie',
      'google.it',
      'google.nl',
      'google.no',
      'google.pl',
      'google.pt',
      'google.ro',
      'google.ru',
      'google.se'
    ],
    subdomains: [ 'www', 'books', 'images', 'maps', 'news', 'scholar', 'shopping', 'video' ],
    exact: [
      'aqs',
      'bih',
      'biw',
      'bvm',
      'client',
      'dpr',
      'ei',
      'gs_lcrp',
      'iflsig',
      'oq',
      'sa',
      'sca_esv',
      'sclient',
      'sourceid',
      'uact',
      'ved'
    ]
  },
  {
    domains: [ 'bing.com' ],
    subdomains: [ 'www', 'cn' ],
    exact: [ 'cvid', 'form', 'ghacc', 'ghpl', 'ghsh', 'lq', 'pq', 'qs', 'sc', 'sk', 'sp' ]
  }
]

const DISABLED_HOSTS_KEY = 'disabledHosts'

// Browsers without the Navigation API do not report history.pushState() calls
// made by the page, so the address bar is polled instead.
const URL_POLL_INTERVAL_MS = 500

function hostMatchesDomain (hostname, domain, subdomains) {
  if (hostname === domain) return true
  if (!hostname.endsWith(`.${domain}`)) return false
  if (!subdomains) return true

  return subdomains.includes(hostname.slice(0, -(domain.length + 1)))
}

function ruleMatchesHost (rule, hostname) {
  return rule.domains.some(domain => hostMatchesDomain(hostname, domain, rule.subdomains))
}

function isEmailActionUrl (url) {
  if (EMAIL_ROUTE_PATTERN.test(url.pathname)) return true

  return EMAIL_ROUTE_QUERY_KEYS.some(key => {
    const value = url.searchParams.get(key)
    return value !== null && EMAIL_ROUTE_PATTERN.test(value)
  })
}

function matchesPrefixes (name, prefixes) {
  return prefixes.some(prefix => name.startsWith(prefix))
}

function shouldRemoveParam (rawName, url, emailAction = isEmailActionUrl(url)) {
  const name = rawName.toLowerCase()

  if (emailAction && EMAIL_FUNCTIONAL_PARAMS.has(name)) return false
  if (GLOBAL_EXACT_PARAMS.has(name)) return true
  if (matchesPrefixes(name, GLOBAL_PARAM_PREFIXES)) return true

  const hostname = url.hostname.toLowerCase()

  return DOMAIN_RULES.some(rule => {
    if (!ruleMatchesHost(rule, hostname)) return false

    const exact = rule.exact || []
    const prefixes = rule.prefixes || []
    return exact.includes(name) || matchesPrefixes(name, prefixes)
  })
}

function decodeParamName (rawName) {
  try {
    return decodeURIComponent(rawName.replace(/\+/g, ' '))
  } catch (error) {
    return rawName
  }
}

function normalizeHost (hostname) {
  return hostname.toLowerCase().replace(/^www\./, '')
}

function isDisabledHost (hostname, disabledHosts) {
  if (!Array.isArray(disabledHosts) || disabledHosts.length === 0) return false

  const host = normalizeHost(hostname)

  return disabledHosts.some(entry => {
    const disabled = normalizeHost(String(entry))
    return disabled !== '' && (host === disabled || host.endsWith(`.${disabled}`))
  })
}

function cleanUrl (input) {
  const unchanged = { changed: false, removed: [], url: input }
  let url

  try {
    url = new URL(input)
  } catch (error) {
    return unchanged
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return unchanged
  if (url.search === '') return unchanged

  const emailAction = isEmailActionUrl(url)
  const removed = []
  const keptParams = url.search.slice(1).split('&').filter(rawParam => {
    if (rawParam === '') return false

    const name = decodeParamName(rawParam.split('=', 1)[0])

    if (!shouldRemoveParam(name, url, emailAction)) return true
    if (!removed.includes(name)) removed.push(name)
    return false
  })

  if (removed.length === 0) return unchanged

  url.search = keptParams.length > 0 ? `?${keptParams.join('&')}` : ''

  return {
    changed: true,
    removed,
    url: url.href
  }
}

function cleanCurrentUrl () {
  const result = cleanUrl(window.location.href)

  if (!result.changed) return result

  try {
    history.replaceState(history.state, '', result.url)
  } catch (error) {
    // Documents with an opaque origin, such as sandboxed pages, reject history
    // updates. The page is left untouched instead of throwing.
  }

  return result
}

function readDisabledHosts (callback) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      callback([])
      return
    }

    chrome.storage.local.get({ [DISABLED_HOSTS_KEY]: [] }, items => {
      const failed = chrome.runtime && chrome.runtime.lastError
      callback(failed ? [] : items[DISABLED_HOSTS_KEY])
    })
  } catch (error) {
    callback([])
  }
}

function watchDisabledHosts (callback) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) return

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[DISABLED_HOSTS_KEY]) return
      callback(changes[DISABLED_HOSTS_KEY].newValue || [])
    })
  } catch (error) {
    // Storage events are optional; the current setting still applies.
  }
}

function startUrlCleaner () {
  // Cleaning stays off until the stored site list is known, so a disabled site
  // never gets its address bar rewritten on the way in.
  let enabled = false
  let cleanupScheduled = false
  let lastSeenUrl = window.location.href

  const applyDisabledHosts = disabledHosts => {
    enabled = !isDisabledHost(window.location.hostname, disabledHosts)
  }

  const cleanNow = () => {
    if (enabled) cleanCurrentUrl()
    lastSeenUrl = window.location.href
  }

  const scheduleCleanup = () => {
    if (cleanupScheduled) return
    cleanupScheduled = true

    queueMicrotask(() => {
      cleanupScheduled = false
      cleanNow()
    })
  }

  readDisabledHosts(disabledHosts => {
    applyDisabledHosts(disabledHosts)
    cleanNow()
  })

  watchDisabledHosts(disabledHosts => {
    applyDisabledHosts(disabledHosts)
    cleanNow()
  })

  window.addEventListener('popstate', scheduleCleanup)
  window.addEventListener('hashchange', scheduleCleanup)

  if (window.navigation && typeof window.navigation.addEventListener === 'function') {
    window.navigation.addEventListener('navigatesuccess', scheduleCleanup)
    return
  }

  // Polling replaces a document-wide MutationObserver here: it costs nothing on
  // busy pages and it also catches history.pushState() calls that never touch
  // the DOM, which the observer used to miss entirely.
  setInterval(() => {
    if (document.visibilityState === 'hidden') return
    if (window.location.href === lastSeenUrl) return

    lastSeenUrl = window.location.href
    scheduleCleanup()
  }, URL_POLL_INTERVAL_MS)
}

if (typeof window !== 'undefined' && typeof history !== 'undefined') {
  try {
    startUrlCleaner()
  } catch (error) {
    // A content script failure must never take the host page down with it.
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cleanUrl,
    decodeParamName,
    hostMatchesDomain,
    isDisabledHost,
    isEmailActionUrl,
    normalizeHost,
    shouldRemoveParam
  }
}
