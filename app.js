import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDocs,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MAPS = [
  { id:"Nix", name:"Nix", file:"assets/maps/Nix.png" },
  { id:"Deep1", name:"Deep1", file:"assets/maps/Deep1.png" },
  { id:"Deep2", name:"Deep2", file:"assets/maps/Deep2.png" },
  { id:"Deep3", name:"Deep3", file:"assets/maps/Deep3.png" },
  { id:"Deep4", name:"Deep4", file:"assets/maps/Deep4.png" },
  { id:"Deep5", name:"Deep5", file:"assets/maps/Deep5.png" },
  { id:"Swamp_of_Darkness", name:"Swamp of Darkness", file:"assets/maps/Swamp_of_Darkness.png" },
  { id:"KuberaFire", name:"Kubera Fire", file:"assets/maps/KuberaFire.png" },
  { id:"KuberaWind", name:"Kubera Wind", file:"assets/maps/KuberaWind.png" },
  { id:"KuberaWater", name:"Kubera Water", file:"assets/maps/KuberaWater.png" },
  { id:"KuberaDark", name:"Kubera Dark", file:"assets/maps/KuberaDark.png" },
  { id:"KuberaEarth", name:"Kubera Earth", file:"assets/maps/KuberaEarth.png" },
  { id:"Abyss1", name:"Abyss1", file:"assets/maps/Abyss1.png" },
  { id:"Abyss2", name:"Abyss2", file:"assets/maps/Abyss2.png" },
  { id:"Abyss3", name:"Abyss3", file:"assets/maps/Abyss3.png" }
];

const DEFAULT_CHARACTERS = [
  ["xSuperSUM","#ff4d4d"],
  ["onlyzinha","#ff8c32"],
  ["xSuperRW","#ffd84a"],
  ["zConan","#48d17a"],
  ["SakuraSL","#52d8f2"],
  ["Elsculd","#4e8dff"],
  ["MGHashira","#9147ff"]
];

const $ = id => document.getElementById(id);

const els = {
  mapSelect:$("mapSelect"),
  mapImage:$("mapImage"),
  mapStage:$("mapStage"),
  mapInner:$("mapInner"),
  spotsLayer:$("spotsLayer"),
  currentMapName:$("currentMapName"),
  charactersList:$("charactersList"),
  characterSearch:$("characterSearch"),
  locationSearch:$("locationSearch"),
  locationResults:$("locationResults"),
  spotsCount:$("spotsCount"),
  charsCount:$("charsCount"),
  lastUpdate:$("lastUpdate"),
  showNamesToggle:$("showNamesToggle"),
  spotDialog:$("spotDialog"),
  spotCharacterSelect:$("spotCharacterSelect"),
  saveSpotBtn:$("saveSpotBtn"),
  characterDialog:$("characterDialog"),
  charNameInput:$("charNameInput"),
  charColorInput:$("charColorInput"),
  saveCharacterBtn:$("saveCharacterBtn"),
  charModalTitle:$("charModalTitle"),
  addCharacterBtn:$("addCharacterBtn"),
  spotInspector:$("spotInspector"),
  clearMapBtn:$("clearMapBtn"),
  clearMapBtn2:$("clearMapBtn2"),
  exportBtn:$("exportBtn"),
  shareBtn:$("shareBtn"),
  centerMapBtn:$("centerMapBtn")
};

let currentMap = new URLSearchParams(location.search).get("map") || "Nix";
let characters = [];
let spots = [];
let allSpots = [];
let pendingSpot = null;
let selectedSpotId = null;
let editingCharacterId = null;
let unsubChars = null;
let unsubSpots = null;
let unsubAllSpots = null;
let spotToHighlight = null;
let savingSpot = false;
let savingCharacter = false;

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function escapeHtml(str=""){
  return String(str).replace(/[&<>'"]/g, ch => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "'":"&#039;",
    '"':"&quot;"
  }[ch]));
}

function normalizeName(value=""){
  return String(value).trim().toLocaleLowerCase("pt-BR");
}

