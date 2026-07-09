import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, deleteDoc, onSnapshot,
  query, where, serverTimestamp, getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MAPS = [
  { id: "Abyss1", name: "Abyss1", file: "assets/maps/Abyss1.png" },
  { id: "Abyss2", name: "Abyss2", file: "assets/maps/Abyss2.png" },
  { id: "Abyss3", name: "Abyss3", file: "assets/maps/Abyss3.png" },
  { id: "Deep1", name: "Deep1", file: "assets/maps/Deep1.png" },
  { id: "Deep2", name: "Deep2", file: "assets/maps/Deep2.png" },
  { id: "Deep3", name: "Deep3", file: "assets/maps/Deep3.png" },
  { id: "Deep4", name: "Deep4", file: "assets/maps/Deep4.png" },
  { id: "Deep5", name: "Deep5", file: "assets/maps/Deep5.png" },
  { id: "KuberaFire", name: "KuberaFire", file: "assets/maps/KuberaFire.png" },
  { id: "KuberaWind", name: "KuberaWind", file: "assets/maps/KuberaWind.png" },
  { id: "KuberaWater", name: "KuberaWater", file: "assets/maps/KuberaWater.png" },
  { id: "KuberaDark", name: "KuberaDark", file: "assets/maps/KuberaDark.png" },
  { id: "KuberaEarth", name: "KuberaEarth", file: "assets/maps/KuberaEarth.png" },
  { id: "Swamp_of_Darkness", name: "Swamp of Darkness", file: "assets/maps/Swamp_of_Darkness.png" },
  { id: "Nix", name: "Nix", file: "assets/maps/Nix.png" },
];

const DEFAULT_CHARACTERS = [
  ["xSuperSUM", "#ff4d4d"], ["onlyzinha", "#ff8c32"], ["xSuperRW", "#ffd84a"],
  ["zConan", "#48d17a"], ["SakuraSL", "#52d8f2"], ["Elsculd", "#4e8dff"], ["MGHashira", "#9147ff"]
];

const $ = (id) => document.getElementById(id);
const els = {
  mapSelect: $("mapSelect"), mapImage: $("mapImage"), mapStage: $("mapStage"), spotsLayer: $("spotsLayer"),
  currentMapName: $("currentMapName"), charactersList: $("charactersList"), characterSearch: $("characterSearch"),
  spotsCount: $("spotsCount"), charsCount: $("charsCount"), lastUpdate: $("lastUpdate"), showNamesToggle: $("showNamesToggle"),
  spotDialog: $("spotDialog"), spotCharacterSelect: $("spotCharacterSelect"), saveSpotBtn: $("saveSpotBtn"),
  characterDialog: $("characterDialog"), charNameInput: $("charNameInput"), charColorInput: $("charColorInput"), saveCharacterBtn: $("saveCharacterBtn"),
  charModalTitle: $("charModalTitle"), addCharacterBtn: $("addCharacterBtn"), spotInspector: $("spotInspector"),
  clearMapBtn: $("clearMapBtn"), clearMapBtn2: $("clearMapBtn2"), exportBtn: $("exportBtn"), shareBtn: $("shareBtn"), centerMapBtn: $("centerMapBtn")
};

let currentMap = new URLSearchParams(location.search).get("map") || "Deep5";
let characters = [];
let spots = [];
let pendingSpot = null;
let selectedSpotId = null;
let editingCharacterId = null;
let unsubChars = null;
let unsubSpots = null;

function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2200); }
function mapInfo(){ return MAPS.find(m => m.id === currentMap) || MAPS[0]; }
function setUrlMap(){ const url = new URL(location.href); url.searchParams.set("map", currentMap); history.replaceState(null,"",url.toString()); }
function nowLabel(){ return new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }

function initMaps(){
  els.mapSelect.innerHTML = MAPS.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
  if(!MAPS.some(m=>m.id===currentMap)) currentMap = MAPS[0].id;
  els.mapSelect.value = currentMap;
  loadMap();
}

function loadMap(){
  const m = mapInfo();
  els.currentMapName.textContent = m.name;
  els.mapSelect.value = m.id;
  els.mapImage.src = m.file;
  setUrlMap();
  subscribeSpots();
}

