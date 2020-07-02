# Tracking query remover

A Chrome extension that removes `gclid` and `fbclid` from url query

This extension is not designed to hide from the website you are visiting with the tracking queries (you can see in Network tab on DevTools that request is done before the extension removes the query), but is intended for the user to see a cleaner url to share or save to a document. I would like to add this feature on a future release but this is my first Chrome extension and this is what I came out with

## Tests

You can test without Chrome using **NodeJS** running

```shell
node content.js
```

Or you can test that it changes the url visiting this `https://blog.marroquin.dev/tests/?fbclid=FBFBFB&couponCode=COCOCO&gclid=GCGCGC`

In order to test this extension I went to [chrome://extensions](chrome://extensions), enabled **Developer mode** and **Load unpacked**

## Links

Some links that may help you if you are also new to building extensions

* [Manifest File Format](https://developer.chrome.com/extensions/manifest)

## Icons

The icon was created with **Gimp** on a 16x16 pixels square with size 1 Pencil

## Build

On [chrome://extensions](chrome://extensions) click **Pack extension** and it will generate your Packed (`.crx`) and Key (`.pem`) files.

As a reminder for me, I saved my key at **G2** on `KEYS` folder