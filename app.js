const map = L.map('map', { zoomControl: true }).setView([40.7128, -74.0060], 11);

// Basemap is independent of every NYC data layer so the map always remains usable.
const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 20,
  attribution: 'Esri, Maxar, Earthstar Geographics'
});
L.control.layers({ Street: street, Aerial: imagery }, {}, { position: 'topright' }).addTo(map);
L.control.scale({ imperial: true, metric: false }).addTo(map);

const $ = id => document.getElementById(id);
let searchMarker;
let lotGeoJson = L.geoJSON(null, {
  style: feature => lotStyle(feature.properties || {}),
  onEachFeature: (feature, layer) => {
    layer.on('click', () => showLot(feature.properties || {}));
    layer.bindPopup(() => lotPopup(feature.properties || {}));
  }
}).addTo(map);

function esc(v='') { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function val(p, ...keys) { for (const k of keys) if (p[k] !== undefined && p[k] !== null && String(p[k]).trim() !== '') return p[k]; return ''; }
function list(p, keys) { return keys.map(k => val(p,k)).filter(Boolean).join(', '); }
function showSelected(title, rows) { $('selectedInfo').innerHTML = `<div class="result-title">${esc(title)}</div>` + rows.filter(Boolean).map(r => `<div class="result-row">${r}</div>`).join(''); }
function lotStyle(p) {
  const z = String(val(p,'ZoneDist1'));
  let fill = '#3388cc';
  if (z.startsWith('R')) fill = '#d6a84b';
  else if (z.startsWith('C')) fill = '#d86b6b';
  else if (z.startsWith('M')) fill = '#8b75b8';
  return { color:'#1468a8', weight:1, fillColor:fill, fillOpacity:.18 };
}
function lotPopup(p) {
  return `<strong>${esc(val(p,'Address') || 'NYC Tax Lot')}</strong><br>BBL: ${esc(val(p,'BBL'))}<br><strong>Zoning: ${esc(list(p,['ZoneDist1','ZoneDist2','ZoneDist3','ZoneDist4']) || 'not populated')}</strong><br><small>NYC DCP MapPLUTO</small>`;
}
function showLot(p) {
  const z=list(p,['ZoneDist1','ZoneDist2','ZoneDist3','ZoneDist4']);
  const o=list(p,['Overlay1','Overlay2']);
  const s=list(p,['SPDist1','SPDist2','SPDist3']);
  showSelected(val(p,'Address') || 'NYC Tax Lot', [
    `BBL: <strong>${esc(val(p,'BBL'))}</strong>`,
    `Block: ${esc(val(p,'Block'))} &nbsp; Lot: ${esc(val(p,'Lot'))}`,
    z ? `<strong>Zoning district${z.includes(',')?'s':''}: ${esc(z)}</strong>` : 'Zoning district: not populated',
    o ? `Commercial overlay: <strong>${esc(o)}</strong>` : '',
    s ? `Special district: <strong>${esc(s)}</strong>` : '',
    val(p,'LtdHeight') ? `Limited height district: ${esc(val(p,'LtdHeight'))}` : '',
    val(p,'SplitZone') ? `Split zoning: ${esc(val(p,'SplitZone'))}` : '',
    val(p,'LotArea') ? `Lot area: ${Number(val(p,'LotArea')).toLocaleString()} sf` : '',
    'Source: <strong>NYC DCP MapPLUTO</strong>'
  ]);
}

const MAPPLUTO_QUERY = 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0/query';
let loadTimer;
async function loadLots() {
  if (!$('toggleLots').checked || map.getZoom() < 15) { lotGeoJson.clearLayers(); return; }
  const b=map.getBounds();
  const params=new URLSearchParams({
    f:'geojson', where:'1=1',
    geometry:`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`,
    geometryType:'esriGeometryEnvelope', inSR:'4326', spatialRel:'esriSpatialRelIntersects', outSR:'4326',
    outFields:'BBL,Block,Lot,Address,ZoneDist1,ZoneDist2,ZoneDist3,ZoneDist4,Overlay1,Overlay2,SPDist1,SPDist2,SPDist3,LtdHeight,SplitZone,LotArea,LandUse',
    returnGeometry:'true', resultRecordCount:'2000'
  });
  try {
    const r=await fetch(`${MAPPLUTO_QUERY}?${params}`);
    if(!r.ok) throw new Error(`MapPLUTO ${r.status}`);
    const data=await r.json();
    if(data.error) throw new Error(data.error.message || 'MapPLUTO query failed');
    lotGeoJson.clearLayers(); lotGeoJson.addData(data);
    $('dataStatus').textContent='NYC MapPLUTO connected • legal grades pending';
  } catch(err) {
    console.error(err);
    $('dataStatus').textContent='Basemap online • NYC parcel layer unavailable';
  }
}
function queueLots(){ clearTimeout(loadTimer); loadTimer=setTimeout(loadLots,250); }
map.on('moveend zoomend', queueLots);

async function geosearch(q) {
  const r=await fetch(`https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(q)}`);
  if(!r.ok) throw new Error('NYC address search is unavailable.');
  return (await r.json()).features?.[0];
}
$('searchForm').addEventListener('submit', async e => {
  e.preventDefault(); const q=$('searchInput').value.trim(); if(!q)return;
  try {
    const f=await geosearch(q); if(!f)throw new Error('No NYC location found.');
    const [lng,lat]=f.geometry.coordinates; map.setView([lat,lng],18);
    if(searchMarker)map.removeLayer(searchMarker);
    searchMarker=L.marker([lat,lng]).addTo(map);
    const p=f.properties||{}, label=p.label||p.name||q;
    searchMarker.bindPopup(`<strong>${esc(label)}</strong><br>Click the tax lot for zoning details.`).openPopup();
    showSelected(label,[p.borough?`Borough: <strong>${esc(p.borough)}</strong>`:'',p.postalcode?`ZIP: ${esc(p.postalcode)}`:'',p.addendum?.pad?.bbl?`BBL: <strong>${esc(p.addendum.pad.bbl)}</strong>`:'','NYC tax lots appear at zoom 15 and closer.']);
    queueLots();
  } catch(err) { showSelected('Search error',[esc(err.message)]); }
});
$('toggleLots').addEventListener('change', e => { if(e.target.checked){lotGeoJson.addTo(map);queueLots();}else{map.removeLayer(lotGeoJson);} });

queueLots();
