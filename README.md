# Tracking query remover

A Chrome and Firefox extension that removes the following trackers from URLs query

Facebook
* fbclid

Google
* gclid
* utm_source
* utm_medium
* utm_campaign
* utm_term
* utm_content

This extension is not designed to hide from the website you are visiting with the tracking queries (you can see in Network tab on DevTools that request is done before the extension removes the query), but is intended for the user to see a cleaner url to share or save it to a document. I would like to add this feature on a future release, if you have the time to, send a pull request

## Tests

You can test without a web browser using **NodeJS** running

```shell
node content.js
```

Or you can test that it changes the url visiting this `https://blog.marroquin.dev/tests/?fbclid=FBFBFB&couponCode=COCOCO&gclid=GCGCGC`

In order to test this extension:

For Chrome at `chrome://extensions`, enabled **Developer mode** and clicked **Load unpacked**

For Firefox at `about:debugging#/runtime/this-firefox` clicked **Load Temporary Add-on…**

## Links

Some links that may help you if you are also new to building extensions

* [Manifest File Format](https://developer.chrome.com/extensions/manifest)

## Icon

The icon was created with **Gimp** on a 16x16 pixels square with size 1 Pencil, you can edit by openning [icon.xcf](icon.xcf)

## Package extension

For Chrome at `chrome://extensions` click **Pack extension** and it will generate your **Packed** (`.crx`) and **Key** (`.pem`) files.

As a reminder for me, I saved my key at **G2** on `KEYS` folder
