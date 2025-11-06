const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const port = 3000; // usa minúsculo aqui


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Carrega DB (JSON simples)
const DB_PATH = path.join(__dirname, "db", "pontos.json");

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return { pontos: [], comunidades: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// API – listar pontos
app.get("/api/pontos", (req, res) => {
  const { q = "", cat = "" } = req.query;
  const db = readDB();
  let out = db.pontos;

  if (q) {
    const s = q.toLowerCase();
    out = out.filter(p =>
      p.nome.toLowerCase().includes(s) ||
      p.descricao.toLowerCase().includes(s) ||
      (p.bairro || "").toLowerCase().includes(s)
    );
  }
  if (cat) {
    out = out.filter(p => (p.categoria || "").toLowerCase() === cat.toLowerCase());
  }
  res.json(out);
});

// API – listar comunidades (inclui Comunidade da Ribeira)
app.get("/api/comunidades", (req, res) => {
  const db = readDB();
  res.json(db.comunidades || []);
});

// API – adicionar ponto (beta)
app.post("/api/pontos", (req, res) => {
  const { nome, descricao, lat, lng, imagem, categoria, bairro } = req.body;
  if (!nome || !descricao) return res.status(400).json({ erro: "Campos obrigatórios." });

  const db = readDB();
  const novo = {
    id: Date.now(),
    nome,
    descricao,
    lat: Number(lat) || null,
    lng: Number(lng) || null,
    imagem: imagem || "",
    categoria: categoria || "geral",
    bairro: bairro || ""
  };
  db.pontos.push(novo);
  writeDB(db);
  res.json(novo);
});

// API – proxy simples pro microserviço Python (se estiver rodando)
app.post("/api/analise/sugerir", async (req, res) => {
  try {
    const resp = await fetch("http://127.0.0.1:5001/sugerir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {})
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ erro: "Python offline? Rode python_service/app.py", detalhe: String(err) });
  }
});

// SPA fallback (opcional)
// app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(port, "0.0.0.0", () => {
  console.log(`🌎 Turismo Moju acessível na rede: http://10.0.0.191:${port}`);
});

