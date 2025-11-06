/* util */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

const API = {
  pontos: (q="", cat="") => {
    const u = new URL(location.origin + "/api/pontos");
    if (q) u.searchParams.set("q", q);
    if (cat) u.searchParams.set("cat", cat);
    return fetch(u).then(r=>r.json());
  },
  comunidades: () => fetch("/api/comunidades").then(r=>r.json()),
  sugerir: (body) => fetch("/api/analise/sugerir", {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
  }).then(r=>r.json())
};

function urlParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

/* HOME: mapa */
function initHome(){
  const mapEl = $("#mapHome");
  if(!mapEl) return;
  const map = L.map(mapEl).setView([-1.8899, -48.7690], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap"}).addTo(map);
  API.pontos().then(pontos=>{
    pontos.forEach(p=>{
      if(p.lat && p.lng){
        L.marker([p.lat, p.lng]).addTo(map).bindPopup(`<b>${p.nome}</b><br>${p.bairro||""}`);
      }
    });
  });
}

/* PONTOS: lista + filtros + mapa */
function initPontos(){
  const lista = $("#listaPontos");
  const busca = $("#busca");
  const cat = $("#categoria");
  const btn = $("#btnFiltrar");
  const mapEl = $("#mapPontos");
  if(!lista || !mapEl) return;

  const m = L.map(mapEl).setView([-1.8899, -48.7690], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap"}).addTo(m);
  const markers = [];

  function clearMarkers(){
    markers.forEach((mk)=> m.removeLayer(mk));
    markers.length = 0;
  }

  function render(pontos){
    lista.innerHTML = "";
    clearMarkers();
    pontos.forEach(p=>{
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <img class="thumb" src="${p.imagem || 'assets/img/placeholder.jpg'}" alt="${p.nome}">
        <div class="box">
          <div class="tag">#${p.categoria||'geral'}</div>
          ${p.bairro?`<div class="tag">📍 ${p.bairro}</div>`:""}
          <h3>${p.nome}</h3>
          <p>${p.descricao}</p>
          ${p.lat && p.lng ? `<button class="btn btn-mini" data-lat="${p.lat}" data-lng="${p.lng}">Ver no mapa</button>`:""}
        </div>
      `;
      lista.appendChild(card);

      if(p.lat && p.lng){
        const mk = L.marker([p.lat,p.lng]).addTo(m).bindPopup(`<b>${p.nome}</b><br>${p.bairro||""}`);
        markers.push(mk);
      }
    });

    // foco no mapa
    $$(".btn-mini", lista).forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const lat = Number(btn.dataset.lat), lng = Number(btn.dataset.lng);
        m.setView([lat,lng], 14);
      });
    });
  }

  // carregar inicial
  const initCat = urlParam("cat") || "";
  if (initCat) cat.value = initCat;

  function filtrar(){
    const q = busca.value.trim();
    const c = cat.value;
    API.pontos(q,c).then(render);
  }

  btn.addEventListener("click", filtrar);
  busca.addEventListener("keydown", (e)=>{ if(e.key==="Enter") filtrar(); });

  API.pontos(initCat? "" : "", initCat).then(render);
}

/* COMUNIDADES */
function initComunidades(){
  const lista = $("#listaComunidades");
  const mapEl = $("#mapComunidades");
  if(!lista || !mapEl) return;

  const map = L.map(mapEl).setView([-1.8899, -48.7690], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap"}).addTo(map);

  API.comunidades().then(comus=>{
    lista.innerHTML = "";
    comus.forEach(c=>{
      const card = document.createElement("article");
      card.className = "comu-card";
      card.innerHTML = `
        <div class="box">
          <h3>${c.nome}</h3>
          <p>${c.descricao}</p>
          ${c.destaques?.length? `<ul>${c.destaques.map(d=>`<li>${d}</li>`).join("")}</ul>`:""}
          ${c.contatos? `<p><b>Associação:</b> ${c.contatos.associacao||""}<br><b>E-mail:</b> ${c.contatos.email||""}</p>`:""}
          ${c.local? `<button class="btn" data-lat="${c.local.lat}" data-lng="${c.local.lng}">Ver no mapa</button>`:""}
        </div>
      `;
      lista.appendChild(card);

      if(c.local?.lat && c.local?.lng){
        L.marker([c.local.lat, c.local.lng]).addTo(map).bindPopup(`<b>${c.nome}</b>`);
      }
    });

    $$(".comu-card .btn", lista).forEach(b=>{
      b.addEventListener("click", ()=>{
        const lat = Number(b.dataset.lat), lng = Number(b.dataset.lng);
        map.setView([lat,lng], 14);
      });
    });
  });
}

/* CONTATO */
function initContato(){
  const form = $("#formContato");
  const status = $("#statusForm");
  if(!form) return;
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    status.textContent = "Enviando…";
    const data = Object.fromEntries(new FormData(form).entries());
    // exemplo: mandar pro Python gerar resposta/sugestão de roteiro
    try{
      const r = await API.sugerir({ mensagem: data.mensagem, nome: data.nome || "Visitante" });
      status.textContent = r.ok ? "Recebido! Em breve retornaremos." : (r.erro || "Falha na análise.");
    }catch(err){
      status.textContent = "Serviço de análise indisponível (Python).";
    }
    form.reset();
  });
}

/* boot */
document.addEventListener("DOMContentLoaded", ()=>{
  initHome();
  initPontos();
  initComunidades();
  initContato();
});
