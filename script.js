// MycoWeb v5 - ricerca locale + ricerca online filtrata - lingua it/en/la
const langSelect = document.getElementById('langSelect');
const labels = {
  it: {
    filters: 'Filtri',
    results: 'Risultati',
    searching: 'Ricerca in corso...',
    none: 'Nessun fungo trovato',
    searchBtn: '🔍 Cerca'
  },
  en: {
    filters: 'Filters',
    results: 'Results',
    searching: 'Searching...',
    none: 'No mushrooms found',
    searchBtn: '🔍 Search'
  },
  la: {
    filters: 'Filtra',
    results: 'Resulta',
    searching: 'Inquisitione...',
    none: 'Nullus fungus repertus',
    searchBtn: '🔍 Quaere'
  }
};

function setLanguage(lang){
  document.getElementById('filtersTitle').textContent = labels[lang].filters;
  document.getElementById('resultsTitle').textContent = labels[lang].results;
  document.getElementById('loaderText').textContent = labels[lang].searching;
  document.getElementById('searchBtn').textContent = labels[lang].searchBtn;
}
langSelect.addEventListener('change', ()=> setLanguage(langSelect.value));
setLanguage(langSelect.value || 'it');

let db = [];

// load local DB
async function loadDB(){
  if(db.length) return db;
  try{
    const r = await fetch('funghi.json', {cache:'no-cache'});
    db = await r.json();
    console.log('DB caricato:', db.length);
  }catch(e){
    console.error('Impossibile caricare funghi.json', e);
    db = [];
  }
  return db;
}

// helper
const s = v => v ? String(v).toLowerCase() : '';

// keywords di sicurezza micologica
const MICO_KEYWORDS = /(mushroom|fungus|amanita|boletus|russula|lactarius|cantharellus|agaricus|pleurotus|suillus|cortinarius|hydnum|hericium|coprinus)/i;

// wikipedia thumbnail by title (EN)
async function wikiThumb(title){
  if(!title) return null;
  const t = encodeURIComponent(title.replace(/\s+/g,'_'));
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${t}&prop=pageimages&piprop=thumbnail&pithumbsize=320`;
  try{
    const res = await fetch(url);
    const j = await res.json();
    if(j && j.query && j.query.pages){
      const k = Object.keys(j.query.pages)[0];
      const p = j.query.pages[k];
      if(p && p.thumbnail && p.thumbnail.source) return p.thumbnail.source;
    }
  }catch(e){ console.warn('wikiThumb error', e); }
  return null;
}

// build MushroomExpert search
function mushroomExpertSearch(q){
  return `https://www.mushroomexpert.com/search?q=${encodeURIComponent(q)}`;
}

