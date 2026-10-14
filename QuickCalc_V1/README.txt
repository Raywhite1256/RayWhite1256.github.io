# QuickCalc V1 — Android-first project

## Files
- `index.html` — app layout
- `style.css` — light theme and responsive styling
- `script.js` — calculator, scientific functions, and history
- `manifest.json` — installable web-app settings
- `icon-192.png` and `icon-512.png` — app icons

## Part A — Test on your Android phone
1. Extract `QuickCalc_V1.zip` using your phone's Files app or a ZIP utility.
2. Install a code editor such as Acode from its official Play Store listing.
3. In Acode, open the extracted `QuickCalc_V1` folder and open `index.html`.
4. Use Acode's Preview option (or open `index.html` in a browser). If local preview blocks some features, use a local preview/server option in the editor.
5. Test: `12 + 8 = 20`; `9 × 7 = 63`; `10 ÷ 0` should show an error; enable `ƒx`, then test `sin(30)` = `0.5`, `sqrt(81)` = `9`, and `log(100)` = `2`.
6. Tap ↺ to see history, tap a past result to reuse it, and use Clear all to remove history.

The history is stored locally by the browser/WebView. Clearing app/browser data can erase it. Scientific trigonometry uses degrees.

## Part B — Prepare for Play Store
This ZIP is the app's web source, NOT an Android APK/AAB yet. A signed Android App Bundle must be built and tested separately.

### Most beginner-friendly phone-first route
1. Host the app on HTTPS (for example, GitHub Pages). Upload `index.html`, `style.css`, `script.js`, `manifest.json`, `icon-192.png`, and `icon-512.png` to the published site root.
2. Open the live HTTPS URL on your phone and test it again. The browser's local preview is not enough for packaging.
3. Use the official PWABuilder site (`https://www.pwabuilder.com/`) and enter the published URL. Follow its Android packaging workflow if available for your app and current account/device setup.
4. Read the generated package instructions carefully. If the service provides an AAB, download it; if it provides only source/APK, you still need a compatible Android build environment to generate a signed AAB. Do not upload an APK where Play Console asks for an AAB.
5. In Google Play Console, create the app, complete the store listing, content rating, Data safety and privacy-policy requirements that apply, upload the signed AAB to an internal testing release, and test before production submission.

### Important
- Publishing requires a Google Play Console developer account and applicable registration fee.
- Google Play requirements change. Check current target API, testing, identity verification, privacy and app-signing requirements inside Play Console before submitting.
- If the packaging tool requires a developer signing key or desktop build environment, don't share your private key/password with anyone. Save a backup securely.
- This app does not intentionally collect or send calculator inputs to a server. If you add analytics, ads, accounts, or other SDKs later, reassess Data safety and privacy disclosures.
- The Google Fonts import is optional for appearance. The calculator itself works without that font network connection, using system fallbacks.
