function rmQuery (theQuery, fullURL) {
  const allParams = new URLSearchParams(fullURL)
  if (allParams.has(theQuery)) { // If param exists
    const ourParam = allParams.get(theQuery)
    let cleanURL
    if (ourParam !== '') { // If param is not empty
      let replac1 = fullURL.replace(`&${theQuery}=${ourParam}`, '')
      let replac2 = replac1.replace(`${theQuery}=${ourParam}`, '')
      cleanURL = replac2
    } else {
      let replac1 = fullURL.replace(`&${theQuery}=`, '')
      let replac2 = replac1.replace(`&${theQuery}`, '')
      let replac3 = replac2.replace(`${theQuery}=`, '')
      let replac4 = replac3.replace(`${theQuery}`, '')
      cleanURL = replac4
    }
    let finalURL = cleanURL.replace(`?&`, '?')
    return finalURL
  } else {
    return fullURL
  }
}

function runTests (testArray) {
  testArray.forEach(searchText => {
    let removeText = rmQuery('fbclid', searchText)
    console.log('-', searchText, '===', removeText)
  })
}

try {
  let extsInURL = []
  let locSearch = window.location.search
  const allParams = new URLSearchParams(window.location.search)
  const exts = [ 'gclid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content' ]

  exts.forEach(ext => {
    let isAtURL = allParams.has(ext)
    extsInURL.push(isAtURL)
  })

  if (extsInURL.includes(true)) {
    exts.forEach(extension => {
      locSearch = locSearch.replace(locSearch, rmQuery(extension, locSearch))
    })
    console.log('replacedQueryURL', window.location.search, locSearch)
    history.replaceState({}, null, locSearch) // eslint-disable-line no-undef
  }
} catch (error) { // no-useless-catch
  console.error('Running in test mode only for fbclid')

  let testArray = [
    '?fbclid=LALA&coupon=XDXD',
    '?coupon=XDXD&fbclid=LALA',
    '?fbclid=LALA',
    '?coupon=XDXD&fbclid=',
    '?coupon=XDXD&fbclid',
    '?fbclid=',
    '?fbclid',
    '?coupon=XDXD',
    '?',
    ''
  ]

  runTests(testArray)
}
