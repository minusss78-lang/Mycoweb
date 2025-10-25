async function searchMushrooms() {
  const loader = document.getElementById("loader");
  const results = document.getElementById("results");
  loader.style.display = "block";
  results.innerHTML = "";

  const coloreCappello = document.getElementById("coloreCappello").value;
  const formaCappello = document.getElementById("formaCappello").value;
  const coloreLamelle = document.getElementById("coloreLamelle").value;
  const gambo = document.getElementById("gambo").value;
  const habitat = document.getElementById("habitat").value;

  try {
    const res = await fetch("funghi.json");
    const funghi = await res.json();

    const filtrati = funghi.filter(fungo =>
      (!coloreCappello || fungo.coloreCappello === coloreCappello) &&
      (!formaCappello || fungo.formaCappello === formaCappello) &&
      (!coloreLamelle || fungo.coloreLamelle === coloreLamelle) &&
      (!gambo || fungo.gambo === gambo) &&
      (!habitat || fungo.habitat === habitat)
    );

    if (filtrati.length === 0) {
      results.innerHTML = `<p>Nessun fungo trovato.</p>`;
    } else {
      filtrati.forEach(f => {
        const card = document.createElement("div");
        card.classList.add("fungo-card");
        card.innerHTML = `
          <img src="${f.immagine}" alt="${f.nome}" />
          <h3>${f.nome} <em>(${f.nomeLatino})</em></h3>
          <p><strong>Cappello:</strong> ${f.coloreCappello}, ${f.formaCappello}</p>
          <p><strong>Lamelle:</strong> ${f.coloreLamelle}</p>
          <p><strong>Habitat:</strong> ${f.habitat}</p>
        `;
        results.appendChild(card);
      });
    }
  } catch (err) {
    console.error(err);
    results.innerHTML = `<p>Errore nel caricamento del database.</p>`;
  }

  loader.style.display = "none";
}
const translations = {
  it: {
    title: "MycoWeb",
    search: "Cerca il tuo fungo",
    notFound: "Nessun fungo trovato."
  },
  en: {
    title: "MycoWeb",
    search: "Find your mushroom",
    notFound: "No mushrooms found."
  },
  fr: {
    title: "MycoWeb",
    search: "Cherchez votre champignon",
    notFound: "Aucun champignon trouvé."
  },
  de: {
    title: "MycoWeb",
    search: "Pilzsuche",
    notFound: "Keine Pilze gefunden."
  },
  es: {
    title: "MycoWeb",
    search: "Busca tu hongo",
    notFound: "No se encontraron hongos."
  }
};

function changeLanguage(lang) {
  document.querySelector("h1").innerText = translations[lang].title;
  document.querySelector("h2").innerText = translations[lang].search;
       }
