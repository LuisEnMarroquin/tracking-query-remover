'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { cleanUrl, isDisabledHost, normalizeHost } = require('../content.js')

test('removes global trackers and preserves functional parameters and fragments', () => {
  const result = cleanUrl('https://example.com/watch?v=42&utm_source=newsletter&gclid=abc#chapter-2')

  assert.equal(result.url, 'https://example.com/watch?v=42#chapter-2')
  assert.deepEqual(result.removed, [ 'utm_source', 'gclid' ])
})

test('does not leave an empty query marker when every parameter is removed', () => {
  const result = cleanUrl('https://example.com/article?utm_source=email&#details')

  assert.equal(result.url, 'https://example.com/article#details')
})

test('removes encoded and duplicate tracker values without corrupting the URL', () => {
  const result = cleanUrl('https://example.com/?fbclid=a%2Fb&coupon=SAVE&fbclid=second')

  assert.equal(result.url, 'https://example.com/?coupon=SAVE')
  assert.deepEqual(result.removed, [ 'fbclid' ])
})

test('preserves the raw encoding of parameters that remain', () => {
  const result = cleanUrl('https://example.com/?signature=a%2Fb%20c%2Bz&q=%7e%2f%3a&utm_source=email#result')

  assert.equal(result.url, 'https://example.com/?signature=a%2Fb%20c%2Bz&q=%7e%2f%3a#result')
})

test('matches tracker names case-insensitively', () => {
  const result = cleanUrl('https://example.com/?UTM_Source=email&ScCid=snap&keep=yes')

  assert.equal(result.url, 'https://example.com/?keep=yes')
})

test('removes supported tracking prefixes', () => {
  const result = cleanUrl('https://example.com/?utm_custom=x&mtm_placement=hero&hsa_cam=123&sfmc_id=456&keep=yes')

  assert.equal(result.url, 'https://example.com/?keep=yes')
})

test('removes mobile and affiliate attribution while preserving deep-link destinations', () => {
  const result = cleanUrl('https://example.com/open?adj_campaign=sale&af_siteid=publisher&%7Echannel=social&irclickid=click&deep_link_value=product-42')

  assert.equal(result.url, 'https://example.com/open?deep_link_value=product-42')
})

test('applies generic parameter names only to their known domains', () => {
  const youtube = cleanUrl('https://www.youtube.com/watch?v=abc&t=90&si=tracker&feature=shared')
  const example = cleanUrl('https://example.com/?si=required&feature=enabled&t=90')

  assert.equal(youtube.url, 'https://www.youtube.com/watch?v=abc&t=90')
  assert.equal(example.url, 'https://example.com/?si=required&feature=enabled&t=90')
})

test('supports subdomains without matching lookalike hostnames', () => {
  const valid = cleanUrl('https://m.facebook.com/story.php?story_fbid=1&id=2&mibextid=tracking')
  const lookalike = cleanUrl('https://notfacebook.com/?mibextid=required')

  assert.equal(valid.url, 'https://m.facebook.com/story.php?story_fbid=1&id=2')
  assert.equal(lookalike.url, 'https://notfacebook.com/?mibextid=required')
})

test('removes affiliate attribution only on matching shopping domains', () => {
  const amazon = cleanUrl('https://www.amazon.com/dp/ABC?tag=affiliate-20&linkCode=abc&th=1')
  const example = cleanUrl('https://example.com/product?tag=important&linkCode=required')
  const lookalike = cleanUrl('https://amazon.evil.com/product?tag=important')

  assert.equal(amazon.url, 'https://www.amazon.com/dp/ABC?th=1')
  assert.equal(example.url, 'https://example.com/product?tag=important&linkCode=required')
  assert.equal(lookalike.url, 'https://amazon.evil.com/product?tag=important')
})

test('preserves email identifiers on unsubscribe and preference routes', () => {
  const unsubscribe = cleanUrl('https://email.example.com/unsubscribe?mkt_tok=needed&utm_source=email')
  const preferences = cleanUrl('https://email.example.com/account?action=manage-subscription&_kx=needed&fbclid=tracking')

  assert.equal(unsubscribe.url, 'https://email.example.com/unsubscribe?mkt_tok=needed')
  assert.equal(preferences.url, 'https://email.example.com/account?action=manage-subscription&_kx=needed')
})

test('removes email attribution outside protected routes', () => {
  const result = cleanUrl('https://example.com/article?mkt_tok=tracker&_kx=identity&slug=clean-urls')

  assert.equal(result.url, 'https://example.com/article?slug=clean-urls')
})

test('leaves authentication and application parameters intact', () => {
  const url = 'https://example.com/callback?code=abc&state=xyz&token=123&id=7&q=search'

  assert.deepEqual(cleanUrl(url), { changed: false, removed: [], url })
})