function randomColor(){
  const colors = ["#ff4d4d","#ff8c32","#ffd84a","#48d17a","#52d8f2","#4e8dff","#9147ff","#ff5ccf"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function mapInfo(mapId=currentMap){
  return MAPS.find(m => m.id === mapId) || MAPS[0];
}

function setUrlMap(){
  const url = new URL(location.href);
  url.searchParams.set("map", currentMap);
  history.replaceState(null, "", url.toString());
}

function nowLabel(){
  return new Date().toLocaleTimeString("pt-BR", {
    hour:"2-digit",
    minute:"2-digit"
  });
}

function initMaps(){
  els.mapSelect.innerHTML = MAPS
    .map(m => `<option value="${m.id}">${m.name}</option>`)
    .join("");

  if(!MAPS.some(m => m.id === currentMap)){
    currentMap = MAPS[0].id;
  }

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
  if(unsubChars) unsubChars();

  unsubChars = onSnapshot(
    collection(db, "characters"),
    async snap => {
      characters = snap.docs
        .map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => String(a.name || "").localeCompare(String(b.name || "")));

      /*
        Os personagens existentes são preservados.
        Os personagens padrão só são criados quando a coleção inteira está vazia.
      */
      if(characters.length === 0){
        await seedCharacters();
        return;
      }

      renderCharacters();
      renderCharacterOptions();
      renderStats();
    },
    err => {
      console.error(err);
      toast("Erro ao carregar personagens");
    }
  );
}

async function seedCharacters(){
  const batch = writeBatch(db);

  DEFAULT_CHARACTERS.forEach(([name,color]) => {
    batch.set(doc(collection(db, "characters")), {
      name,
      normalizedName:normalizeName(name),
      color,
      createdAt:serverTimestamp()
    });
  });

  await batch.commit();
}

function subscribeSpots(){
  if(unsubSpots) unsubSpots();

  const q = query(
    collection(db, "spots"),
    where("mapId", "==", currentMap)
  );

  unsubSpots = onSnapshot(
    q,
    snap => {
      spots = snap.docs.map(d => ({ id:d.id, ...d.data() }));

      if(
        selectedSpotId &&
        !spots.some(s => s.id === selectedSpotId)
      ){
        selectedSpotId = null;
      }

      if(
        spotToHighlight &&
        spots.some(s => s.id === spotToHighlight)
      ){
        selectedSpotId = spotToHighlight;
      }

      renderSpots();
      renderStats();

      if(spotToHighlight){
        highlightSpot(spotToHighlight);
        spotToHighlight = null;
      }
    },
    err => {
      console.error(err);
      toast("Erro ao carregar spots");
    }
  );
}

function subscribeAllSpots(){
  if(unsubAllSpots) unsubAllSpots();

  unsubAllSpots = onSnapshot(
    collection(db, "spots"),
    snap => {
      allSpots = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      renderLocationResults();
      renderCharacters();
    },
    err => {
      console.error(err);
      toast("Erro ao carregar localização dos personagens");
    }
  );
}

function characterLocation(characterId){
  return allSpots.find(s => s.charId === characterId) || null;
}

function renderCharacters(){
  const term = normalizeName(els.characterSearch.value);

  const filtered = characters.filter(c =>
    normalizeName(c.name).includes(term)
  );

  els.charactersList.innerHTML = filtered.map(c => {
    const location = characterLocation(c.id);
    const mapName = location ? mapInfo(location.mapId).name : "Sem spot";

    return `
      <div
        class="char-row ${location ? "has-location" : "no-location"}"
        data-id="${c.id}"
        title="${location ? `Abrir ${escapeHtml(mapName)}` : "Personagem ainda não está em um spot"}"
      >
        <span
          class="dot"
          style="color:${c.color};background:${c.color}"
        ></span>

        <button
          class="char-location-btn"
          type="button"
          data-action="locate"
        >
          <span class="char-name">${escapeHtml(c.name)}</span>
          <small>${escapeHtml(mapName)}</small>
        </button>

        <button
          class="text-btn edit-char"
          type="button"
        >
          Editar
        </button>

        <button
          class="x-btn delete-char"
          type="button"
          aria-label="Excluir ${escapeHtml(c.name)}"
        >
          ×
        </button>
      </div>
    `;
  }).join("") || '<p class="muted">Nenhum personagem.</p>';
}

function renderCharacterOptions(){
  els.spotCharacterSelect.innerHTML = characters
    .map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");
}

function renderLocationResults(){
  if(!els.locationSearch || !els.locationResults) return;

  const term = normalizeName(els.locationSearch.value);

  if(!term){
    els.locationResults.innerHTML = "";
    els.locationResults.classList.remove("show");
    return;
  }

  /*
    Procura primeiro pelos spots.
    Também compara charId e nome para funcionar com registros antigos.
  */
  const matchingCharacters = characters.filter(c =>
    normalizeName(c.name).includes(term)
  );

  const matchingIds = new Set(
    matchingCharacters.map(c => c.id)
  );

  const results = allSpots
    .filter(s =>
      matchingIds.has(s.charId) ||
      normalizeName(
        s.charName || s.normalizedCharName || ""
      ).includes(term)
    )
    .sort((a,b) =>
      String(a.charName || "").localeCompare(
        String(b.charName || "")
      )
    );

  if(results.length === 0){
    const characterWithoutSpot = matchingCharacters[0];

    els.locationResults.innerHTML = characterWithoutSpot
      ? `
        <div class="location-empty">
          <strong>${escapeHtml(characterWithoutSpot.name)}</strong>
          <span>Esse personagem não está em nenhum spot.</span>
        </div>
      `
      : `
        <div class="location-empty">
          Nenhum personagem encontrado.
        </div>
      `;

    els.locationResults.classList.add("show");
    return;
  }

  els.locationResults.innerHTML = results.map(s => {
    const map = mapInfo(s.mapId);
    const x = Number(s.x);
    const y = Number(s.y);

    return `
      <button
        class="location-result"
        type="button"
        data-map="${escapeHtml(s.mapId)}"
        data-spot="${escapeHtml(s.id)}"
      >
        <span
          class="dot"
          style="
            color:${s.color || "#ff4d4d"};
            background:${s.color || "#ff4d4d"}
          "
        ></span>

        <span class="location-result-info">
          <strong>${escapeHtml(s.charName || "Sem nome")}</strong>

          <span class="location-map-name">
            Mapa: ${escapeHtml(map.name)}
          </span>

          <small>
            Posição: ${Number.isFinite(x) ? x.toFixed(1) : "--"}% /
            ${Number.isFinite(y) ? y.toFixed(1) : "--"}%
          </small>
        </span>

        <span class="location-open">
          Abrir
        </span>
      </button>
    `;
  }).join("");

  els.locationResults.classList.add("show");
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
    const selected = selectedSpotId === s.id ? " selected" : "";

    return `
      <div
        class="spot${hidden}${selected}"
        data-id="${s.id}"
        style="left:${s.x}%;top:${s.y}%;color:${color}"
      >
        <span
          class="spot-dot"
          style="background:${color}"
        ></span>

        <span class="spot-label">
          ${escapeHtml(s.charName || "Sem nome")}
        </span>
      </div>
    `;
  }).join("");

  renderInspector();
}