function subscribeCharacters(){
  if (unsubChars) unsubChars();
  unsubChars = onSnapshot(collection(db,"characters"), async (snap) => {
    characters = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>a.name.localeCompare(b.name));
    if(characters.length === 0) await seedCharacters();
    renderCharacters(); renderCharacterOptions();
  }, err => { console.error(err); toast("Erro ao carregar personagens"); });
}

async function seedCharacters(){
  const batch = writeBatch(db);
  DEFAULT_CHARACTERS.forEach(([name,color]) => batch.set(doc(collection(db,"characters")), {name,color,createdAt:serverTimestamp()}));
  await batch.commit();
}

function subscribeSpots(){
  if (unsubSpots) unsubSpots();
  const q = query(collection(db,"spots"), where("mapId","==",currentMap));
  unsubSpots = onSnapshot(q, (snap) => {
    spots = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    renderSpots(); renderStats();
  }, err => { console.error(err); toast("Erro ao carregar spots"); });
}

function renderCharacters(){
  const term = els.characterSearch.value.trim().toLowerCase();
  const filtered = characters.filter(c => c.name.toLowerCase().includes(term));
  els.charactersList.innerHTML = filtered.map(c => `
    <div class="char-row" data-id="${c.id}">
      <span class="dot" style="color:${c.color};background:${c.color}"></span>
      <span class="char-name">${escapeHtml(c.name)}</span>
      <button class="text-btn edit-char">Editar</button>
      <button class="x-btn delete-char">×</button>
    </div>`).join("") || `<p class="muted">Nenhum personagem.</p>`;
}

function renderCharacterOptions(){
  els.spotCharacterSelect.innerHTML = characters.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
}

function renderStats(){
  els.spotsCount.textContent = `${spots.length} / 500`;
  els.charsCount.textContent = characters.length;
  els.lastUpdate.textContent = nowLabel();
}

function renderSpots(){
  els.spotsLayer.innerHTML = spots.map(s => {
    const color = s.color || "#ff4d4d";
    const hidden = els.showNamesToggle.checked ? "" : " hide-name";
    return `<div class="spot${hidden}${selectedSpotId===s.id?' selected':''}" data-id="${s.id}" style="left:${s.x}%;top:${s.y}%;color:${color}">
      <span class="spot-dot" style="background:${color}"></span>
      <span class="spot-label">${escapeHtml(s.charName || "Sem nome")}</span>
    </div>`;
  }).join("");
  renderInspector();
}

function renderInspector(){
  const s = spots.find(x => x.id === selectedSpotId);
  if(!s){
    els.spotInspector.innerHTML = `<h3>Spot Selecionado</h3><p class="muted">Clique em um spot para editar ou excluir.</p>`;
    return;
  }
  els.spotInspector.innerHTML = `
    <h3>Spot Selecionado</h3>
    <div class="inspector-row"><span>Mapa</span><strong>${escapeHtml(mapInfo().name)}</strong></div>
    <div class="inspector-row"><span>Char</span><strong>${escapeHtml(s.charName || "--")}</strong></div>
    <div class="inspector-row"><span>X / Y</span><strong>${Number(s.x).toFixed(1)}% / ${Number(s.y).toFixed(1)}%</strong></div>
    <button class="wide blue-outline" id="editSpotBtn">Editar Spot</button>
    <button class="wide danger-outline" id="deleteSpotBtn">Excluir Spot</button>`;
  $("editSpotBtn").onclick = () => openSpotDialogForEdit(s);
  $("deleteSpotBtn").onclick = () => deleteSpot(s.id);
}

function stagePointToPercent(event){
  const rect = els.mapStage.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
}

function openSpotDialogForNew(event){
  if(event.target.closest(".spot")) return;
  if(characters.length === 0){ toast("Adicione um personagem primeiro"); return; }
  pendingSpot = { ...stagePointToPercent(event), mode:"new" };
  els.spotCharacterSelect.value = characters[0].id;
  $("modalTitle").textContent = "Adicionar Spot";
  els.spotDialog.showModal();
}

function openSpotDialogForEdit(spot){
  pendingSpot = { ...spot, mode:"edit" };
  els.spotCharacterSelect.value = spot.charId || characters[0]?.id;
  $("modalTitle").textContent = "Editar Spot";
  els.spotDialog.showModal();
}