test('does not modify unsupported or malformed URLs', () => {
  assert.deepEqual(cleanUrl('file:///tmp/page.html?utm_source=test'), {
    changed: false,
    removed: [],
    url: 'file:///tmp/page.html?utm_source=test'
  })
  assert.deepEqual(cleanUrl('not a URL'), {
    changed: false,
    removed: [],
    url: 'not a URL'
  })
})

test('returns the original input untouched when nothing is removed', () => {
  const url = 'https://EXAMPLE.com/Path?keep=1'

  assert.deepEqual(cleanUrl(url), { changed: false, removed: [], url })
})

test('keeps the eBay listing variation while removing partner attribution', () => {
  const result = cleanUrl('https://www.ebay.com/itm/123?var=987&mkcid=1&campid=5338&toolid=10001')

  assert.equal(result.url, 'https://www.ebay.com/itm/123?var=987')
})

test('limits shopping rules to storefront subdomains', () => {
  const aws = 'https://aws.amazon.com/ec2/pricing/?tag=team-a&ref=nav&qid=1'
  const sellerCentral = 'https://sellercentral.amazon.com/inventory?tag=mytag&sr=1'
  const storefront = cleanUrl('https://smile.amazon.com/dp/ABC?tag=affiliate-20&th=1')

  assert.deepEqual(cleanUrl(aws), { changed: false, removed: [], url: aws })
  assert.deepEqual(cleanUrl(sellerCentral), { changed: false, removed: [], url: sellerCentral })
  assert.equal(storefront.url, 'https://smile.amazon.com/dp/ABC?th=1')
})

test('limits search rules to search subdomains', () => {
  const docs = 'https://docs.google.com/spreadsheets/d/ID/edit?gid=0&client=abc'
  const search = cleanUrl('https://www.google.com/search?q=test&client=firefox-b-d&ei=X&ved=Y')
  const russia = cleanUrl('https://www.google.ru/search?q=test&sourceid=chrome')
  const bingApp = 'https://edgeservices.bing.com/edgesvc?form=ABC&q=test'

  assert.deepEqual(cleanUrl(docs), { changed: false, removed: [], url: docs })
  assert.equal(search.url, 'https://www.google.com/search?q=test')
  assert.equal(russia.url, 'https://www.google.ru/search?q=test')
  assert.deepEqual(cleanUrl(bingApp), { changed: false, removed: [], url: bingApp })
})

test('keeps the identifiers that resolve LinkedIn email links', () => {
  const result = cleanUrl('https://www.linkedin.com/comm/mynetwork/invite?midToken=AQ&midSig=SIG&eid=abc&trk=eml-x&utm_source=email')

  assert.equal(result.url, 'https://www.linkedin.com/comm/mynetwork/invite?midToken=AQ&midSig=SIG&eid=abc')
})

test('does not treat ordinary application routes as email flows', () => {
  const subscriptions = cleanUrl('https://www.youtube.com/feed/subscriptions?mkt_tok=tracker&v=1')
  const settings = cleanUrl('https://app.example.com/settings/preferences?mc_eid=tracker&tab=general')

  assert.equal(subscriptions.url, 'https://www.youtube.com/feed/subscriptions?v=1')
  assert.equal(settings.url, 'https://app.example.com/settings/preferences?tab=general')
})

test('protects the email routes used by mail providers', () => {
  const routes = [
    'https://mail.example.com/email-preferences?mkt_tok=needed',
    'https://mail.example.com/subscription-center?mc_eid=needed',
    'https://mail.example.com/notification_preferences?_kx=needed',
    'https://mail.example.com/view-in-browser?mc_cid=needed',
    'https://mail.example.com/x?mode=opt-out&mkt_tok=needed'
  ]

  for (const route of routes) {
    const result = cleanUrl(`${route}&utm_source=email`)

    assert.equal(result.url, route, route)
  }
})

test('ignores link shorteners that only redirect to a cleaned destination', () => {
  const shortLink = 'https://youtu.be/abc?si=tracker'

  assert.deepEqual(cleanUrl(shortLink), { changed: false, removed: [], url: shortLink })
})

test('normalizes hosts and matches disabled sites including their subdomains', () => {
  assert.equal(normalizeHost('WWW.Example.com'), 'example.com')

  assert.equal(isDisabledHost('www.example.com', [ 'example.com' ]), true)
  assert.equal(isDisabledHost('shop.example.com', [ 'example.com' ]), true)
  assert.equal(isDisabledHost('example.com', [ 'www.example.com' ]), true)
  assert.equal(isDisabledHost('notexample.com', [ 'example.com' ]), false)
  assert.equal(isDisabledHost('example.com', []), false)
  assert.equal(isDisabledHost('example.com', [ '' ]), false)
})