function renderInspector(){
  const s = spots.find(x => x.id === selectedSpotId);

  if(!s){
    els.spotInspector.innerHTML = `
      <h3>Spot Selecionado</h3>
      <p class="muted">Clique em um spot para editar ou excluir.</p>
    `;
    return;
  }

  els.spotInspector.innerHTML = `
    <h3>Spot Selecionado</h3>

    <div class="inspector-row">
      <span>Mapa</span>
      <strong>${escapeHtml(mapInfo().name)}</strong>
    </div>

    <div class="inspector-row">
      <span>Char</span>
      <strong>${escapeHtml(s.charName || "--")}</strong>
    </div>

    <div class="inspector-row">
      <span>X / Y</span>
      <strong>${Number(s.x).toFixed(1)}% / ${Number(s.y).toFixed(1)}%</strong>
    </div>

    <button
      class="wide blue-outline"
      id="editSpotBtn"
      type="button"
    >
      Editar Spot
    </button>

    <button
      class="wide danger-outline"
      id="deleteSpotBtn"
      type="button"
    >
      Excluir Spot
    </button>
  `;

  $("editSpotBtn").onclick = () => openSpotDialogForEdit(s);
  $("deleteSpotBtn").onclick = () => deleteSpot(s.id);
}

function pointToPercent(event){
  const r = els.mapInner.getBoundingClientRect();
  const x = ((event.clientX - r.left) / r.width) * 100;
  const y = ((event.clientY - r.top) / r.height) * 100;

  return {
    x:Math.max(0, Math.min(100, x)),
    y:Math.max(0, Math.min(100, y))
  };
}

function clickInsideMap(event){
  const r = els.mapInner.getBoundingClientRect();

  return (
    event.clientX >= r.left &&
    event.clientX <= r.right &&
    event.clientY >= r.top &&
    event.clientY <= r.bottom
  );
}

function openSpotDialogForNew(event){
  if(event.target.closest(".spot")) return;
  if(!clickInsideMap(event)) return;

  if(characters.length === 0){
    toast("Adicione um personagem primeiro");
    return;
  }

  pendingSpot = {
    ...pointToPercent(event),
    mode:"new"
  };

  els.spotCharacterSelect.value = characters[0].id;
  $("modalTitle").textContent = "Adicionar Spot";
  els.spotDialog.showModal();
}

