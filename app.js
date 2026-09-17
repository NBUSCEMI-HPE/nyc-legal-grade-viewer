const map = L.map('map', { zoomControl: true }).setView([40.7128, -74.0060], 11);

const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 20,
  attribution: 'Esri, Maxar, Earthstar Geographics'
});

L.control.layers({ 'Street': street, 'Aerial': imagery }, {}, { position: 'topright' }).addTo(map);
L.control.scale({ imperial: true, metric: false }).addTo(map);

const gradeLayer = L.layerGroup().addTo(map);
const lotLayer = L.layerGroup().addTo(map);
const buildingLayer = L.layerGroup();
const curbLayer = L.layerGroup();
let searchMarker;

const $ = (id) => document.getElementById(id);

function showSelected(title, rows) {
  $('selectedInfo').innerHTML = `<div class="result-title">${escapeHtml(title)}</div>` + rows.map(r => `<div class="result-row">${r}</div>`).join('');
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

async function geosearch(query) {
  const url = `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('NYC address search is unavailable.');
  const data = await res.json();
  return data.features?.[0];
}

$('searchForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const q = $('searchInput').value.trim();
  if (!q) return;
  try {
    const feature = await geosearch(q);
    if (!feature) throw new Error('No NYC location found.');
    const [lng, lat] = feature.geometry.coordinates;
    map.setView([lat, lng], 18);
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([lat, lng]).addTo(map);
    const p = feature.properties || {};
    const label = p.label || p.name || q;
    searchMarker.bindPopup(`<strong>${escapeHtml(label)}</strong>`).openPopup();
    showSelected(label, [
      p.borough ? `Borough: <strong>${escapeHtml(p.borough)}</strong>` : '',
      p.postalcode ? `ZIP: ${escapeHtml(p.postalcode)}` : '',
      p.addendum?.pad?.bbl ? `BBL: <strong>${escapeHtml(p.addendum.pad.bbl)}</strong>` : ''
    ].filter(Boolean));
  } catch (err) {
    showSelected('Search error', [escapeHtml(err.message)]);
  }
});

map.on('click', (e) => {
  showSelected('Map location', [`Latitude: ${e.latlng.lat.toFixed(6)}`, `Longitude: ${e.latlng.lng.toFixed(6)}`]);
});

$('toggleGrades').addEventListener('change', e => e.target.checked ? gradeLayer.addTo(map) : map.removeLayer(gradeLayer));
$('toggleLots').addEventListener('change', e => e.target.checked ? lotLayer.addTo(map) : map.removeLayer(lotLayer));
$('toggleBuildings').addEventListener('change', e => e.target.checked ? buildingLayer.addTo(map) : map.removeLayer(buildingLayer));
$('toggleCurbs').addEventListener('change', e => e.target.checked ? curbLayer.addTo(map) : map.removeLayer(curbLayer));

// Production legal-grade FeatureServer is intentionally not substituted with unverified data.
// Once the authoritative NYC DCP/DEP endpoint is confirmed, its records will populate gradeLayer here.
