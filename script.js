// MycoWeb final script - ricerca locale fuzzy + ricerca online filtrata - lingue IT/EN/LA
const langSelect = document.getElementById('langSelect');
const searchBtn = document.getElementById('searchBtn');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loaderText');
const resultsList = document.getElementById('resultsList');
const resultsTitle = document.getElementById('resultsTitle');
const filtersTitle = document.getElementById('filtersTitle');

const DICT = {
  it: {
    filters: 'Filtri',
    results: 'Risultati',
    searching: 'Ricerca in corso...',
    none: 'Nessun fungo trovato nel database locale. Provo online...',
    searchBtn: '🔍 Cerca'
  },
  en: {
    filters: 'Filters',
    results: 'Results',
    searching: 'Searching...',
    none: 'No mushrooms found locally. Trying online...',
    searchBtn: '🔍 Search'
  },
  la: {
    filters: 'Filtra',
    results: 'Resulta',
    searching: 'Inquisitione...',
    none: 'Nullus fungus repertus localiter. In rete quaeritur...',
    searchBtn: '🔍 Quaere'
  }
};

function setLanguage(l='it'){
  filtersTitle.textContent = DICT[l].filters;
  resultsTitle.textContent = DICT[l].results;
  loaderText.textContent = DICT[l].searching;
  searchBtn.textContent = DICT[l].searchBtn;
}
langSelect.addEventListener('change', ()=> setLanguage(langSelect.value));
setLanguage(langSelect.value || 'it');

let localDB = [];

// load JSON (once)
async function loadLocalDB(){
  if(localDB.length) return localDB;
  try{
    const r = await fetch('funghi.json', {cache:'no-cache'});
    localDB = await r.json();
    console.log('Local DB loaded:', localDB.length);
  }catch(e){
    console.warn('Unable to load funghi.json', e);
    localDB = [];
  }
  return localDB;
}

// helper lowercase safe
const s = v => v ? String(v).toLowerCase() : '';

// micro-list of micological keywords to filter online hits
const MICO_KEYWORDS = /(mushroom|fungus|amanita|boletus|russula|lactarius|cantharellus|agaricus|pleurotus|suillus|cortinarius|hydnum|hericium|coprinus|porcino|porcini)/i;

// fetch thumbnail from wiki by title
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
  }catch(e){ console.warn('wikiThumb error', e); }
  return null;
}

// build MushroomExpert search link
const mushroomExpertSearch = q => `https://www.mushroomexpert.com/search?q=${encodeURIComponent(q)}`;

// main search
searchBtn.addEventListener('click', async ()=>{
  loader.classList.remove('hidden');
  resultsList.innerHTML = '';
  loaderText.textContent = DICT[langSelect.value || 'it'].searching;

  // collect filters (primary ones are capColor, hymenium, stipe)
  const filters = {
    capColor: s(document.getElementById('capColor').value),
    capShape: s(document.getElementById('capShape').value),
    hymenium: s(document.getElementById('hymenium').value),
    gillForm: s(document.getElementById('gillForm').value),
    stipe: s(document.getElementById('stipe').value),
    ring: s(document.getElementById('ring').value),
    habitat: s(document.getElementById('habitat').value),
    season: s(document.getElementById('season').value)
  };

  const db = await loadLocalDB();

  // fuzzy local matching: a record matches if ALL provided (non-empty) filters are substrings of corresponding fields
  const localMatches = db.filter(item=>{
    const c = item.caratteri || {};
    try{
      if(filters.capColor && !s(c.colore_cappello).includes(filters.capColor)) return false;
      if(filters.capShape && !s(c.forma_cappello).includes(filters.capShape)) return false;
      if(filters.hymenium && !s(c.imenoforo).includes(filters.hymenium)) return false;
      if(filters.gillForm && !s(c.forma_lamelle).includes(filters.gillForm)) return false;
      if(filters.stipe && !s(c.forma_gambo).includes(filters.stipe)) return false;
      if(filters.ring && !s(c.anello).includes(filters.ring)) return false;
      if(filters.habitat && !s(c.habitat).includes(filters.habitat)) return false;
      if(filters.season && !s(c.stagione).includes(filters.season)) return false;
      return true;
    }catch(e){ return false; }
  });

  // if local matches found -> show them (order: most fields matched first)
  if(localMatches.length > 0){
    // sort by number of non-empty filter matches (more specific first)
    const scored = localMatches.map(m => {
      let score=0;
      const c = m.caratteri || {};
      Object.keys(filters).forEach(k => {
        if(filters[k] && s(c[{
          capColor:'colore_cappello', capShape:'forma_cappello', hymenium:'imenoforo',
          gillForm:'forma_lamelle', stipe:'forma_gambo', ring:'anello', habitat:'habitat', season:'stagione'
        }[k]]).includes(filters[k])) score++;
      });
      return {m,score};
    }).sort((a,b)=>b.score-a.score).map(x=>x.m);

    // attempt to fetch thumbs in parallel
    const thumbs = await Promise.all(scored.map(it => wikiThumb(it.nome_latino).then(u=>u || it.immagine || it.img || '')));

    resultsList.innerHTML = '';
    scored.forEach((m,i)=>{
      const imgsrc = thumbs[i] || '';
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img class="thumb" src="${imgsrc}" alt="${m.nome_italiano||m.nome_latino}">
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
    });
    loader.classList.add('hidden');
    return;
  }

  // NO local matches -> perform Wikipedia search (EN) using the provided filters keywords
  const qParts = [];
  Object.values(filters).forEach(v => { if(v) qParts.push(v); });
  const query = qParts.join(' ').trim() || 'mushroom';

  try{
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const r = await fetch(wikiSearchUrl);
    const j = await r.json();
    const hits = (j && j.query && j.query.search) ? j.query.search.slice(0,8) : [];

    const filtered = [];
    for(const hit of hits){
      // basic filter: snippet or title must contain micological keyword
      if(MICO_KEYWORDS.test(hit.snippet) || MICO_KEYWORDS.test(hit.title)){
        const title = hit.title;
        const thumb = await wikiThumb(title);
        filtered.push({title,thumb,link:`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g,'_'))}`});
      }
    }

    if(filtered.length>0){
      resultsList.innerHTML = '';
      filtered.forEach(f=>{
        const card = document.createElement('div'); card.className='card';
        card.innerHTML = `
          <img class="thumb" src="${f.thumb || ''}" alt="${f.title}">
          <div>
            <h3>${f.title}</h3>
            <p class="small"><em>Wikipedia</em></p>
            <p style="margin-top:8px"><a href="${f.link}" target="_blank">Scheda Wikipedia</a></p>
          </div>`;
        resultsList.appendChild(card);
      });
      loader.classList.add('hidden');
      return;
    }
  }catch(e){ console.warn('Wikipedia search failed', e); }

  // fallback: show MushroomExpert link for the query
  resultsList.innerHTML = `<p>${DICT[langSelect.value || 'it'].none}</p>
    <p>🔎 <a target="_blank" rel="noopener" href="${mushroomExpertSearch(query)}">Cerca su MushroomExpert: ${query}</a></p>`;
  loader.classList.add('hidden');
});
