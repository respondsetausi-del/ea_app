const fs = require('fs');
const path = require('path');

// Paths
const distPath = path.join(__dirname, '..', 'dist');
const assetsPath = path.join(__dirname, '..', 'assets', 'images');

// Create manifest.json
const manifest = {
  "name": "EA NAPTUNE",
  "short_name": "EA NAPTUNE",
  "description": "Automated Forex Trading EA NAPTUNE App",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#000000",
  "background_color": "#000000",
  "scope": "/",
  "lang": "en",
  "categories": ["finance", "business", "productivity"],
  "icons": [
    {
      "src": "./assets/images/icon.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "./assets/images/adaptive-icon.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "./assets/images/icon.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "related_applications": []
};

// Write manifest.json
fs.writeFileSync(
  path.join(distPath, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// Copy icons to dist folder
const iconFiles = ['icon.png', 'adaptive-icon.png', 'favicon.png'];

iconFiles.forEach(file => {
  const srcPath = path.join(assetsPath, file);
  const destPath = path.join(distPath, 'assets', 'images', file);

  // Create assets/images directory if it doesn't exist
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to dist/assets/images/`);
  }
});

// Copy service worker to dist folder with build-time cache bust
const swSrcPath = path.join(__dirname, '..', 'public', 'sw.js');
const swDestPath = path.join(distPath, 'sw.js');

if (fs.existsSync(swSrcPath)) {
  let swContent = fs.readFileSync(swSrcPath, 'utf8');
  const buildTimestamp = Date.now();
  swContent = swContent.replace('Date.now()', `${buildTimestamp}`);
  fs.writeFileSync(swDestPath, swContent);
  console.log(`Copied service worker to dist/ with build stamp ${buildTimestamp}`);
}

// Update index.html to include manifest and Apple meta tags
const indexPath = path.join(distPath, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  // Expo emits its own `width=device-width, initial-scale=1, shrink-to-fit=no`
  // viewport. Ours is injected right after <head>, so Expo's came LATER and
  // won — which is why the zoom guard (and viewport-fit=cover) never actually
  // applied on device. Strip every existing viewport tag first so the one
  // added below is the only one in the document.
  const strippedViewports = (html.match(/\s*<meta\s+name=["']viewport["'][^>]*>/gi) || []).length;
  html = html.replace(/\s*<meta\s+name=["']viewport["'][^>]*>/gi, '');
  if (strippedViewports) {
    console.log(`  removed ${strippedViewports} pre-existing viewport tag(s)`);
  }

  // Add manifest link
  if (!html.includes('manifest.json')) {
    html = html.replace(
      '<head>',
      `<head>
  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="EA NAPTUNE">
  <link rel="apple-touch-icon" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="57x57" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="60x60" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="72x72" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="76x76" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="114x114" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="120x120" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="144x144" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/assets/images/icon.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/images/icon.png">
  <meta name="msapplication-TileColor" content="#000000">
  <meta name="msapplication-TileImage" content="/assets/images/icon.png">
  <meta name="theme-color" content="#000000">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <script>
    // No service worker is registered. Older builds shipped a caching SW that
    // kept serving stale HTML/JS across deploys. This script removes any
    // existing service worker + caches so every load is network-only, then
    // never registers a new one. It is idempotent and safe on every load.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        var hadController = !!navigator.serviceWorker.controller;
        return Promise.all(regs.map(function(r) { return r.unregister(); })).then(function() {
          if (!('caches' in window)) return;
          return caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
          }).then(function() {
            // Reload once (and only once) if a stale SW was controlling this page.
            if (hadController && !sessionStorage.getItem('sw-killed')) {
              sessionStorage.setItem('sw-killed', '1');
              window.location.reload();
            }
          });
        });
      }).catch(function() {});
    }
    
    // Preload critical resources
    window.addEventListener('DOMContentLoaded', function() {
      // Preload critical images
      const criticalImages = [
        '/assets/images/icon.png',
        '/assets/images/adaptive-icon.png'
      ];
      
      criticalImages.forEach(function(src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      });
    });
  </script>`
    );
  }

  // The single source of truth for the viewport. Added outside the manifest
  // guard above so a re-run — which skips that block — still leaves exactly one
  // viewport tag rather than none, having just stripped Expo's.
  //
  // maximum-scale + user-scalable=no are what stop the page drifting sideways
  // on iOS: focusing an input under 16px auto-zooms, and a home-screen PWA has
  // no way to zoom back out, so the viewport stays wider than the screen and
  // the whole app scrolls left/right from then on.
  html = html.replace(
    '<head>',
    `<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`,
  );

  // Layout guards. Also kept outside the manifest block, for the same reason:
  // that block is skipped whenever index.html already mentions manifest.json,
  // which silently dropped these on any re-run.
  if (!html.includes('ea-naptune-layout-guards')) {
    html = html.replace(
      '</head>',
      `  <style id="ea-naptune-layout-guards">
    html, body {
      background-color: #000000 !important;
      /* Nothing may widen the page: the viewport tag stops the zoom, this
         stops any stray element (the off-screen sidebar, a wide row) from
         making the document itself scrollable sideways. */
      max-width: 100%;
      overflow-x: hidden;
      overscroll-behavior-x: none;
    }
    @media screen and (max-width: 768px) {
      body {
        padding-top: env(safe-area-inset-top);
        background-color: #000000 !important;
      }
    }
    /* iOS zooms the page when a focused field's text is under 16px. This fixes
       the cause rather than only suppressing the symptom, which matters because
       user-scalable=no is ignored on recent iOS.

       !important is load-bearing: react-native-web sets font sizes through
       generated atomic classes (.r-fontSize-*), which outrank a bare element
       selector, so without it this rule loses on every field it exists for.
       max() keeps larger designed sizes intact and only raises the small ones. */
    input, select, textarea {
      font-size: max(16px, 1em) !important;
    }
  </style>
</head>`,
    );
  }

  const viewportCount = (html.match(/<meta\s+name=["']viewport["']/gi) || []).length;
  if (viewportCount !== 1) {
    // Two tags means the later one silently wins and this fix is inert — the
    // exact bug being repaired here, so fail the build rather than ship it.
    console.error(`post-build: expected exactly 1 viewport tag, found ${viewportCount}`);
    process.exit(1);
  }

  fs.writeFileSync(indexPath, html);
  console.log('Updated index.html with PWA meta tags (1 viewport tag)');
}

console.log('PWA setup completed successfully!');
