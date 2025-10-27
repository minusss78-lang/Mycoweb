// MycoWeb - motore di ricerca migliorato (scoring + tolleranza su campi mancanti)

// elementi UI (compatibile con le versioni precedenti)
const searchBtn = document.getElementById('searchBtn') || document.querySelector('.search-btn');
const loaderWrap = document.getElementById('loader') || document.querySelector('.loader');
const resultsList = document.getElementById('resultsList') || document.getElementById('results') || document.querySelector('.results');
const loaderText = document.getElementById('loaderText');

// utilità
const s = v => v ? String(v).toLowerCase() : '';

// campi e pesi (più alto = più importante)
const FIELD_MAP = {
  capColor: { weight: 3, jsonPath: ['caratteri.colore_cappello', 'colore_cappello', 'capColor'] },
  hymenium: { weight: 3, jsonPath: ['caratteri.imenoforo', 'imenoforo', 'hymenium'] },
  stipe: { weight: 2, jsonPath: ['caratteri.forma_gambo', 'forma_gambo', 'stipe'] },
  gillForm: { weight: 1, jsonPath: ['caratteri.forma_lamelle', 'forma_lamelle', 'gillForm'] },
  gillColor: { weight: 1, jsonPath: ['caratteri.colore_lamelle', 'colore_lamelle', 'gillColor'] },
  ring: { weight: 1, jsonPath: ['caratteri.anello', 'anello', 'ring'] },
  habitat: { weight: 1, jsonPath: ['caratteri.habitat', 'habitat'] },
  season: { weight: 1, jsonPath: ['caratteri.stagione', 'stagione'] }
};

// keywords micologiche per filtro online
const MICO_KEYWORDS = /(mushroom|fungus|amanita|boletus|russula|lactarius|cantharellus|agaricus|pleurotus|suillus|cortinarius|hydnum|hericium|coprinus|porcino|porcini)/i;

// carica DB locale una volta
let localDB = null;
async function loadLocalDB() {
  if (localDB) return localDB;
  try {
    const r = await fetch('funghi.json', { cache: 'no-cache' });
    localDB = await r.json();
    console.log('Local DB caricato voci:', localDB.length);
  } catch (e) {
    console.warn('Errore caricamento funghi.json', e);
    localDB = [];
  }
  return localDB;
}

// helper per leggere valori nested con più chiavi possibili
function getFirstValue(obj, paths) {
  if (!obj) return '';
  for (const p of paths) {
    const parts = p.split('.');
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) cur = cur[part];
      else { ok = false; break; }
    }
    if (ok && cur != null) return String(cur);
  }
  return '';
}

