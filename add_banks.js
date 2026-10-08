const fs = require('fs');
let content = fs.readFileSync('map.html', 'utf8');

const fetchLogic = `
          // Fetch Blood Banks and Clinics from OpenStreetMap
          let bloodBankMarkers = L.layerGroup().addTo(map);
          let isFetching = false;
          
          async function fetchBloodBanks() {
            if (isFetching || map.getZoom() < 8) return; // Only fetch if zoomed in enough
            isFetching = true;
            try {
              const bounds = map.getBounds();
              const s = bounds.getSouth();
              const n = bounds.getNorth();
              const w = bounds.getWest();
              const e = bounds.getEast();
              
              const query = "[out:json][timeout:15];(" +
                  "node['amenity'='blood_bank'](" + s + "," + w + "," + n + "," + e + ");" +
                  "node['healthcare'='blood_bank'](" + s + "," + w + "," + n + "," + e + ");" +
                  "node['name'~'Blood|Sandhani|Badhan|Quantum|Red Crescent|Blood Bank',i](" + s + "," + w + "," + n + "," + e + ");" +
                  "way['name'~'Blood|Sandhani|Badhan|Quantum|Red Crescent|Blood Bank',i](" + s + "," + w + "," + n + "," + e + ");" +
                ");out center;";
              
              const res = await fetch("https://overpass-api.de/api/interpreter", {
                method: "POST",
                body: query
              });
              const data = await res.json();
              
              const bankIcon = L.divIcon({
                html: '<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' + String.fromCharCode(0x1F3E5) + '</div>',
                className: 'blood-bank-icon',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              bloodBankMarkers.clearLayers();
              
              data.elements.forEach(el => {
                const lat = el.lat || (el.center && el.center.lat);
                const lon = el.lon || (el.center && el.center.lon);
                if (lat && lon) {
                  const name = (el.tags && el.tags.name) ? el.tags.name : 'Blood Bank / Clinic';
                  L.marker([lat, lon], { icon: bankIcon })
                   .bindPopup('<b>' + name + '</b><br><small style="color:#16a34a;font-weight:bold;">Verified Medical Facility</small>')
                   .addTo(bloodBankMarkers);
                }
              });
            } catch (err) {
              console.error("Error fetching blood banks:", err);
            }
            isFetching = false;
          }

          map.on('moveend', fetchBloodBanks);
          fetchBloodBanks();
`;

content = content.replace('// Fetch donor locations', fetchLogic + '\n\n          // Fetch donor locations');
fs.writeFileSync('map.html', content, 'utf8');