function openSpotDialogForEdit(spot){
  pendingSpot = {
    ...spot,
    mode:"edit"
  };

  els.spotCharacterSelect.value = spot.charId || characters[0]?.id;
  $("modalTitle").textContent = "Editar Spot";
  els.spotDialog.showModal();
}

/*
  Ao salvar:
  1. Procura o personagem em TODOS os 15 mapas.
  2. Exclui qualquer spot antigo do mesmo charId.
  3. Salva o personagem no novo spot.
  4. Não altera nem exclui a coleção "characters".
*/
async function saveSpot(){
  if(!pendingSpot || savingSpot) return false;

  const char = characters.find(
    c => c.id === els.spotCharacterSelect.value
  );

  if(!char){
    toast("Selecione um personagem");
    return false;
  }

  savingSpot = true;
  els.saveSpotBtn.disabled = true;

  try{
    const existingQuery = query(
      collection(db, "spots"),
      where("charId", "==", char.id)
    );

    const existingSnap = await getDocs(existingQuery);
    const batch = writeBatch(db);

    const targetRef = pendingSpot.mode === "edit"
      ? doc(db, "spots", pendingSpot.id)
      : doc(collection(db, "spots"));

    existingSnap.docs.forEach(existingDoc => {
      if(existingDoc.id !== targetRef.id){
        batch.delete(existingDoc.ref);
      }
    });

    const payload = {
      mapId:currentMap,
      x:pendingSpot.x,
      y:pendingSpot.y,
      charId:char.id,
      charName:char.name,
      normalizedCharName:normalizeName(char.name),
      color:char.color,
      updatedAt:serverTimestamp()
    };

    if(pendingSpot.mode === "edit"){
      batch.set(targetRef, payload, { merge:true });
    }else{
      batch.set(targetRef, {
        ...payload,
        createdAt:serverTimestamp()
      });
    }

    await batch.commit();

    selectedSpotId = targetRef.id;
    pendingSpot = null;
    toast("Spot salvo e posição antiga removida");

    return true;
  }catch(error){
    console.error(error);
    toast("Erro ao salvar spot");
    return false;
  }finally{
    savingSpot = false;
    els.saveSpotBtn.disabled = false;
  }
}

async function deleteSpot(id){
  if(!confirm("Excluir este spot?")) return;

  try{
    await deleteDoc(doc(db, "spots", id));
    selectedSpotId = null;
    toast("Spot excluído");
  }catch(error){
    console.error(error);
    toast("Erro ao excluir spot");
  }
}

function openCharacterDialog(char=null){
  editingCharacterId = char?.id || null;
  els.charModalTitle.textContent = char ? "Editar Personagem" : "Adicionar Personagem";
  els.charNameInput.value = char?.name || "";
  els.charColorInput.value = char?.color || randomColor();
  els.characterDialog.showModal();
}

async function saveCharacter(){
  if(savingCharacter) return false;

  const name = els.charNameInput.value.trim();
  const color = els.charColorInput.value;

  if(!name){
    toast("Digite o nome do personagem");
    return false;
  }

  const duplicate = characters.find(c =>
    normalizeName(c.name) === normalizeName(name) &&
    c.id !== editingCharacterId
  );

  if(duplicate){
    toast("Já existe um personagem com esse nome");
    return false;
  }

  savingCharacter = true;
  els.saveCharacterBtn.disabled = true;

  try{
    if(editingCharacterId){
      await setDoc(
        doc(db, "characters", editingCharacterId),
        {
          name,
          normalizedName:normalizeName(name),
          color,
          updatedAt:serverTimestamp()
        },
        { merge:true }
      );

      await updateCharacterSpots(editingCharacterId, name, color);
    }else{
      await addDoc(collection(db, "characters"), {
        name,
        normalizedName:normalizeName(name),
        color,
        createdAt:serverTimestamp()
      });
    }

    editingCharacterId = null;
    toast("Personagem salvo");
    return true;
  }catch(error){
    console.error(error);
    toast("Erro ao salvar personagem");
    return false;
  }finally{
    savingCharacter = false;
    els.saveCharacterBtn.disabled = false;
  }
}

async function updateCharacterSpots(characterId, name, color){
  const q = query(
    collection(db, "spots"),
    where("charId", "==", characterId)
  );

  const snap = await getDocs(q);

  if(snap.empty) return;

  const batch = writeBatch(db);

  snap.docs.forEach(d => {
    batch.set(
      d.ref,
      {
        charName:name,
        normalizedCharName:normalizeName(name),
        color,
        updatedAt:serverTimestamp()
      },
      { merge:true }
    );
  });

  await batch.commit();
}

