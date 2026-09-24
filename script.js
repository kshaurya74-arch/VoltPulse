const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjAxNDJjZjk3YjcwMjQ3MTg5ZjVhZTQ5NmRjYWE1MmVlIiwiaCI6Im11cm11cjY0In0=";
const FALLBACK_FROM = {name:"Chandni Chowk, Delhi", lat:28.6506, lon:77.2303};
const FALLBACK_TO   = {name:"Sector 135, Noida",   lat:28.5063, lon:77.3910};

function dotIcon(color){
  return L.divIcon({className:'', html:`<div class="mk-dot" style="background:${color};box-shadow:0 0 0 6px ${color}33,0 0 14px ${color};"></div>`, iconSize:[14,14], iconAnchor:[7,7]});
}
function labelIcon(text, color){
  return L.divIcon({className:'', html:`<div class="mk-dot" style="background:${color};box-shadow:0 0 0 6px ${color}33,0 0 14px ${color};margin:0 auto 4px;"></div><div class="mk-label">${text}</div>`, iconSize:[120,40], iconAnchor:[7,7]});
}

async function orsGeocode(text){
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_KEY}&text=${encodeURIComponent(text)}&size=1&boundary.country=IN`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('geocode failed');
  const data = await res.json();
  if(!data.features || !data.features.length) throw new Error('no results');
  const [lon,lat] = data.features[0].geometry.coordinates;
  return {lat, lon, name:text};
}

async function orsDirections(from, to){
  const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
  const res = await fetch(url, {
    method:'POST',
    headers:{'Authorization': ORS_KEY, 'Content-Type':'application/json; charset=utf-8'},
    body: JSON.stringify({coordinates:[[from.lon,from.lat],[to.lon,to.lat]]})
  });
  if(!res.ok) throw new Error('directions failed');
  return res.json();
}

function drawRoute(map, geojson, from, to){
  map.eachLayer(l=>{ if(l instanceof L.GeoJSON || l instanceof L.Marker) map.removeLayer(l); });
  const routeLayer = L.geoJSON(geojson, {style:{color:'#29D3FF', weight:4, opacity:0.95, className:'ors-route-line'}}).addTo(map);
  L.marker([from.lat, from.lon], {icon: labelIcon(from.name.split(',')[0], '#29D3FF')}).addTo(map);
  L.marker([to.lat, to.lon], {icon: labelIcon(to.name.split(',')[0], '#B6FF3C')}).addTo(map);
  map.fitBounds(routeLayer.getBounds(), {padding:[26,26]});
  return routeLayer;
}

const cars = [
  {name:"Tata Nexon EV", badge:"Compact SUV", range:"465 km", battery:"40.5 kWh", fastcharge:"56 min (10–80%)", top:"120 km/h", color:"#29D3FF"},
  {name:"MG ZS EV", badge:"Mid SUV", range:"461 km", battery:"50.3 kWh", fastcharge:"60 min (10–80%)", top:"175 km/h", color:"#B6FF3C"},
  {name:"Hyundai Kona Electric", badge:"Crossover", range:"452 km", battery:"39.2 kWh", fastcharge:"57 min (10–80%)", top:"167 km/h", color:"#FF5B4D"},
  {name:"Mahindra XUV400", badge:"Compact SUV", range:"456 km", battery:"39.4 kWh", fastcharge:"50 min (0–80%)", top:"150 km/h", color:"#29D3FF"},
  {name:"BYD Atto 3", badge:"Premium SUV", range:"521 km", battery:"60.5 kWh", fastcharge:"50 min (30–80%)", top:"160 km/h", color:"#B6FF3C"},
  {name:"Tata Punch EV", badge:"Micro SUV", range:"421 km", battery:"35.0 kWh", fastcharge:"56 min (10–80%)", top:"122 km/h", color:"#C7D0D9"},
];

const stations = [
  {name:"Statiq Hub — Connaught Place", net:"Statiq", type:"fast", power:"60 kW DC", dist:"3.2 km", eta:"9 min", price:"₹18.5/kWh", plugs:["CCS2","Type 2"], slots:3, total:6, status:"open"},
  {name:"Tata Power EZ Charge — Cyber Hub", net:"Tata Power", type:"fast", power:"50 kW DC", dist:"5.7 km", eta:"14 min", price:"₹21/kWh", plugs:["CCS2"], slots:1, total:4, status:"busy"},
  {name:"ChargeZone — DND Flyway Plaza", net:"ChargeZone", type:"fast", power:"120 kW DC", dist:"8.1 km", eta:"18 min", price:"₹19.9/kWh", plugs:["CCS2","CHAdeMO"], slots:5, total:8, status:"open"},
  {name:"Ather Grid — Sector 135, Noida", net:"Ather Grid", type:"fast", power:"22 kW AC", dist:"11.4 km", eta:"24 min", price:"₹16.5/kWh", plugs:["Type 2"], slots:2, total:5, status:"open"},
  {name:"NDMC EV Charging Hub — India Gate", net:"NDMC · Govt of Delhi", type:"govt", power:"30 kW DC", dist:"6.5 km", eta:"16 min", price:"₹12.0/kWh", plugs:["CCS2","Type 2"], slots:2, total:4, status:"open"},
  {name:"EESL Charging Station — Connaught Place", net:"EESL · Ministry of Power", type:"govt", power:"25 kW DC", dist:"4.0 km", eta:"11 min", price:"₹10.5/kWh", plugs:["CCS2"], slots:1, total:3, status:"busy"},
  {name:"NTPC Vidyut Vahan — Sector 62, Noida", net:"NTPC Ltd · Govt PSU", type:"govt", power:"50 kW DC", dist:"13.2 km", eta:"27 min", price:"₹11.0/kWh", plugs:["CCS2","CHAdeMO"], slots:4, total:6, status:"open"},
  {name:"DTC Depot Charging — Kashmere Gate ISBT", net:"Delhi Transport Corp.", type:"govt", power:"20 kW AC", dist:"9.8 km", eta:"21 min", price:"₹9.5/kWh", plugs:["Type 2"], slots:3, total:5, status:"open"},
];
stations.forEach((s,i)=>{ s.idx = i; });

function carSVG(color){
  return `<svg width="150" height="80" viewBox="0 0 150 80" fill="none">
    <ellipse cx="75" cy="68" rx="66" ry="6" fill="black" opacity="0.35"/>
    <path d="M14 52 C14 40 22 34 34 32 L46 20 C50 15 57 12 65 12 L92 12 C100 12 107 15 111 21 L122 32 C134 34 140 40 140 50 L140 56 C140 60 137 62 133 62 L21 62 C17 62 14 60 14 56 Z"
      fill="${color}" opacity="0.16" stroke="${color}" stroke-width="2.5"/>
    <path d="M50 32 L58 18 L96 18 L106 32 Z" fill="${color}" opacity="0.28" stroke="${color}" stroke-width="1.5"/>
    <circle cx="40" cy="62" r="11" fill="#0D1116" stroke="${color}" stroke-width="3"/>
    <circle cx="112" cy="62" r="11" fill="#0D1116" stroke="${color}" stroke-width="3"/>
    <rect x="128" y="40" width="6" height="4" rx="1" fill="${color}"/>
  </svg>`;
}

let selectedCarIdx = 0;
let batteryLevel = 72;
let drivingMode = 'Normal';
const modeMultiplier = {Eco:0.85, Normal:1.0, Sport:1.25, Offroad:1.4};

function estimateArrival(distanceKm){
  const car = cars[selectedCarIdx];
  const capacity = parseFloat(car.battery);
  const rangeKm = parseFloat(car.range);
  const consumptionPerKm = capacity / rangeKm;
  const energyUsed = distanceKm * consumptionPerKm * modeMultiplier[drivingMode];
  const dropPct = (energyUsed / capacity) * 100;
  return Math.max(0, Math.round(batteryLevel - dropPct));
}

const ssCar = document.getElementById('ssCar');
const ssBattery = document.getElementById('ssBattery');
const ssMode = document.getElementById('ssMode');
const ssBt = document.getElementById('ssBt');
function updateStatusStrip(){
  ssCar.textContent = cars[selectedCarIdx].name;
  ssBattery.textContent = batteryLevel + '%';
  ssMode.textContent = drivingMode;
  ssBt.textContent = connectedFlag() ? '● Paired' : '● Not Paired';
  ssBt.classList.toggle('on', connectedFlag());
}
function connectedFlag(){ return typeof connected !== 'undefined' && connected; }

const carGrid = document.getElementById('carGrid');
function renderCars(){
  carGrid.innerHTML = cars.map((c,i)=>`
    <div class="car-card ${i===selectedCarIdx?'selected':''}" data-idx="${i}">
      <div class="car-svg-holder">${carSVG(c.color)}</div>
      <div class="car-name">${c.name}</div>
      <div class="car-badge">${c.badge}</div>
      <div class="car-specs">
        <div class="spec"><span>Range</span><b>${c.range}</b></div>
        <div class="spec"><span>Battery</span><b>${c.battery}</b></div>
        <div class="spec"><span>Fast Charge</span><b>${c.fastcharge}</b></div>
        <div class="spec"><span>Top Speed</span><b>${c.top}</b></div>
      </div>
      <button class="car-select-btn">${i===selectedCarIdx?'✓ Selected as my EV':'Select this EV'}</button>
    </div>
  `).join('');
  document.querySelectorAll('.car-card').forEach(el=>{
    el.addEventListener('click',()=>{
      selectedCarIdx = parseInt(el.dataset.idx);
      renderCars();
      updateBtCarInfo();
      updateVehicleSetupName();
      updateStatusStrip();
    });
  });
}
renderCars();

const vsCarName = document.getElementById('vsCarName');
const vsBatteryBig = document.getElementById('vsBatteryBig');
const batterySlider = document.getElementById('batterySlider');
const batteryTrackFill = document.getElementById('batteryTrackFill');
const advToggle = document.getElementById('advToggle');
const advPanel = document.getElementById('advPanel');
const modeRow = document.getElementById('modeRow');

function updateVehicleSetupName(){
  vsCarName.textContent = cars[selectedCarIdx].name;
}
updateVehicleSetupName();

batterySlider.addEventListener('input', e=>{
  batteryLevel = parseInt(e.target.value);
  vsBatteryBig.textContent = batteryLevel + '%';
  batteryTrackFill.style.width = batteryLevel + '%';
  updateStatusStrip();
});

advToggle.addEventListener('click', ()=>{
  const open = advPanel.style.display !== 'none';
  advPanel.style.display = open ? 'none' : 'block';
  advToggle.classList.toggle('open', !open);
});

modeRow.addEventListener('click', e=>{
  const btn = e.target.closest('.mode-btn');
  if(!btn) return;
  drivingMode = btn.dataset.mode;
  modeRow.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  updateStatusStrip();
});

const btStatusText = document.getElementById('btStatusText');
const btConnectBtn = document.getElementById('btConnectBtn');
const btCarName = document.getElementById('btCarName');
const btCarDesc = document.getElementById('btCarDesc');
const btBattery = document.getElementById('btBattery');
const btPort = document.getElementById('btPort');
let connected = false;

function updateBtCarInfo(){
  const c = cars[selectedCarIdx];
  btCarName.textContent = connected ? `Connected to ${c.name}` : `${c.name} — ready to pair`;
  btCarDesc.textContent = connected
    ? `Live telemetry streaming from your ${c.name}. Battery, port state and location update in real time as you drive.`
    : `Tap "Pair Vehicle" to connect your ${c.name} over Bluetooth and unlock live battery and charge-port data.`;
}
updateBtCarInfo();

btConnectBtn.addEventListener('click', ()=>{
  if(connected) return;
  btStatusText.innerHTML = 'Pairing…<small>Searching for nearby vehicle</small>';
  btConnectBtn.textContent = 'Pairing…';
  btConnectBtn.style.opacity = '0.6';
  setTimeout(()=>{
    connected = true;
    btStatusText.innerHTML = `Connected<small>${cars[selectedCarIdx].name}</small>`;
    btBattery.textContent = batteryLevel + '%';
    btPort.textContent = 'CCS2 · Locked';
    btConnectBtn.textContent = '✓ Paired';
    btConnectBtn.style.opacity = '1';
    updateBtCarInfo();
    updateStatusStrip();
  }, 1400);
});

let heroMap, plannerMap;
function initMaps(){
  heroMap = L.map('heroMap', {zoomControl:true, attributionControl:true}).setView([28.58, 77.30], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© OpenStreetMap'}).addTo(heroMap);

  plannerMap = L.map('plannerMap', {zoomControl:true, attributionControl:true}).setView([28.58, 77.30], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© OpenStreetMap'}).addTo(plannerMap);

  runHeroDemo();
}

async function runHeroDemo(){
  const status = document.getElementById('heroMapStatus');
  try{
    const geo = await orsDirections(FALLBACK_FROM, FALLBACK_TO);
    drawRoute(heroMap, geo, FALLBACK_FROM, FALLBACK_TO);
    const summary = geo.features[0].properties.summary;
    const km = summary.distance/1000;
    const mins = Math.round(summary.duration/60);
    document.getElementById('heroDist').textContent = km.toFixed(1)+' km';
    document.getElementById('heroEta').textContent = mins+' min';
    document.getElementById('heroArrive').textContent = estimateArrival(km)+'%';
    status.style.display='none';
  }catch(err){
    status.textContent = 'Live routing unavailable — showing last known route';
    L.marker([FALLBACK_FROM.lat, FALLBACK_FROM.lon], {icon:labelIcon('Chandni Chowk','#29D3FF')}).addTo(heroMap);
    L.marker([FALLBACK_TO.lat, FALLBACK_TO.lon], {icon:labelIcon('Sector 135','#B6FF3C')}).addTo(heroMap);
    L.polyline([[FALLBACK_FROM.lat,FALLBACK_FROM.lon],[FALLBACK_TO.lat,FALLBACK_TO.lon]], {color:'#29D3FF', weight:3, dashArray:'8,10', className:'ors-route-line'}).addTo(heroMap);
    document.getElementById('heroDist').textContent = '27.4 km';
    document.getElementById('heroEta').textContent = '52 min';
    document.getElementById('heroArrive').textContent = estimateArrival(27.4)+'%';
  }
}
window.addEventListener('load', initMaps);

const plannerStatus = document.getElementById('plannerStatus');
const planTripBtn = document.getElementById('planTripBtn');

planTripBtn.addEventListener('click', async ()=>{
  const fromText = document.getElementById('fromInput').value.trim();
  const toText = document.getElementById('toInput').value.trim();
  if(!fromText || !toText){ plannerStatus.textContent = 'Enter both a start and destination.'; plannerStatus.className='planner-status err'; return; }

  planTripBtn.disabled = true;
  planTripBtn.textContent = 'Planning…';
  plannerStatus.className = 'planner-status';
  plannerStatus.textContent = 'Locating both points…';

  let from, to;
  try{
    [from, to] = await Promise.all([orsGeocode(fromText), orsGeocode(toText)]);
  }catch(err){
    from = FALLBACK_FROM; to = FALLBACK_TO;
    plannerStatus.textContent = 'Could not geocode exactly — using nearest known landmarks.';
    plannerStatus.className = 'planner-status err';
  }

  try{
    plannerStatus.textContent = 'Fetching route from OpenRouteService…';
    const geo = await orsDirections(from, to);
    drawRoute(plannerMap, geo, from, to);
    const summary = geo.features[0].properties.summary;
    const km = summary.distance/1000;
    const mins = Math.round(summary.duration/60);
    const arrival = estimateArrival(km);
    const co2 = (km*0.12).toFixed(1);

    document.getElementById('statDist').textContent = km.toFixed(1)+' km';
    document.getElementById('statDistNote').textContent = 'Live route via ORS';
    document.getElementById('statEta').textContent = mins+' min';
    document.getElementById('statBatt').textContent = arrival+'%';
    document.getElementById('battFill').style.width = arrival+'%';
    document.getElementById('statCo2').textContent = co2+' kg';

    plannerStatus.textContent = `Routed ${km.toFixed(1)} km in ${mins} min · ${drivingMode} mode from ${batteryLevel}% battery.`;
    plannerStatus.className = 'planner-status ok';
  }catch(err){
    plannerStatus.textContent = 'Routing service unreachable right now — please try again.';
    plannerStatus.className = 'planner-status err';
  }finally{
    planTripBtn.disabled = false;
    planTripBtn.textContent = '⚡ Plan Trip';
  }
});

const liveStations = {};
let userReservation = null;

function initLiveState(s){
  if(liveStations[s.idx]) return liveStations[s.idx];
  const occupied = s.total - s.slots;
  const bays = [];
  for(let i=0;i<s.total;i++){
    if(i < occupied){
      bays.push({id:i+1, status:'charging', remaining: 4 + Math.floor(Math.random()*36), owner:null});
    } else {
      bays.push({id:i+1, status:'available', remaining:0, owner:null});
    }
  }
  const queue = s.status==='busy' ? Array.from({length: 1 + Math.floor(Math.random()*2)}, ()=>({isUser:false})) : [];
  const state = {bays, queue};
  liveStations[s.idx] = state;
  return state;
}
stations.forEach(s=>initLiveState(s));

function soonestFreeMinutes(state){
  const charging = state.bays.filter(b=>b.status==='charging' && b.owner!=='you');
  if(!charging.length) return 0;
  return Math.min(...charging.map(b=>b.remaining));
}
function estimateWaitMinutes(state){
  const aheadCount = state.queue.filter(q=>!q.isUser).length + (state.queue.findIndex(q=>q.isUser)>=0 ? state.queue.findIndex(q=>q.isUser) : 0);
  const soonest = soonestFreeMinutes(state);
  const hasFree = state.bays.some(b=>b.status==='available');
  if(hasFree) return 0;
  return soonest + aheadCount*15;
}
function assignQueue(state, stationIdx){
  const freeBay = state.bays.find(b=>b.status==='available');
  if(!freeBay || !state.queue.length) return;
  const next = state.queue.shift();
  if(next.isUser){
    freeBay.status='reserved-you'; freeBay.owner='you';
    userReservation = {stationIdx: stationIdx, bayId: freeBay.id, status:'assigned', holdSec:600};
  } else {
    freeBay.status='charging'; freeBay.owner='stranger'; freeBay.remaining = 8 + Math.floor(Math.random()*30);
  }
}

function worldTick(){
  stations.forEach(s=>{
    const state = liveStations[s.idx];
    state.bays.forEach(b=>{
      if(b.status==='charging' && b.owner!=='you'){
        b.remaining -= 1;
        if(b.remaining <= 0){ b.status='available'; b.owner=null; b.remaining=0; }
      } else if(b.status==='available' && Math.random() < 0.12){
        b.status='charging'; b.owner='stranger'; b.remaining = 6 + Math.floor(Math.random()*30);
      }
    });
    assignQueue(state, s.idx);
  });
  renderStations();
  if(reserveOverlay.classList.contains('open')) renderModal();
}

function fastTick(){
  if(userReservation){
    if(userReservation.status==='assigned'){
      userReservation.holdSec -= 1;
      if(userReservation.holdSec <= 0){
        const state = liveStations[userReservation.stationIdx];
        const bay = state.bays.find(b=>b.id===userReservation.bayId);
        if(bay){ bay.status='available'; bay.owner=null; assignQueue(state, userReservation.stationIdx); }
        userReservation = null;
      }
    } else if(userReservation.status==='charging'){
      userReservation.chargeRemainSec -= 1;
      if(userReservation.chargeRemainSec <= 0){
        userReservation.status='complete';
        const state = liveStations[userReservation.stationIdx];
        const bay = state.bays.find(b=>b.id===userReservation.bayId);
        if(bay){ bay.status='available'; bay.owner=null; }
      }
    }
  }
  if(reserveOverlay.classList.contains('open')) renderModal();
  renderStationSummary();
}
setInterval(worldTick, 4000);
setInterval(fastTick, 1000);

const reserveOverlay = document.getElementById('reserveOverlay');
const reserveModal = document.getElementById('reserveModal');
let currentModalStationIdx = null;

function fmtClock(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

window.openReserveModal = function(idx){
  currentModalStationIdx = idx;
  if(userReservation) userReservation.stationIdx = userReservation.stationIdx ?? idx;
  reserveOverlay.classList.add('open');
  renderModal();
};

window.closeReserveModal = function(){
  reserveOverlay.classList.remove('open');
};
reserveOverlay.addEventListener('click', e=>{ if(e.target===reserveOverlay) closeReserveModal(); });

window.userReserve = function(){
  const s = stations[currentModalStationIdx];
  const state = liveStations[s.idx];
  if(userReservation){ return; }
  const freeBay = state.bays.find(b=>b.status==='available');
  if(freeBay){
    freeBay.status='reserved-you'; freeBay.owner='you';
    userReservation = {stationIdx:s.idx, bayId:freeBay.id, status:'assigned', holdSec:600};
  } else {
    state.queue.push({isUser:true});
    userReservation = {stationIdx:s.idx, bayId:null, status:'queued', holdSec:0};
  }
  renderModal(); renderStations();
};

window.userPluggedIn = function(){
  if(!userReservation) return;
  const state = liveStations[userReservation.stationIdx];
  const bay = state.bays.find(b=>b.id===userReservation.bayId);
  const totalMin = 25 + Math.floor(Math.random()*21);
  userReservation.status='charging';
  userReservation.chargeTotalMin = totalMin;
  userReservation.chargeRemainSec = totalMin*60;
  if(bay){ bay.status='charging'; bay.owner='you'; bay.remaining=totalMin; }
  renderModal(); renderStations();
};

window.userCancel = function(){
  if(!userReservation) return;
  const state = liveStations[userReservation.stationIdx];
  if(userReservation.status==='queued'){
    state.queue = state.queue.filter(q=>!q.isUser);
  } else if(userReservation.bayId){
    const bay = state.bays.find(b=>b.id===userReservation.bayId);
    if(bay){ bay.status='available'; bay.owner=null; }
    assignQueue(state, userReservation.stationIdx);
  }
  userReservation = null;
  renderModal(); renderStations();
};

window.userUnplug = function(){
  userReservation = null;
  renderModal(); renderStations();
};

function renderModal(){
  if(currentModalStationIdx===null) return;
  const s = stations[currentModalStationIdx];
  const state = liveStations[s.idx];
  const pluggedIn = state.bays.filter(b=>b.status==='charging').length;
  const aheadOfYou = userReservation && userReservation.status==='queued'
    ? state.queue.findIndex(q=>q.isUser)
    : state.queue.length;
  const waitMin = estimateWaitMinutes(state);
  const isMine = userReservation && userReservation.stationIdx===s.idx;

  const bayGrid = state.bays.map(b=>{
    const mine = b.owner==='you';
    const cls = mine ? 'you' : (b.status==='available' ? 'available' : 'charging');
    const icon = b.status==='available' ? '🅿️' : (mine ? '🚗' : '🚙');
    const label = b.status==='available' ? 'Available' : (mine ? (userReservation.status==='assigned'?'Reserved · you':'Charging · you') : `${b.remaining} min left`);
    const clickable = b.status==='available' && !userReservation;
    const progress = b.status==='charging' ? Math.max(4, 100 - (b.remaining/45*100)) : 0;
    return `<div class="bay ${cls}" ${clickable?`onclick="userReserve()" style="cursor:pointer;"`:''}>
      <div class="bay-id">BAY ${b.id}</div>
      <div class="bay-ico">${icon}</div>
      <div class="bay-state">${label}</div>
      ${b.status==='charging'?`<div class="bay-progress"><i style="width:${progress}%;"></i></div>`:''}
    </div>`;
  }).join('');

  let actionHtml = '';
  if(!userReservation){
    actionHtml = `<button class="ra-btn primary" onclick="userReserve()">⚡ Reserve a Slot Here</button>`;
  } else if(!isMine){
    actionHtml = `<div class="queue-banner"><b>Reservation active elsewhere</b><span>You already have a reservation running at another station. Cancel it there before booking a new one.</span></div>`;
  } else if(userReservation.status==='queued'){
    actionHtml = `
      <div class="queue-banner">
        <b>🕒 You're in the queue — position #${aheadOfYou+1}</b>
        <span>${aheadOfYou} vehicle${aheadOfYou===1?'':'s'} ahead of you · estimated wait <b>${waitMin} min</b>. We'll auto-assign the next free bay to you.</span>
      </div>
      <button class="ra-btn danger" onclick="userCancel()">Cancel queue position</button>`;
  } else if(userReservation.status==='assigned'){
    actionHtml = `
      <div class="hold-banner">
        <div class="hb-text"><b>Bay ${userReservation.bayId} is yours</b><span>Plug in before the hold expires</span></div>
        <div class="hold-timer">${fmtClock(userReservation.holdSec)}</div>
      </div>
      <div class="ra-row">
        <button class="ra-btn success" onclick="userPluggedIn()">🔌 I've Plugged In</button>
        <button class="ra-btn danger" onclick="userCancel()">Cancel</button>
      </div>`;
  } else if(userReservation.status==='charging'){
    const pct = Math.round(100 - (userReservation.chargeRemainSec/(userReservation.chargeTotalMin*60))*100);
    actionHtml = `
      <div class="charge-banner">
        <div class="cb-top"><b>⚡ Charging on Bay ${userReservation.bayId}</b><span>${fmtClock(userReservation.chargeRemainSec)}</span></div>
        <div class="bay-progress" style="height:8px;"><i style="width:${pct}%;"></i></div>
      </div>
      <button class="ra-btn danger" onclick="userUnplug()">Unplug now</button>`;
  } else if(userReservation.status==='complete'){
    actionHtml = `
      <div class="complete-banner">
        <div class="cb-icon">🎉</div>
        <h4>Charging Complete</h4>
        <div class="complete-stats">
          <div class="mstat"><span>Energy added</span><b class="charge">${(userReservation.chargeTotalMin*0.45).toFixed(1)} kWh</b></div>
          <div class="mstat"><span>Cost</span><b>₹${Math.round(userReservation.chargeTotalMin*0.45*parseFloat(s.price))}</b></div>
          <div class="mstat"><span>CO₂ avoided</span><b class="volt">${(userReservation.chargeTotalMin*0.09).toFixed(1)} kg</b></div>
        </div>
      </div>
      <button class="ra-btn primary" onclick="userUnplug()">Done</button>`;
  }

  reserveModal.innerHTML = `
    <div class="modal-head">
      <div>
        <span class="type-badge ${s.type}">${s.type==='govt' ? '🏛 Government' : '⚡ Fast Charging'}</span>
        <h3>${s.name}</h3>
        <div class="m-sub">${s.net} · ${s.power} · ${s.dist} away</div>
      </div>
      <button class="modal-close" onclick="closeReserveModal()">✕</button>
    </div>

    <div class="modal-stats">
      <div class="mstat"><span>Plugged in now</span><b class="volt">${pluggedIn}/${s.total}</b></div>
      <div class="mstat"><span>Ahead of you</span><b class="alert">${isMine && userReservation.status==='queued' ? aheadOfYou : state.queue.length}</b></div>
      <div class="mstat"><span>Est. wait for a bay</span><b class="charge">${waitMin===0?'Ready now':waitMin+' min'}</b></div>
    </div>

    <div class="bay-section-label">Live bay status</div>
    <div class="bay-grid">${bayGrid}</div>

    <div class="reserve-action-panel">${actionHtml}</div>
  `;
}

const stationGrid = document.getElementById('stationGrid');
const stationSummary = document.getElementById('stationSummary');
const filterTabs = document.getElementById('filterTabs');
let stationFilter = 'all';

function renderStationSummary(){
  const fastCount = stations.filter(s=>s.type==='fast').length;
  const govtCount = stations.filter(s=>s.type==='govt').length;
  stationSummary.innerHTML = `
    <div class="summary-chip fast">⚡ <span>Fast Charging networks nearby</span><b>${fastCount}</b></div>
    <div class="summary-chip govt">🏛 <span>Government-run stations nearby</span><b>${govtCount}</b></div>
  `;
}

function renderStations(){
  const list = stationFilter==='all' ? stations : stations.filter(s=>s.type===stationFilter);
  stationGrid.innerHTML = list.map(s=>{
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.name)}`;
    const state = liveStations[s.idx];
    const pluggedIn = state.bays.filter(b=>b.status==='charging').length;
    const waitMin = estimateWaitMinutes(state);
    const waitText = waitMin===0 ? 'Bay open now' : `Next bay in ~${waitMin} min`;
    return `
    <div class="station-card">
      <div class="station-top">
        <div>
          <span class="type-badge ${s.type}">${s.type==='govt' ? '🏛 Government' : '⚡ Fast Charging'}</span>
          <div class="station-name">${s.name}</div>
          <div class="station-net">${s.net} · ${s.power}</div>
        </div>
        <div class="avail-badge ${s.status}">${s.status==='open' ? '● Slots open' : '● Nearly full'}</div>
      </div>
      <div class="plug-tags">${s.plugs.map(p=>`<span class="plug-tag">${p}</span>`).join('')}</div>
      <div class="card-live-line"><span class="lv-dot"></span><span class="lv-plug">🔌 ${pluggedIn}/${s.total} plugged in</span> · <span class="lv-wait">🕒 ${waitText}</span></div>
      <div class="station-meta">
        <div class="smeta"><span>Distance</span><b>${s.dist}</b></div>
        <div class="smeta"><span>ETA</span><b>${s.eta}</b></div>
        <div class="smeta"><span>Price</span><b>${s.price}</b></div>
      </div>
      <div class="slots-row">
        <div class="slots-track"><div class="slots-fill" style="width:${(state.bays.filter(b=>b.status==='available').length/s.total)*100}%;"></div></div>
        <div class="slots-label">${state.bays.filter(b=>b.status==='available').length}/${s.total} free</div>
      </div>
      <div class="station-actions">
        <a class="dir-btn" href="${mapsUrl}" target="_blank" rel="noopener">🧭 Directions · ${s.eta}</a>
        <button class="reserve-btn" onclick="openReserveModal(${s.idx})">Reserve slot</button>
      </div>
    </div>`;
  }).join('');
}

filterTabs.addEventListener('click', e=>{
  const btn = e.target.closest('.filter-tab');
  if(!btn) return;
  stationFilter = btn.dataset.filter;
  filterTabs.querySelectorAll('.filter-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderStations();
});

renderStationSummary();
renderStations();

const counters = document.querySelectorAll('[data-count]');
const counted = new WeakSet();
function runCount(el){
  const target = parseInt(el.dataset.count);
  let cur = 0;
  const step = Math.max(1, Math.round(target/40));
  const t = setInterval(()=>{
    cur += step;
    if(cur >= target){cur = target; clearInterval(t);}
    el.textContent = cur.toLocaleString();
  }, 25);
}

const io = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{
    if(en.isIntersecting){
      en.target.classList.add('in');
      if(en.target.id==='impact' || en.target.contains(document.querySelector('[data-count]'))){
        counters.forEach(c=>{ if(!counted.has(c)){counted.add(c); runCount(c);} });
      }
      io.unobserve(en.target);
    }
  });
},{threshold:0.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

updateStatusStrip();