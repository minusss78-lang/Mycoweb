// Ricerca principale MycoWeb
async function searchMushrooms() {
  const colorCap = document.getElementById("coloreCappello").value.toLowerCase();
  const shapeCap = document.getElementById("formaCappello").value.toLowerCase();
  const typeGills = document.getElementById("tipoLamelle").value.toLowerCase();
  const colorGills = document.getElementById("coloreLamelle").value.toLowerCase();
  const shapeStipe = document.getElementById("formaGambo").value.toLowerCase();
  const smell = document.getElementById("odore").value.toLowerCase();
  const habitat = document.getElementById("habitat").value.toLowerCase();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  // Mostra funghetto rotante
  const spinner = document.createElement("div");
  spinner.classList.add("spinner");
  resultsDiv.appendChild(spinner);

  try {
    const response = await fetch("funghi.json");
    const data = await response.json();
    const results = [];

    // Ricerca fuzzy: calcolo punteggio
    for (const f of data) {
      let score = 0;
      if (colorCap && f.coloreCappello.toLowerCase().includes(colorCap)) score++;
      if (shapeCap && f.formaCappello.toLowerCase().includes(shapeCap)) score++;
      if (typeGills && f.tipoLamelle.toLowerCase().includes(typeGills)) score++;
      if (colorGills && f.coloreLamelle.toLowerCase().includes(colorGills)) score++;
      if (shapeStipe && f.formaGambo.toLowerCase().includes(shapeStipe)) score++;
      if (smell && f.odore.toLowerCase().includes(smell)) score++;
      if (habitat && f.habitat.toLowerCase().includes(habitat)) score++;
      if (score > 0) results.push({ ...f, score });
    }

    results.sort((a, b) => b.score - a.score);
    resultsDiv.innerHTML = "";

    if (results.length > 0) {
      results.forEach(f => {
        const div = document.createElement("div");
        div.classList.add("result-card");
        div.innerHTML = `
          <h3>${f.nomeItaliano}</h3>
          <p><em>${f.nomeLatino}</em> (${f.nomeInglese})</p>
          <img src="${f.immagine}" alt="${f.nomeItaliano}" class="thumb">
          <p><strong>Habitat:</strong> ${f.habitat}</p>
          <p><strong>Comestibilità:</strong> ${f.commestibile}</p>
          <a href="${f.link}" target="_blank">📘 Scheda su Wikipedia</a>
        `;
        resultsDiv.appendChild(div);
      });
    } else {
      resultsDiv.innerHTML = "<p>Nessun fungo trovato nel database locale. Cerco online...</p>";
      const query = encodeURIComponent(`${colorCap} ${shapeCap} ${typeGills} ${habitat} mushroom`);
      const wikiLink = `https://en.wikipedia.org/wiki/Special:Search?search=${query}`;
      const expertLink = `https://www.mushroomexpert.com/cgi-bin/search.pl?search=${query}`;
      resultsDiv.innerHTML += `
        <a href="${wikiLink}" target="_blank">🔍 Cerca su Wikipedia</a><br>
        <a href="${expertLink}" target="_blank">🔍 Cerca su MushroomExpert</a>
      `;
    }

  } catch (error) {
    resultsDiv.innerHTML = "<p>Errore nel caricamento del database.</p>";
    console.error(error);
  }
}

// Gestione cambio lingua (semplice)
function changeLanguage(lang) {
  document.documentElement.lang = lang;
  const labels = {
    it: {
      search: "Cerca Funghi",
      results: "Risultati della Ricerca"
    },
    en: {
      search: "Search Mushrooms",
      results: "Search Results"
    },
    la: {
      search: "Quaerere Fungos",
      results: "Eventus Quaerendi"
    }
  };
  document.getElementById("searchTitle").textContent = labels[lang].search;
  document.getElementById("resultsTitle").textContent = labels[lang].results;
}