// prova a recuperare thumbnail da Wikipedia (come prima)
async function wikiThumb(title){
  if(!title) return null;
  const t = encodeURIComponent(title.replace(/\s+/g,'_'));
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${t}&prop=pageimages&piprop=thumbnail&pithumbsize=320`;
  try{
    const res = await fetch(url);
    const j = await res.json();
    if(j && j.query && j.query.pages){
      const keys = Object.keys(j.query.pages);
      if(keys.length>0){
        const p = j.query.pages[keys[0]];
        if(p && p.thumbnail && p.thumbnail.source) return p.thumbnail.source;
      }
    }
  }catch(e){ console.warn('wikiThumb', e); }
  return null;
}
const mushroomExpertSearch = q => `https://www.mushroomexpert.com/search?q=${encodeURIComponent(q)}`;

// funzione principale: scoring + ricerca rilassata + fallback online
async function ר(rawFilters) {
  // mostra loader
  if (loaderWrap) loaderWrap.classList.remove('hidden');
  if (loaderText) loaderText.textContent = 'Ricerca in corso...';

  const db = await loadLocalDB();

  // normalizza i filtri forniti dall'UI
  const filters = {};
  Object.keys(FIELD_MAP).forEach(k => {
    filters[k] = s(rawFilters[k] || '');
  });

  // Calcolo score per ogni record
  const scored = [];
  for (const rec of db) {
    let score = 0;
    // per ogni filtro fornito aggiungi peso se record contiene substring corrispondente
    Object.keys(FIELD_MAP).forEach(k => {
      const val = filters[k];
      if (!val) return; // filtro non fornito -> ignoralo
      const candidate = s(getFirstValue(rec, FIELD_MAP[k].jsonPath));
      if (!candidate) {
        // campo mancante nel record -> NON penalizziamo (tolleranza)
        return;
      }
      if (candidate.includes(val)) {
        score += FIELD_MAP[k].weight;
      } else {
        // fuzzy: se il candidato contiene parole separate che includono parte del filtro, conta poco
        const candidateParts = candidate.split(/[\s,\/-]+/);
        if (candidateParts.some(p => p.includes(val) || val.includes(p))) {
          score += Math.max(1, Math.floor(FIELD_MAP[k].weight/2));
        }
      }
    });

    // anche se score = 0, possiamo considerare il record in una seconda fase (search relaxed)
    if (score > 0) scored.push({ rec, score });
  }

  // se trovi match >0 ordinati e restituisci
  if (scored.length > 0) {
    scored.sort((a,b)=>b.score-a.score);
    const results = scored.map(x => x.rec);
    if (loaderWrap) loaderWrap.classList.add('hidden');
    return results.slice(0, 200); // limite risultati
  }

  // ---- NESSUN MATCH SPECIFICO: esegui "ricerca rilassata"
  // Trova record in cui QUALSIASI campo contiene ciascuna parola del filtro (OR across fields)
  const anyFilterWords = [];
  Object.values(filters).forEach(v => { if (v) anyFilterWords.push(...v.split(/\s+/)); });

  const relaxed = db.filter(rec=>{
    if (anyFilterWords.length === 0) return false;
    // concatena tutte le stringhe rilevanti del record e cerca se contiene almeno una parola
    let hay = '';
    // includi i campi chiave e alcuni descrittivi
    hay += ' ' + s(getFirstValue(rec, ['nome_italiano','nome_inglese','nome_latino']));
    Object.keys(FIELD_MAP).forEach(k => {
      hay += ' ' + s(getFirstValue(rec, FIELD_MAP[k].jsonPath));
    });
    // match se almeno una parola appare in hay
    return anyFilterWords.some(w => w && hay.includes(w));
  });

  if (relaxed.length > 0) {
    if (loaderWrap) loaderWrap.classList.add('hidden');
    return relaxed.slice(0, 200);
  }

  // nessun risultato locale → ritorna []
  if (loaderWrap) loaderWrap.classList.add('hidden');
  return [];
}

// funzione principale: scoring + ricerca rilassata + tolleranza reale
async function performSearch(rawFilters) {
  if (loaderWrap) loaderWrap.classList.remove('hidden');
  if (loaderText) loaderText.textContent = 'Ricerca in corso...';

  const db = await loadLocalDB();

  const filters = {};
  Object.keys(FIELD_MAP).forEach(k => {
    filters[k] = s(rawFilters[k] || '');
  });

  const scored = [];

  for (const rec of db) {
    let score = 0;
    let totalWeight = 0;

    Object.keys(FIELD_MAP).forEach(k => {
      const val = filters[k];
      const weight = FIELD_MAP[k].weight;
      if (!val) return; // filtro non usato

      const candidate = s(getFirstValue(rec, FIELD_MAP[k].jsonPath));

      if (!candidate) {
        // campo mancante → non penalizzare, ma considera comunque parzialmente
        totalWeight += weight; 
        score += weight * 0.5; // assegna mezzo punteggio per campo mancante
        return;
      }

      totalWeight += weight;

      if (candidate.includes(val)) {
        score += weight; // match pieno
      } else {
        const candidateParts = candidate.split(/[\s,\/-]+/);
        if (candidateParts.some(p => p.includes(val) || val.includes(p))) {
          score += weight * 0.5; // match parziale
        }
      }
    });

    // calcolo percentuale (0-1)
    const ratio = totalWeight > 0 ? score / totalWeight : 0;
    if (ratio > 0) scored.push({ rec, score: ratio });
  }

  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score);
    if (loaderWrap) loaderWrap.classList.add('hidden');
    return scored.map(x => x.rec).slice(0, 200);
  }

  // fallback: ricerca rilassata (qualunque parola)
  const anyFilterWords = [];
  Object.values(filters).forEach(v => { if (v) anyFilterWords.push(...v.split(/\s+/)); });

  const relaxed = db.filter(rec => {
    if (anyFilterWords.length === 0) return false;
    let hay = '';
    hay += ' ' + s(getFirstValue(rec, ['nome_italiano','nome_inglese','nome_latino']));
    Object.keys(FIELD_MAP).forEach(k => {
      hay += ' ' + s(getFirstValue(rec, FIELD_MAP[k].jsonPath));
    });
    return anyFilterWords.some(w => w && hay.includes(w));
  });

  if (loaderWrap) loaderWrap.classList.add('hidden');
  return relaxed.slice(0, 200);
                                 }// funzione wrapper attivata da bottone
