const fs = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
htmlFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\\n/g, ''); 
  
  content = content.replace(/<a href="map\.html" class="drawer-link-item.*?">[\s\S]*?<\/a>/, '');
  content = content.replace(/<a href="requests\.html" class="drawer-link-item.*?">[\s\S]*?<\/a>/, '');
  content = content.replace(/<a href="dashboard\.html" class="drawer-link-item.*?">[\s\S]*?<\/a>/, '');
  
  if (!content.includes('href="map.html" class="btn btn-ghost"')) {
    content = content.replace(
      '<div class="header-actions">', 
      '<div class="header-actions">\n      <a href="map.html" class="btn btn-ghost" style="display: inline-flex;">Map</a>\n      <a href="requests.html" class="btn btn-ghost" style="display: inline-flex;">Requests</a>\n      <a href="dashboard.html" class="btn btn-ghost" style="display: inline-flex;">Dashboard</a>'
    );
  }

  content = content.replace(
    /<span class="brand-mark">🩸<\/span>\n\s*<span>\n\s*<strong>Lifeline<\/strong>/g,
    '<span class="brand-mark">+</span>\n        <span>\n          <strong>Lifeline</strong>'
  );

  fs.writeFileSync(f, content, 'utf8');
});

let mapHtml = fs.readFileSync('map.html', 'utf8');
if (!mapHtml.includes('Control.Geocoder.css')) {
  mapHtml = mapHtml.replace(
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>',
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>\n  <!-- Leaflet Geocoder CSS -->\n  <link rel="stylesheet" href="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css" />'
  );
}
if (!mapHtml.includes('Control.Geocoder.js')) {
  mapHtml = mapHtml.replace(
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>',
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>\n  <!-- Leaflet Geocoder JS -->\n  <script src="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js"></script>'
  );
}
if (!mapHtml.includes('L.Control.geocoder().addTo(map);')) {
  mapHtml = mapHtml.replace(
    ' attribution: \'© OpenStreetMap\'\n      }).addTo(map);',
    ' attribution: \'© OpenStreetMap\'\n      }).addTo(map);\n\n      // Add Search Bar (Geocoder)\n      L.Control.geocoder({ defaultMarkGeocode: true }).addTo(map);'
  );
}

const oldLocate = /const locateBtn = document\.getElementById\("locate-me-btn"\);[\s\S]*?alert\("Location access denied or unavailable\."\);\n          \}\);/g;
const newLocate = 'const locateBtn = document.getElementById("locate-me-btn");\n          let userMarker;\n          locateBtn.addEventListener("click", (e) => {\n            e.preventDefault();\n            const originalText = "📍 Locate Me";\n            locateBtn.textContent = "Locating...";\n            \n            if (!navigator.geolocation) {\n              alert("Geolocation is not supported by your browser.");\n              locateBtn.textContent = originalText;\n              return;\n            }\n\n            navigator.geolocation.getCurrentPosition(\n              (position) => {\n                locateBtn.textContent = originalText;\n                const lat = position.coords.latitude;\n                const lng = position.coords.longitude;\n                map.setView([lat, lng], 15);\n                if (userMarker) map.removeLayer(userMarker);\n                userMarker = L.marker([lat, lng]).addTo(map).bindPopup("You are here").openPopup();\n              },\n              (error) => {\n                locateBtn.textContent = originalText;\n                let msg = "Could not find your location.";\n                if (error.code === 1) msg = "Location access was denied. Please allow location access for this site in your browser settings.";\n                else if (error.code === 2) msg = "Location position is currently unavailable on this device.";\n                else if (error.code === 3) msg = "Location request timed out.";\n                alert(msg + " (Error code: " + error.code + ")");\n              },\n              { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }\n            );\n          });';
mapHtml = mapHtml.replace(oldLocate, newLocate);
fs.writeFileSync('map.html', mapHtml, 'utf8');

let appJs = fs.readFileSync('app.js', 'utf8');
appJs = appJs.replace(
  '  function updateAuthUI() {\n    const login = login-btn;\n    const signout = signout-btn;\n    if (!login || !signout) return;\n\n    if (currentUser) {\n      login.textContent = "Dashboard";\n      signout.classList.remove("hidden");\n    } else {\n      login.textContent = "Sign in";\n      signout.classList.add("hidden");\n    }',
  '  function updateAuthUI() {\n    const login = login-btn;\n    const signout = signout-btn;\n    \n    if (login) {\n      if (currentUser) {\n        login.textContent = "Dashboard";\n      } else {\n        login.textContent = "Sign in";\n      }\n    }\n    if (signout) {\n      if (currentUser) {\n        signout.classList.remove("hidden");\n      } else {\n        signout.classList.add("hidden");\n      }\n    }'
);
appJs = appJs.replace(
  'const toggle = language-toggle;\n    if (toggle) toggle.textContent = currentLanguage === "en" ? "🌐 বাংলা" : "🌐 English";',
  'document.querySelectorAll(".language-toggle").forEach(btn => {\n      btn.textContent = currentLanguage === "en" ? "🌐 বাংলা" : "🌐 English";\n    });'
);
appJs = appJs.replace(
  'language-toggle?.addEventListener("click", () => {\n      applyLanguage(currentLanguage === "en" ? "bn" : "en");\n    });',
  'document.querySelectorAll(".language-toggle").forEach(btn => {\n      btn.addEventListener("click", () => {\n        applyLanguage(currentLanguage === "en" ? "bn" : "en");\n      });\n    });'
);
fs.writeFileSync('app.js', appJs, 'utf8');

let translatorJs = fs.readFileSync('translator.js', 'utf8');
translatorJs = translatorJs.replace(
  'btn.addEventListener("click", toggleLanguage);',
  '// btn.addEventListener("click", toggleLanguage); // Handled by app.js'
);
fs.writeFileSync('translator.js', translatorJs, 'utf8');

