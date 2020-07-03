function rmQuery (theQuery, fullURL) {
  const allParams = new URLSearchParams(fullURL)

  if (allParams.has(theQuery)) { // Si el parametro existe
    const ourParam = allParams.get(theQuery)
    let cleanURL

    if (ourParam !== '') { // Si el parametro no está vacio
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
  } else return fullURL
}

function runTests (testArray) {
  testArray.forEach(searchText => {
    var removeText = rmQuery('fbclid', searchText)
    console.log('-', searchText, '===', removeText)
  })
}

try {
  var shouldChangeURL = false
  var locSearch = window.location.search
  const allParams = new URLSearchParams(window.location.search)

  if (allParams.has('fbclid') || allParams.has('gclid')) {
    locSearch = locSearch.replace(locSearch, rmQuery('fbclid', locSearch))
    locSearch = locSearch.replace(locSearch, rmQuery('gclid', locSearch))

    shouldChangeURL = true
  }

  if (shouldChangeURL) {
    console.log('replacedQueryURL', window.location.search, locSearch)
    history.replaceState({}, null, locSearch) // eslint-disable-line no-undef
  }
} catch (error) { // no-useless-catch
  console.error('Running in test mode only for fbclid')

  var testArray = [
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
