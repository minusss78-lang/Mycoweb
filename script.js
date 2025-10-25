// MycoWeb v3 - ricerca nel DB locale + thumbnails da Wikipedia (origin=*)
let fungiDB = [];

// load DB once
async function loadDB(){
  if(fungiDB.length>0) return fungiDB;
  try{
    const r = await fetch('funghi.json', {cache:'no-cache'});
    fungiDB = await r.json();
    console.log('DB caricato:', fungiDB.length);
  }catch(e){
    console.error('Errore caricamento funghi.json', e);
    fungiDB = [];
  }
  return fungiDB;
}

// helper lowercase safe
function s(v){ return v ? String(v).toLowerCase() : ''; }

// fetch thumbnail from wikipedia (english wiki using latin name)
async function fetchThumb(nameLatin){
  if(!nameLatin) return null;
  const title = encodeURIComponent(nameLatin.replace(/\s+/g,'_'));
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${title}&prop=pageimages&piprop=thumbnail&pithumbsize=240`;
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
  }catch(e){ console.warn('thumb fetch error', e); }
  return null;
}

// UI refs
const langSelect = document.getElementById('langSelect');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loaderText');
const searchBtn = document.getElementById('searchBtn');
const resultsList = document.getElementById('resultsList');
const splash = document.getElementById('splash');

// texts
const T = {
  it: { searching: 'Ricerca in corso...', noresults: 'Nessun fungo trovato nel database locale.', results: 'Risultati' },
  en: { searching: 'Searching...', noresults: 'No mushrooms found in local database.', results: 'Results' }
};

// hide splash after small delay
window.addEventListener('load', ()=> setTimeout(()=>{ if(splash) splash.style.display='none'; },1400));

// change language updates loader text + headings
langSelect.addEventListener('change', ()=> {
  const L = langSelect.value || 'it';
  loaderText.textContent = T[L].searching;
  document.getElementById('resultsTitle').textContent = (L==='en')? 'Results' : 'Risultati';
  document.getElementById('filtersTitle').textContent = (L==='en')? 'Filters' : 'Filtri';
  document.getElementById('siteTitle').textContent = (L==='en')? 'MycoWeb' : 'MycoWeb';
});

// main search handler
searchBtn.addEventListener('click', async ()=>{
  loader.classList.remove('hidden');
  resultsList.innerHTML = '';
  loaderText.textContent = T[langSelect.value || 'it'].searching;

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

  const db = await loadDB();

  // filter DB using substring matching on caratteri
  const matches = db.filter(item=>{
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
    }catch(e){
      return false;
    }
  });

  if(matches.length===0){
    resultsList.innerHTML = `<p>${T[langSelect.value || 'it'].noresults}</p>
      <p>🔎 <a target="_blank" rel="noopener" href="https://www.mushroomexpert.com/">Cerca su MushroomExpert</a></p>`;
    loader.classList.add('hidden');
    return;
  }

  // request thumbnails (in parallel)
  const thumbs = await Promise.all(matches.map(m => fetchThumb(m.nome_latino).then(u => u || m.immagine || m.img || '')));

  // render
  resultsList.innerHTML = '';
  matches.forEach((m,i) => {
    const imgsrc = thumbs[i] || m.immagine || m.img || '';
    const nameIt = m.nome_italiano || m.nome_latino || m.nome;
    const lat = m.nome_latino || '';
    const habitat = (m.caratteri && m.caratteri.habitat) ? m.caratteri.habitat : '';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img class="thumb" src="${imgsrc}" alt="${nameIt}">
      <div>
        <h3>${nameIt}</h3>
        <p class="small"><em>${lat}</em></p>
        <p class="small">${habitat}</p>
        <p style="margin-top:6px"><a target="_blank" rel="noopener" href="https://www.mushroomexpert.com/${encodeURIComponent((lat||'').toLowerCase().replace(/\s+/g,'_'))}.html">MushroomExpert</a> &nbsp;|&nbsp;
        <a target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/${encodeURIComponent((lat||'').replace(/\s+/g,'_'))}">Wikipedia</a></p>
      </div>`;
    resultsList.appendChild(card);
  });

  loader.classList.add('hidden');
});
