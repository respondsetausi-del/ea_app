const fs = require('fs');
const path = require('path');

// Paths
const distPath = path.join(__dirname, '..', 'dist');
const assetsPath = path.join(__dirname, '..', 'assets', 'images');

// Create manifest.json
const manifest = {
  "name": "Trade Port EA",
  "short_name": "Trade Port EA",
  "description": "Automated Forex Trading Trade Port EA App",
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

  // Add manifest link
  if (!html.includes('manifest.json')) {
    html = html.replace(
      '<head>',
      `<head>
  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Trade Port EA">
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <style>
    body {
      background-color: #000000 !important;
    }
    /* Ensure status bar area is black */
    @media screen and (max-width: 768px) {
      body {
        padding-top: env(safe-area-inset-top);
        background-color: #000000 !important;
      }
    }
  </style>
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

  fs.writeFileSync(indexPath, html);
  console.log('Updated index.html with PWA meta tags');
}

console.log('PWA setup completed successfully!');