async function saveSpot(){
  if(!pendingSpot) return;
  const char = characters.find(c => c.id === els.spotCharacterSelect.value);
  if(!char){ toast("Selecione um personagem"); return; }
  const payload = { mapId: currentMap, x: pendingSpot.x, y: pendingSpot.y, charId: char.id, charName: char.name, color: char.color, updatedAt: serverTimestamp() };
  if(pendingSpot.mode === "edit"){
    await setDoc(doc(db,"spots",pendingSpot.id), payload, { merge:true });
    selectedSpotId = pendingSpot.id;
  } else {
    const ref = await addDoc(collection(db,"spots"), { ...payload, createdAt: serverTimestamp() });
    selectedSpotId = ref.id;
  }
  pendingSpot = null; toast("Spot salvo");
}

async function deleteSpot(id){
  if(!confirm("Excluir este spot?")) return;
  await deleteDoc(doc(db,"spots",id));
  selectedSpotId = null; toast("Spot excluído");
}

function openCharacterDialog(char=null){
  editingCharacterId = char?.id || null;
  els.charModalTitle.textContent = char ? "Editar Personagem" : "Adicionar Personagem";
  els.charNameInput.value = char?.name || "";
  els.charColorInput.value = char?.color || randomColor();
  els.characterDialog.showModal();
}

async function saveCharacter(){
  const name = els.charNameInput.value.trim();
  const color = els.charColorInput.value;
  if(!name){ toast("Digite o nome do personagem"); return; }
  if(editingCharacterId){
    await setDoc(doc(db,"characters",editingCharacterId), { name, color, updatedAt: serverTimestamp() }, { merge:true });
  } else {
    await addDoc(collection(db,"characters"), { name, color, createdAt: serverTimestamp() });
  }
  toast("Personagem salvo");
}

async function deleteCharacter(id){
  if(!confirm("Excluir este personagem? Os spots existentes não serão removidos.")) return;
  await deleteDoc(doc(db,"characters",id)); toast("Personagem excluído");
}

async function clearCurrentMap(){
  if(!confirm(`Limpar todos os spots de ${mapInfo().name}?`)) return;
  const q = query(collection(db,"spots"), where("mapId","==",currentMap));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit(); selectedSpotId = null; toast("Mapa limpo");
}

function exportLink(){
  const url = new URL(location.href); url.searchParams.set("map", currentMap);
  navigator.clipboard?.writeText(url.toString()); toast("Link copiado");
}

function escapeHtml(str=""){ return String(str).replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[ch])); }
function randomColor(){ const palette=["#ff4d4d","#ff8c32","#ffd84a","#48d17a","#52d8f2","#4e8dff","#9147ff","#ff5ccf"]; return palette[Math.floor(Math.random()*palette.length)]; }

els.mapSelect.addEventListener("change", () => { currentMap = els.mapSelect.value; selectedSpotId = null; loadMap(); });
els.mapStage.addEventListener("click", openSpotDialogForNew);
els.spotsLayer.addEventListener("click", (e) => { const spot = e.target.closest(".spot"); if(!spot) return; e.stopPropagation(); selectedSpotId = spot.dataset.id; renderSpots(); });
els.saveSpotBtn.addEventListener("click", (e) => { e.preventDefault(); saveSpot().then(()=>els.spotDialog.close()); });
els.addCharacterBtn.addEventListener("click", () => openCharacterDialog());
els.saveCharacterBtn.addEventListener("click", (e) => { e.preventDefault(); saveCharacter().then(()=>els.characterDialog.close()); });
els.charactersList.addEventListener("click", (e) => {
  const row = e.target.closest(".char-row"); if(!row) return;
  const char = characters.find(c=>c.id===row.dataset.id);
  if(e.target.classList.contains("edit-char")) openCharacterDialog(char);
  if(e.target.classList.contains("delete-char")) deleteCharacter(row.dataset.id);
});
els.characterSearch.addEventListener("input", renderCharacters);
els.showNamesToggle.addEventListener("change", renderSpots);
els.clearMapBtn.addEventListener("click", clearCurrentMap);
els.clearMapBtn2.addEventListener("click", clearCurrentMap);
els.exportBtn.addEventListener("click", exportLink);
els.shareBtn.addEventListener("click", exportLink);
els.centerMapBtn.addEventListener("click", () => toast("Mapa centralizado"));

initMaps();
subscribeCharacters();
