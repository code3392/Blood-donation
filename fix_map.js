const fs = require('fs');
let content = fs.readFileSync('map.html', 'utf8');

content = content.replace(/<select id="map-blood-filter"[\s\S]*?<\/select>/, '');

content = content.replace(/\/\/ Filter logic[\s\S]*?\}\);[\s\S]*?\}\);/g, '');

const oldLocate = /\/\/ Locate logic[\s\S]*?alert\(\"Location access denied or unavailable\.\"\);\s*\}\);/g;
const newLocate = '// Locate logic\n' +
'            const locateBtn = document.getElementById("locate-me-btn");\n' +
'            let userMarker;\n' +
'            locateBtn.addEventListener("click", (e) => {\n' +
'              e.preventDefault();\n' +
'              const originalText = "📍 Locate Me";\n' +
'              locateBtn.textContent = "Locating...";\n' +
'              \n' +
'              if (!navigator.geolocation) {\n' +
'                alert("Geolocation is not supported by your browser.");\n' +
'                locateBtn.textContent = originalText;\n' +
'                return;\n' +
'              }\n\n' +
'              navigator.geolocation.getCurrentPosition(\n' +
'                (position) => {\n' +
'                  locateBtn.textContent = originalText;\n' +
'                  const lat = position.coords.latitude;\n' +
'                  const lng = position.coords.longitude;\n' +
'                  map.setView([lat, lng], 15);\n' +
'                  if (userMarker) map.removeLayer(userMarker);\n' +
'                  userMarker = L.marker([lat, lng]).addTo(map).bindPopup("You are here").openPopup();\n' +
'                },\n' +
'                (error) => {\n' +
'                  locateBtn.textContent = originalText;\n' +
'                  let msg = "Could not find your location.";\n' +
'                  if (error.code === 1) msg = "Location access was denied. Please allow location access for this site in your browser settings.";\n' +
'                  else if (error.code === 2) msg = "Location position is currently unavailable on this device.";\n' +
'                  else if (error.code === 3) msg = "Location request timed out.";\n' +
'                  alert(msg + " (Error code: " + error.code + ")");\n' +
'                },\n' +
'                { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }\n' +
'              );\n' +
'            });';
content = content.replace(oldLocate, newLocate);
fs.writeFileSync('map.html', content, 'utf8');
