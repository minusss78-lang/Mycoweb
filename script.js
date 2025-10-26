async function searchMushrooms() {
  const spinner = document.getElementById("spinner");
  const resultsDiv = document.getElementById("results");
  spinner.style.display = "block";
  resultsDiv.innerHTML = "";

  const capColor = document.getElementById("capColor").value.toLowerCase();
  const hymenium = document.getElementById("hymenium").value.toLowerCase();
  const ring = document.getElementById("ring").value.toLowerCase();
  const habitat = document.getElementById("habitat").value.toLowerCase();

  try {
    const response = await fetch("funghi.json");
    const data = await response.json();

    const filtered = data.filter(f => {
      return (!capColor || f.colore_cappello.includes(capColor)) &&
             (!hymenium || f.imenoforo.includes(hymenium)) &&
             (!ring || f.anello.includes(ring)) &&
             (!habitat || f.habitat.includes(habitat));
    });

    spinner.style.display = "none";

    if (filtered.length === 0) {
      resultsDiv.innerHTML = `<p>Nessun fungo trovato nel database locale. Cerco online...</p>`;
      const query = [capColor, hymenium, ring, habitat].filter(Boolean).join(" ");
      const wiki = `https://it.wikipedia.org/wiki/${query}`;
      const mushExp = `https://www.mushroomexpert.com/${query.replace(" ", "_")}.html`;
      resultsDiv.innerHTML += `<p><a href="${wiki}" target="_blank">Wikipedia</a> | <a href="${mushExp}" target="_blank">MushroomExpert</a></p>`;
      return;
    }

    resultsDiv.innerHTML = filtered.map(f => `
      <div class="result-item">
        <h3>${f.nome_latino} (${f.nome_italiano})</h3>
        <img src="${f.immagine}" alt="${f.nome_italiano}" width="100">
        <p><strong>Colore cappello:</strong> ${f.colore_cappello}</p>
        <p><strong>Imenoforo:</strong> ${f.imenoforo}</p>
        <p><strong>Habitat:</strong> ${f.habitat}</p>
      </div>
    `).join("");
  } catch (err) {
    spinner.style.display = "none";
    resultsDiv.innerHTML = `<p>Errore nel caricamento del database.</p>`;
  }
}

function changeLanguage() {
  const lang = document.getElementById("language").value;
  document.querySelectorAll("[data-it]").forEach(el => {
    el.innerText = el.getAttribute(`data-${lang}`);
  });
}