document.getElementById('searchBtn').addEventListener('click', async ()=>{
  const loader = document.getElementById('loader');
  const resultsList = document.getElementById('resultsList');
  loader.classList.remove('hidden');
  resultsList.innerHTML = '';

  // collect filters
  const filters = {
    capColor: s(document.getElementById('capColor').value),
    capShape: s(document.getElementById('capShape').value),
    hymenium: s(document.getElementById('hymenium').value),
    gillForm: s(document.getElementById('gillForm').value),
    gillColor: s(document.getElementById('gillColor').value),
    stipe: s(document.getElementById('stipe').value),
    ring: s(document.getElementById('ring').value),
    volva: s(document.getElementById('volva').value),
    smell: s(document.getElementById('smell').value),
    habitat: s(document.getElementById('habitat').value),
    season: s(document.getElementById('season').value),
    altitude: s(document.getElementById('altitude').value)
  };

  const localDB = await loadDB();

  // local filtering (all selected filters must match substring)
  let matches = localDB.filter(item=>{
    const c = item.caratteri || {};
    try{
      if(filters.capColor && !s(c.colore_cappello).includes(filters.capColor)) return false;
      if(filters.capShape && !s(c.forma_cappello).includes(filters.capShape)) return false;
      if(filters.hymenium && !s(c.imenoforo).includes(filters.hymenium)) return false;
      if(filters.gillForm && !s(c.forma_lamelle).includes(filters.gillForm)) return false;
      if(filters.gillColor && !s(c.colore_lamelle).includes(filters.gillColor)) return false;
      if(filters.stipe && !s(c.forma_gambo).includes(filters.stipe)) return false;
      if(filters.ring && !s(c.anello).includes(filters.ring)) return false;
      if(filters.volva && !s(c.volva).includes(filters.volva)) return false;
      if(filters.smell && !s(c.odore).includes(filters.smell)) return false;
      if(filters.habitat && !s(c.habitat).includes(filters.habitat)) return false;
      if(filters.season && !s(c.stagione).includes(filters.season)) return false;
      if(filters.altitude && !s(c.altitudine).includes(filters.altitude)) return false;
      return true;
    }catch(e){ return false; }
  });

  // render local matches first (with thumbnail attempts)
  if(matches.length>0){
    // attempt wiki thumbs in parallel
    const thumbs = await Promise.all(matches.map(m => wikiThumb(m.nome_latino).then(u => u || m.immagine || m.img || '')));
    resultsList.innerHTML = '';
    for(let i=0;i<matches.length;i++){
      const m = matches[i];
      const img = thumbs[i] || m.immagine || m.img || '';
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img class="thumb" src="${img}" alt="${m.nome_italiano || m.nome_latino}">
        <div>
          <h3>${m.nome_italiano || m.nome_inglese || m.nome_latino}</h3>
          <p class="small"><em>${m.nome_latino || ''}</em></p>
          <p class="small">${m.caratteri && m.caratteri.habitat ? m.caratteri.habitat : ''}</p>
          <p style="margin-top:8px">
            <a target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/${encodeURIComponent((m.nome_latino||'').replace(/\s+/g,'_'))}">Wikipedia</a>
            &nbsp;|&nbsp;
            <a target="_blank" rel="noopener" href="${mushroomExpertSearch(m.nome_latino || m.nome_italiano || '')}">MushroomExpert</a>
          </p>
        </div>`;
      resultsList.appendChild(card);
    }
    loader.classList.add('hidden');
    return;
  }

  // no local matches -> do online search but filter results for micological content
  const queryParts = [];
  Object.values(filters).forEach(v => { if(v) queryParts.push(v); });
  const query = queryParts.join(' ').trim() || 'mushroom';

  // Wikipedia search (EN)
  try{
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const resp = await fetch(wikiSearchUrl);
    const j = await resp.json();
    const hits = (j && j.query && j.query.search) ? j.query.search.slice(0,8) : [];

    const filtered = [];
    for(const h of hits){
      // quick check: snippet should contain micological keywords
      if(MICO_KEYWORDS.test(h.snippet)){
        const title = h.title;
        const thumb = await wikiThumb(title);
        filtered.push({
          nome_italiano: title,
          nome_latino: title,
          nome_inglese: title,
          immagine: thumb || '',
          link_wiki: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g,'_'))}`
        });
      }
    }

    if(filtered.length>0){
      resultsList.innerHTML = '';
      filtered.forEach(f=>{
        const card = document.createElement('div'); card.className='card';
        card.innerHTML = `
          <img class="thumb" src="${f.immagine}" alt="${f.nome_italiano}">
          <div>
            <h3>${f.nome_italiano}</h3>
            <p class="small"><em>${f.nome_latino}</em></p>
            <p style="margin-top:8px"><a href="${f.link_wiki}" target="_blank">Wikipedia</a></p>
          </div>`;
        resultsList.appendChild(card);
      });
      loader.classList.add('hidden');
      return;
    }
  }catch(e){ console.warn('wiki search failed', e); }

  // final fallback: link to MushroomExpert search
  resultsList.innerHTML = `<p>${labels[langSelect.value || 'it'].none}</p>
    <p>🔎 <a href="${mushroomExpertSearch(query)}" target="_blank">Cerca su MushroomExpert</a></p>`;
  loader.classList.add('hidden');
});
