const form = document.getElementById("searchForm");
const loader = document.getElementById("loader");
const results = document.getElementById("results");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  results.innerHTML = "";
  loader.classList.remove("hidden");

  const capColor = document.getElementById("capColor").value.toLowerCase();
  const hymenium = document.getElementById("hymenium").value.toLowerCase();
  const anello = document.getElementById("anello").value.toLowerCase();
  const habitat = document.getElementById("habitat").value.toLowerCase();

  try {
    const res = await fetch("funghi.json");
    const data = await res.json();

    // Filtro multiplo: trova i funghi che corrispondono ai parametri scelti
    const filtered = data.filter(f =>
      (!capColor || f.capColor.includes(capColor)) &&
      (!hymenium || f.hymenium.includes(hymenium)) &&
      (!anello || f.anello.includes(anello)) &&
      (!habitat || f.habitat.includes(habitat))
    );

    if (filtered.length > 0) {
      results.innerHTML = filtered.map(f =>
        `<div class="fungo">
          <h3>${f.nome} <em>(${f.nomeLatino})</em></h3>
          <img src="${f.img}" alt="${f.nome}" style="width:100%;border-radius:8px;">
          <p><b>Colore cappello:</b> ${f.capColor}</p>
          <p><b>Tipo imenoforo:</b> ${f.hymenium}</p>
          <p><b>Anello:</b> ${f.anello}</p>
          <p><b>Habitat:</b> ${f.habitat}</p>
        </div>`
      ).join("");
    } else {
      // fallback su Wikipedia se non trova nulla
      const query = [capColor, hymenium, anello, habitat].filter(Boolean).join(" ");
      const wikiUrl = `https://it.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}+fungo`;
      results.innerHTML = `<p>Nessun risultato nel database locale.<br><a href="${wikiUrl}" target="_blank">Cerca su Wikipedia 🔗</a></p>`;
    }
  } catch (err) {
    results.innerHTML = `<p>Errore durante la ricerca.</p>`;
  } finally {
    loader.classList.add("hidden");
  }
});