async function runSearchFromUI() {
  // prendi valori UI: gli ID devono corrispondere a quelli nel tuo index.html
  const raw = {
    capColor: document.getElementById('capColor') ? document.getElementById('capColor').value : '',
    capShape: document.getElementById('capShape') ? document.getElementById('capShape').value : '',
    hymenium: document.getElementById('hymenium') ? document.getElementById('hymenium').value : '',
    gillForm: document.getElementById('gillForm') ? document.getElementById('gillForm').value : '',
    stipe: document.getElementById('stipe') ? document.getElementById('stipe').value : '',
    ring: document.getElementById('ring') ? document.getElementById('ring').value : '',
    habitat: document.getElementById('habitat') ? document.getElementById('habitat').value : '',
    season: document.getElementById('season') ? document.getElementById('season').value : ''
  };

  // pulisci area risultati
  if (resultsList) resultsList.innerHTML = '';

  // esegui ricerca locale robusta
  const localResults = await performSearch(raw);

  if (localResults.length > 0) {
    // Mostra risultati locali (tentando thumbs wiki paralleli)
    const thumbs = await Promise.all(localResults.map(r => wikiThumb(r.nome_latino).then(u=>u || r.immagine || r.img || '')));
    resultsList.innerHTML = '';
    localResults.forEach((r, i) => {
      const img = thumbs[i] || r.immagine || r.img || '';
      const title = r.nome_italiano || r.nome_inglese || r.nome_latino || 'Sconosciuto';
      const latin = r.nome_latino || '';
      const habitat = (r.caratteri && r.caratteri.habitat) ? r.caratteri.habitat : (r.habitat || '');
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img class="thumb" src="${img}" alt="${title}">
        <div>
          <h3>${title}</h3>
          <p class="small"><em>${latin}</em></p>
          <p class="small">${habitat}</p>
          <p style="margin-top:8px">
            <a target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/${encodeURIComponent((latin||title).replace(/\s+/g,'_'))}">Wikipedia</a>
            &nbsp;|&nbsp;
            <a target="_blank" rel="noopener" href="${mushroomExpertSearch(latin || title)}">MushroomExpert</a>
          </p>
        </div>`;
      resultsList.appendChild(card);
    });
    return;
  }

  // fallback online: costruisci query e cerca su Wikipedia (usa la API search come prima)
  const qParts = [];
  Object.keys(FIELD_MAP).forEach(k => {
    const val = s(raw[k] || '');
    if (val) qParts.push(val);
  });
  const query = qParts.join(' ').trim() || 'mushroom';

  // mostra link di fallback (se vuoi, qui possiamo aggiungere chiamata API diretta)
  resultsList.innerHTML = `<p>Nessun risultato nel database locale. Provo su Wikipedia / MushroomExpert...</p>
    <p>🔎 <a href="https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}" target="_blank">Cerca su Wikipedia</a>
    &nbsp;|&nbsp;<a href="${mushroomExpertSearch(query)}" target="_blank">Cerca su MushroomExpert</a></p>`;
}

// collega bottone (compatibile con diversi index)
if (searchBtn) {
  searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    runSearchFromUI();
  });
} else {
  // fallback: cerca un pulsante con classe .btn
  const altBtn = document.querySelector('.btn, .search-btn');
  if (altBtn) altBtn.addEventListener('click', (e)=>{ e.preventDefault(); runSearchFromUI(); });
}
