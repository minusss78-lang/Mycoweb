document.getElementById("searchBtn").addEventListener("click", searchMushrooms);

async function searchMushrooms() {
  const loader = document.getElementById("loader");
  const results = document.getElementById("results");
  loader.classList.remove("hidden");
  results.innerHTML = "";

  const color = document.getElementById("color").value.toLowerCase();
  const shape = document.getElementById("shape").value.toLowerCase();
  const gills = document.getElementById("gills").value.toLowerCase();
  const ring = document.getElementById("ring").value.toLowerCase();

  try {
    const response = await fetch("funghi.json");
    const fungi = await response.json();

    let matches = fungi.filter(f =>
      (!color || f.color.includes(color)) &&
      (!shape || f.shape.includes(shape)) &&
      (!gills || f.gills.includes(gills)) &&
      (!ring || f.ring.includes(ring))
    );

    if (matches.length === 0) {
      results.innerHTML = `<p>Nessun risultato locale. Cerco online...</p>`;
      matches = await searchOnline(color, shape);
    }

    loader.classList.add("hidden");
    displayResults(matches);
  } catch (err) {
    loader.classList.add("hidden");
    results.innerHTML = `<p>Errore nel caricamento dei dati.</p>`;
  }
}

function displayResults(matches) {
  const container = document.getElementById("results");
  if (!matches.length) {
    container.innerHTML = "<p>Nessun fungo trovato.</p>";
    return;
  }

  matches.forEach(f => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <img src="${f.image || 'https://upload.wikimedia.org/wikipedia/commons/7/78/Mushroom_icon.svg'}" alt="${f.name_it}" />
      <h3>${f.name_it}</h3>
      <p><em>${f.name_la}</em> | ${f.name_en}</p>
      <a href="${f.link}" target="_blank">🔗 Approfondisci</a>
    `;
    container.appendChild(card);
  });
}

async function searchOnline(color, shape) {
  const query = encodeURIComponent(`${color} ${shape} mushroom`);
  const wikiURL = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&origin=*`;
  const response = await fetch(wikiURL);
  const data = await response.json();

  return data.query.search.slice(0, 5).map(item => ({
    name_it: item.title,
    name_en: item.title,
    name_la: item.title,
    image: "https://upload.wikimedia.org/wikipedia/commons/7/78/Mushroom_icon.svg",
    link: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
  }));
}
