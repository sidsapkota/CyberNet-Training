# Google "G" logo (third-party brand asset)

`google-g.png` is Google's official "G" for Sign in with Google buttons. It's used only by
`src/components/account/GoogleSignInButton.tsx`. Don't edit, recolour, resize or redraw it.

- **Source:** Google's official sign-in assets,
  https://developers.google.com/static/identity/images/signin-assets.zip (downloaded 2026-09-30),
  linked from https://developers.google.com/identity/branding-guidelines.
- **What was done to it:** nothing to the artwork. The pack only ships the "G" inside whole buttons
  (and its SVGs draw the gradient with `foreignObject`, which Safari doesn't render in an `<img>`). So
  the file is Google's own `Android + Web/PNG @4x` icon-only square buttons, Light and Dark, cut to the
  logo's area (x and y 40 to 120, which is the 20px logo at 4x), with the button fill taken out: the
  same pixels on white and on `#131314` give back each pixel's exact colour and transparency.
  Re-composited onto either background it matches Google's PNGs to within 2/255 per channel.
- **Size:** 80 × 80 px, shown at 20 × 20 CSS px (Google's fixed logo size), so it stays sharp up to
  4x screens.
- A test (`GoogleSignInButton.test.ts`) pins the file's SHA-256, so any change is deliberate. If Google
  updates the logo, repeat the steps above from the new pack and update the hash.
