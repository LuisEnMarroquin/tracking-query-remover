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

const EMAIL_ROUTE_PATTERN = /(?:^|[\/_-])(email[-_]?preferences?|manage[-_]?subscriptions?|preferences?|subscriptions?|unsubscrib(?:e|ed)|view[-_]?in[-_]?browser|email[-_]?webview)(?:[\/_-]|$)/i

const DOMAIN_RULES = [
  {
    domains: [ 'youtube.com', 'youtu.be' ],
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
    domains: [ 'reddit.com', 'redd.it' ],
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
    domains: [ 'facebook.com', 'fb.com', 'messenger.com' ],
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
    domains: [ 'linkedin.com' ],
    exact: [
      'ebp',
      'eid',
      'lipi',
      'midsig',
      'midtoken',
      'originalsubdomain',
      'refid',
      'trackingid',
      'trk',
      'trkinfo'
    ]
  },
  {
    domains: [ 'pinterest.com', 'pin.it' ],
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
      'amazon.com.tr',
      'amzn.to'
    ],
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
    domains: [
      'ebay.at',
      'ebay.be',
      'ebay.ca',
      'ebay.ch',
      'ebay.co.uk',
      'ebay.com',
      'ebay.com.au',
      'ebay.de',
      'ebay.es',
      'ebay.fr',
      'ebay.ie',
      'ebay.it',
      'ebay.nl',
      'ebay.pl'
    ],
    exact: [
      'campid',
      'customid',
      'media',
      'mkcid',
      'mkevt',
      'mkgroupid',
      'mkrid',
      'toolid',
      'var'
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
      'google.com.sa',
      'google.com.sg',
      'google.com.tr',
      'google.com.tw',
      'google.com.uy',
      'google.de',
      'google.dk',
      'google.es',
      'google.fi',
      'google.fr',
      'google.ie',
      'google.it',
      'google.nl',
      'google.no',
      'google.pl',
      'google.pt',
      'google.se'
    ],
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
    exact: [ 'cvid', 'form', 'ghacc', 'ghpl', 'ghsh', 'lq', 'pq', 'qs', 'sc', 'sk', 'sp' ]
  }
]

function hostMatchesDomain (hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function ruleMatchesHost (rule, hostname) {
  return rule.domains.some(domain => hostMatchesDomain(hostname, domain))
}

function isEmailActionUrl (url) {
  if (EMAIL_ROUTE_PATTERN.test(url.pathname)) return true

  return [ 'action', 'display', 'page', 'view' ].some(key => {
    const value = url.searchParams.get(key)
    return value !== null && EMAIL_ROUTE_PATTERN.test(value)
  })
}

function matchesPrefixes (name, prefixes) {
  return prefixes.some(prefix => name.startsWith(prefix))
}

function shouldRemoveParam (rawName, url) {
  const name = rawName.toLowerCase()

  if (isEmailActionUrl(url) && EMAIL_FUNCTIONAL_PARAMS.has(name)) return false
  if (GLOBAL_EXACT_PARAMS.has(name)) return true
  if (matchesPrefixes(name, GLOBAL_PARAM_PREFIXES)) return true

  return DOMAIN_RULES.some(rule => {
    if (!ruleMatchesHost(rule, url.hostname.toLowerCase())) return false

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

function cleanUrl (input) {
  let url

  try {
    url = new URL(input)
  } catch (error) {
    return { changed: false, removed: [], url: input }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { changed: false, removed: [], url: input }
  }

  const removed = []
  const rawParams = url.search === '' ? [] : url.search.slice(1).split('&')
  const keptParams = rawParams.filter(rawParam => {
    if (rawParam === '') return false

    const rawName = rawParam.split('=', 1)[0]
    const name = decodeParamName(rawName)

    if (!shouldRemoveParam(name, url)) return true
    if (!removed.includes(name)) removed.push(name)
    return false
  })

  if (removed.length > 0) {
    url.search = keptParams.length > 0 ? `?${keptParams.join('&')}` : ''
  }

  return {
    changed: removed.length > 0,
    removed,
    url: url.href
  }
}

function cleanCurrentUrl () {
  const result = cleanUrl(window.location.href)

  if (result.changed) {
    history.replaceState(history.state, document.title, result.url)
  }

  return result
}

function startUrlCleaner () {
  let cleanupScheduled = false
  let lastSeenUrl = window.location.href

  const scheduleCleanup = () => {
    if (cleanupScheduled) return
    cleanupScheduled = true

    queueMicrotask(() => {
      cleanupScheduled = false
      lastSeenUrl = window.location.href
      cleanCurrentUrl()
      lastSeenUrl = window.location.href
    })
  }

  cleanCurrentUrl()
  lastSeenUrl = window.location.href

  window.addEventListener('popstate', scheduleCleanup)
  window.addEventListener('hashchange', scheduleCleanup)

  if (window.navigation && typeof window.navigation.addEventListener === 'function') {
    window.navigation.addEventListener('navigatesuccess', scheduleCleanup)
    return
  }

  // Watching DOM changes provides a low-impact fallback in browsers without
  // the Navigation API when SPAs update the URL with history.pushState().
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastSeenUrl) scheduleCleanup()
  })

  const observeDocument = () => {
    if (!document.documentElement) return
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }

  if (document.documentElement) {
    observeDocument()
  } else {
    document.addEventListener('readystatechange', observeDocument, { once: true })
  }
}

if (typeof window !== 'undefined' && typeof history !== 'undefined') {
  startUrlCleaner()
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cleanUrl,
    decodeParamName,
    hostMatchesDomain,
    isEmailActionUrl,
    shouldRemoveParam
  }
}
