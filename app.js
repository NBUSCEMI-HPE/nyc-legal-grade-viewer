const map = L.map('map', { zoomControl: true }).setView([40.7128, -74.0060], 11);

const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:20, attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:20, attribution:'Esri, Maxar, Earthstar Geographics'});
L.control.layers({'Street':street,'Aerial':imagery},{},{position:'topright'}).addTo(map);
L.control.scale({imperial:true,metric:false}).addTo(map);

const $ = id => document.getElementById(id);
let searchMarker;
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function showSelected(title,rows){$('selectedInfo').innerHTML=`<div class="result-title">${escapeHtml(title)}</div>`+rows.filter(Boolean).map(r=>`<div class="result-row">${r}</div>`).join('');}

// Official NYC DCP MapPLUTO Feature Service.
const MAPPLUTO_URL='https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0';
const lots=L.esri.featureLayer({
  url:MAPPLUTO_URL,
  simplifyFactor:0.35,
  precision:5,
  minZoom:15,
  style:()=>({color:'#1468a8',weight:1,fillColor:'#3388cc',fillOpacity:0.08})
}).addTo(map);

lots.bindPopup(layer=>{
  const p=layer.feature?.properties||{};
  const bbl=p.BBL||p.bbl||'';
  const address=p.Address||p.address||'';
  const block=p.Block||p.block||'';
  const lot=p.Lot||p.lot||'';
  return `<strong>${escapeHtml(address||'NYC Tax Lot')}</strong><br>BBL: ${escapeHtml(bbl)}<br>Block: ${escapeHtml(block)} &nbsp; Lot: ${escapeHtml(lot)}<br><small>Source: NYC DCP MapPLUTO</small>`;
});

lots.on('click',e=>{
  const p=e.layer.feature?.properties||{};
  showSelected(p.Address||'NYC Tax Lot',[
    `BBL: <strong>${escapeHtml(p.BBL||'')}</strong>`,
    `Block: ${escapeHtml(p.Block||'')} &nbsp; Lot: ${escapeHtml(p.Lot||'')}`,
    p.ZoneDist1?`Zoning: ${escapeHtml(p.ZoneDist1)}`:'',
    p.LotArea?`Lot area: ${Number(p.LotArea).toLocaleString()} sf`:'',
    'Source: <strong>NYC DCP MapPLUTO</strong>'
  ]);
});

async function geosearch(query){
  const res=await fetch(`https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(query)}`);
  if(!res.ok) throw new Error('NYC address search is unavailable.');
  const data=await res.json(); return data.features?.[0];
}

$('searchForm').addEventListener('submit',async event=>{
  event.preventDefault(); const q=$('searchInput').value.trim(); if(!q)return;
  try{
    const f=await geosearch(q); if(!f)throw new Error('No NYC location found.');
    const [lng,lat]=f.geometry.coordinates; map.setView([lat,lng],18);
    if(searchMarker)map.removeLayer(searchMarker);
    searchMarker=L.marker([lat,lng]).addTo(map);
    const p=f.properties||{}; const label=p.label||p.name||q;
    searchMarker.bindPopup(`<strong>${escapeHtml(label)}</strong>`).openPopup();
    showSelected(label,[p.borough?`Borough: <strong>${escapeHtml(p.borough)}</strong>`:'',p.postalcode?`ZIP: ${escapeHtml(p.postalcode)}`:'',p.addendum?.pad?.bbl?`BBL: <strong>${escapeHtml(p.addendum.pad.bbl)}</strong>`:'','Zoomed to live NYC tax-lot data.']);
  }catch(err){showSelected('Search error',[escapeHtml(err.message)]);}
});

$('toggleLots').addEventListener('change',e=>e.target.checked?lots.addTo(map):map.removeLayer(lots));
