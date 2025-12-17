const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const CONFIG_PATH = path.join(__dirname, "config.json");

const DEFAULT_CONFIG = {
  enabled: true,
  shopifyStore: "louur.myshopify.com",
  accessToken: "",
  groups: {
    "XS": ["I", "J", "K"],
    "S": ["L", "M", "N"],
    "M": ["O", "P", "R"],
    "L": ["S", "T", "U"]
  },
  logs: []
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch (e) {}
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function addLog(message, type = "info") {
  const config = loadConfig();
  config.logs.unshift({ timestamp: new Date().toISOString(), message, type });
  config.logs = config.logs.slice(0, 100);
  saveConfig(config);
}

function findGroup(size, groups) {
  for (const [name, sizes] of Object.entries(groups)) {
    if (sizes.includes(size.toUpperCase())) return { name, sizes };
  }
  return null;
}

async function shopifyAPI(config, endpoint, method = "GET", body) {
  const res = await fetch(`https://${config.shopifyStore}/admin/api/2024-01/${endpoint}`, {
    method,
    headers: { "X-Shopify-Access-Token": config.accessToken, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

app.use(express.json());

const HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LOUUR Stok Sync</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);min-height:100vh;color:#fff}
.c{max-width:900px;margin:0 auto;padding:20px}
h1{text-align:center;padding:30px 0;font-size:2.5em}
.badge{display:inline-block;padding:8px 20px;border-radius:20px;font-weight:bold}
.on{background:#00c853}.off{background:#ff5252}
.card{background:rgba(255,255,255,0.05);border-radius:15px;padding:25px;margin:20px 0;border:1px solid rgba(255,255,255,0.1)}
.card h2{margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px}
.group{background:rgba(255,255,255,0.08);border-radius:10px;padding:20px;text-align:center}
.group h3{color:#ffd700;font-size:1.8em;margin-bottom:10px}
.tag{background:#4a4a6a;padding:5px 12px;border-radius:15px;margin:3px;display:inline-block;font-size:0.9em}
.btn{padding:12px 25px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;margin:5px}
.btn-p{background:#667eea;color:#fff}.btn-d{background:#ff5252;color:#fff}.btn-s{background:#00c853;color:#fff}
input{width:100%;padding:12px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;margin:10px 0}
.logs{max-height:200px;overflow-y:auto;background:rgba(0,0,0,0.3);border-radius:10px;padding:15px;font-family:monospace;font-size:0.8em}
.log{padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.1)}
.info{color:#64b5f6}.success{color:#81c784}.error{color:#e57373}
.wh{background:rgba(0,0,0,0.3);padding:15px;border-radius:8px;word-break:break-all;font-family:monospace;margin:15px 0}
.flex{display:flex;justify-content:space-between;align-items:center}
.toggle{position:relative;width:60px;height:34px}
.toggle input{opacity:0;width:0;height:0}
.slider{position:absolute;cursor:pointer;inset:0;background:#ccc;border-radius:34px;transition:.4s}
.slider:before{content:"";position:absolute;height:26px;width:26px;left:4px;bottom:4px;background:#fff;border-radius:50%;transition:.4s}
input:checked+.slider{background:#00c853}
input:checked+.slider:before{transform:translateX(26px)}
.msg{padding:15px;border-radius:8px;margin:15px 0;display:none}
.msg.show{display:block}.msg.ok{background:rgba(0,200,83,0.2);border:1px solid #00c853}.msg.err{background:rgba(255,82,82,0.2);border:1px solid #ff5252}
</style>
</head>
<body>
<div class="c">
<h1>💍 LOUUR</h1>
<p style="text-align:center">Yüzük Stok Senkronizasyon</p>
<p style="text-align:center;margin-top:15px"><span class="badge" id="st">...</span></p>
<div id="msg" class="msg"></div>
<div class="card"><div class="flex"><h2>⚙️ Sistem</h2><label class="toggle"><input type="checkbox"
