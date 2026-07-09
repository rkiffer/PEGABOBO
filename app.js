const MAPS = [
  { name: 'Abyss1', file: 'assets/maps/Abyss1.png' },
  { name: 'Abyss2', file: 'assets/maps/Abyss2.png' },
  { name: 'Abyss3', file: 'assets/maps/Abyss3.png' },
  { name: 'KuberaFire', file: 'assets/maps/KuberaFire.png' },
  { name: 'KuberaWind', file: 'assets/maps/KuberaWind.png' },
  { name: 'KuberaWater', file: 'assets/maps/KuberaWater.png' },
  { name: 'KuberaDark', file: 'assets/maps/KuberaDark.png' },
  { name: 'KuberaEarth', file: 'assets/maps/KuberaEarth.png' },
  { name: 'Swamp of Darkness', file: 'assets/maps/Swamp_of_Darkness.png' },
  { name: 'Deep1', file: 'assets/maps/Deep1.png' },
  { name: 'Deep2', file: 'assets/maps/Deep2.png' },
  { name: 'Deep3', file: 'assets/maps/Deep3.png' },
  { name: 'Deep4', file: 'assets/maps/Deep4.png' },
  { name: 'Deep5', file: 'assets/maps/Deep5.png' },
  { name: 'Nix', file: 'assets/maps/Nix.png' },
];

const $ = (id) => document.getElementById(id);
const mapSelect = $('mapSelect');
const mapImg = $('mapImg');
const spotsLayer = $('spotsLayer');
const spotsList = $('spotsList');
const sideTitle = $('sideTitle');
const statusBox = $('onlineStatus');
const dialog = $('spotDialog');
const form = $('spotForm');
const spotId = $('spotId');
const charName = $('charName');
const spotNote = $('spotNote');
const deleteBtn = $('deleteBtn');

let currentMap = MAPS[0].name;
let clickPoint = null;
let db = loadLocal();

function key() { return 'mu-map-spots-v1'; }
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(key()) || '{}'); }
  catch { return {}; }
}
function saveLocal() { localStorage.setItem(key(), JSON.stringify(db)); }
function spots() { return db[currentMap] ||= []; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function init() {
  MAPS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name;
    opt.textContent = m.name;
    mapSelect.appendChild(opt);
  });

  importFromHash();
  setMap(currentMap);

  mapSelect.addEventListener('change', () => setMap(mapSelect.value));
  $('mapWrap').addEventListener('click', onMapClick);
  form.addEventListener('submit', saveSpotFromForm);
  $('cancelBtn').addEventListener('click', () => dialog.close());
  deleteBtn.addEventListener('click', deleteCurrentSpot);
  $('clearBtn').addEventListener('click', clearCurrentMap);
  $('shareBtn').addEventListener('click', exportLink);
  $('syncBtn').addEventListener('click', syncOnline);
  $('saveOnlineBtn').addEventListener('click', saveOnline);

  statusBox.textContent = GOOGLE_SCRIPT_URL ? 'Google Sheets configurado' : 'Modo local: configure config.js para salvar online';
}

function setMap(name) {
  currentMap = name;
  mapSelect.value = name;
  const found = MAPS.find(m => m.name === name);
  mapImg.src = found.file;
  sideTitle.textContent = `Spots - ${name}`;
  render();
}

function onMapClick(e) {
  if (e.target.classList.contains('spot')) return;
  const rect = mapImg.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  clickPoint = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  spotId.value = '';
  charName.value = '';
  spotNote.value = '';
  deleteBtn.style.display = 'none';
  $('dialogTitle').textContent = 'Novo spot';
  dialog.showModal();
}

function editSpot(id) {
  const s = spots().find(p => p.id === id);
  if (!s) return;
  clickPoint = { x: s.x, y: s.y };
  spotId.value = s.id;
  charName.value = s.charName;
  spotNote.value = s.note || '';
  deleteBtn.style.display = 'inline-block';
  $('dialogTitle').textContent = 'Editar spot';
  dialog.showModal();
}

function saveSpotFromForm(e) {
  e.preventDefault();
  const id = spotId.value;
  if (id) {
    const s = spots().find(p => p.id === id);
    if (s) { s.charName = charName.value.trim(); s.note = spotNote.value.trim(); }
  } else {
    spots().push({ id: uid(), x: clickPoint.x, y: clickPoint.y, charName: charName.value.trim(), note: spotNote.value.trim() });
  }
  saveLocal();
  render();
  dialog.close();
}

function deleteCurrentSpot() {
  const id = spotId.value;
  db[currentMap] = spots().filter(s => s.id !== id);
  saveLocal();
  render();
  dialog.close();
}

function clearCurrentMap() {
  if (!confirm(`Limpar todos os spots de ${currentMap}?`)) return;
  db[currentMap] = [];
  saveLocal();
  render();
}

function render() {
  spotsLayer.innerHTML = '';
  spotsList.innerHTML = '';

  spots().forEach((s, idx) => {
    const el = document.createElement('button');
    el.className = 'spot';
    el.style.left = `${s.x}%`;
    el.style.top = `${s.y}%`;
    el.dataset.name = s.charName;
    el.title = s.charName;
    el.addEventListener('click', () => editSpot(s.id));
    spotsLayer.appendChild(el);

    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `<b>${idx + 1}. ${escapeHtml(s.charName)}</b><span>x: ${s.x.toFixed(2)}%, y: ${s.y.toFixed(2)}%${s.note ? ' • ' + escapeHtml(s.note) : ''}</span>`;
    item.addEventListener('click', () => editSpot(s.id));
    spotsList.appendChild(item);
  });

  if (!spots().length) spotsList.innerHTML = '<p>Nenhum spot neste mapa ainda.</p>';
}

function exportLink() {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(db))));
  const url = `${location.origin}${location.pathname}#data=${encoded}`;
  navigator.clipboard.writeText(url);
  alert('Link copiado. Quem abrir esse link verá os spots exportados.');
}

function importFromHash() {
  if (!location.hash.startsWith('#data=')) return;
  try {
    const raw = decodeURIComponent(escape(atob(location.hash.slice(6))));
    db = JSON.parse(raw);
    saveLocal();
    history.replaceState(null, '', location.pathname);
  } catch { alert('Não consegui importar os spots deste link.'); }
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + uid();
    window[cb] = (data) => { resolve(data); delete window[cb]; script.remove(); };
    const script = document.createElement('script');
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function syncOnline() {
  if (!GOOGLE_SCRIPT_URL) return alert('Cole a URL do Google Apps Script no arquivo config.js.');
  statusBox.textContent = 'Sincronizando...';
  const res = await jsonp(`${GOOGLE_SCRIPT_URL}?map=${encodeURIComponent(currentMap)}`);
  if (res.ok && res.data[currentMap]) {
    db[currentMap] = res.data[currentMap];
    saveLocal();
    render();
    statusBox.textContent = 'Sincronizado com Google Sheets';
  }
}

async function saveOnline() {
  if (!GOOGLE_SCRIPT_URL) return alert('Cole a URL do Google Apps Script no arquivo config.js.');
  statusBox.textContent = 'Salvando online...';
  const body = new URLSearchParams({ map: currentMap, json: JSON.stringify(spots()) });
  await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body });
  statusBox.textContent = 'Salvo online no Google Sheets';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

init();