async function deleteCharacter(id){
  if(!confirm("Excluir este personagem? Os spots existentes não serão removidos.")) return;

  try{
    await deleteDoc(doc(db, "characters", id));
    toast("Personagem excluído");
  }catch(error){
    console.error(error);
    toast("Erro ao excluir personagem");
  }
}

async function clearCurrentMap(){
  if(!confirm(`Limpar todos os spots de ${mapInfo().name}?`)) return;

  try{
    const q = query(
      collection(db, "spots"),
      where("mapId", "==", currentMap)
    );

    const snap = await getDocs(q);
    const batch = writeBatch(db);

    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    selectedSpotId = null;
    toast("Mapa limpo");
  }catch(error){
    console.error(error);
    toast("Erro ao limpar mapa");
  }
}

function exportLink(){
  const url = new URL(location.href);
  url.searchParams.set("map", currentMap);

  navigator.clipboard?.writeText(url.toString())
    .then(() => toast("Link copiado"))
    .catch(() => toast("Não foi possível copiar o link"));
}

function locateCharacter(mapId, spotId){
  const targetMap = MAPS.find(m => m.id === mapId);

  if(!targetMap){
    toast("Mapa não encontrado");
    return;
  }

  currentMap = mapId;
  selectedSpotId = spotId;
  spotToHighlight = spotId;
  loadMap();

  els.locationResults?.classList.remove("show");
  toast(`Abrindo ${targetMap.name}`);
}

function locateCharacterFromList(characterId){
  const location = characterLocation(characterId);

  if(!location){
    toast("Esse personagem ainda não está em nenhum spot");
    return;
  }

  locateCharacter(location.mapId, location.id);
}

function highlightSpot(spotId){
  requestAnimationFrame(() => {
    const spotElement = els.spotsLayer.querySelector(
      `.spot[data-id="${spotId}"]`
    );

    if(!spotElement) return;

    spotElement.classList.add("located");
    spotElement.scrollIntoView({
      behavior:"smooth",
      block:"center",
      inline:"center"
    });

    setTimeout(() => {
      spotElement.classList.remove("located");
    }, 3200);
  });
}

els.mapSelect.addEventListener("change", () => {
  currentMap = els.mapSelect.value;
  selectedSpotId = null;
  spotToHighlight = null;
  loadMap();
});

els.mapInner.addEventListener("click", openSpotDialogForNew);

els.spotsLayer.addEventListener("click", e => {
  const spot = e.target.closest(".spot");
  if(!spot) return;

  e.stopPropagation();
  selectedSpotId = spot.dataset.id;
  renderSpots();
});

els.saveSpotBtn.addEventListener("click", async e => {
  e.preventDefault();

  const saved = await saveSpot();
  if(saved) els.spotDialog.close();
});

els.addCharacterBtn.addEventListener("click", () => openCharacterDialog());

els.saveCharacterBtn.addEventListener("click", async e => {
  e.preventDefault();

  const saved = await saveCharacter();
  if(saved) els.characterDialog.close();
});

els.charactersList.addEventListener("click", e => {
  const row = e.target.closest(".char-row");
  if(!row) return;

  const char = characters.find(c => c.id === row.dataset.id);
  if(!char) return;

  if(e.target.closest(".edit-char")){
    openCharacterDialog(char);
    return;
  }

  if(e.target.closest(".delete-char")){
    deleteCharacter(row.dataset.id);
    return;
  }

  if(e.target.closest('[data-action="locate"]')){
    locateCharacterFromList(row.dataset.id);
  }
});

els.characterSearch.addEventListener("input", renderCharacters);

els.locationSearch.addEventListener("input", renderLocationResults);

els.locationResults.addEventListener("click", e => {
  const result = e.target.closest(".location-result");
  if(!result) return;

  locateCharacter(result.dataset.map, result.dataset.spot);
});

els.showNamesToggle.addEventListener("change", renderSpots);
els.clearMapBtn.addEventListener("click", clearCurrentMap);
els.clearMapBtn2.addEventListener("click", clearCurrentMap);
els.exportBtn.addEventListener("click", exportLink);
els.shareBtn.addEventListener("click", exportLink);

els.centerMapBtn.addEventListener("click", () => {
  els.mapInner.scrollIntoView({
    behavior:"smooth",
    block:"center",
    inline:"center"
  });

  toast("Mapa centralizado");
});

initMaps();
subscribeCharacters();
subscribeAllSpots();
