/* ============================================================
   Commission Exposé — serveur local
   - Sert les fichiers (index.html, etudiant.html, admin.html...)
   - Fournit une petite API (/api/data) qui stocke les données
     de l'application dans un fichier data.json sur cet ordinateur.
   Ainsi, la tablette et le PC, connectés au même serveur, voient
   et modifient les MÊMES données.

   Utilisation :
     1) Installer Node.js (https://nodejs.org) si ce n'est pas déjà fait.
     2) Dans ce dossier, lancer :   node server.js
     3) Sur ce PC, ouvrir :         http://localhost:8000
     4) Trouver l'adresse IP locale de ce PC (ex: 192.168.1.24) :
          - Windows : ipconfig  (ligne "Adresse IPv4")
          - Mac     : Préférences Système > Réseau
     5) Sur la tablette (même Wi-Fi que ce PC), ouvrir :
          http://ADRESSE_IP_DU_PC:8000
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml'
};

function sendJSON(res, code, obj){
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  // ---- API de données partagées ----
  if(req.url === '/api/data'){
    if(req.method === 'GET'){
      fs.readFile(DATA_FILE, 'utf8', (err, content) => {
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
        res.end(err ? 'null' : content);
      });
      return;
    }
    if(req.method === 'POST'){
      let body = '';
      req.on('data', chunk => { body += chunk; if(body.length > 25*1024*1024) req.destroy(); });
      req.on('end', () => {
        fs.writeFile(DATA_FILE, body, (err) => {
          if(err){ sendJSON(res, 500, {ok:false}); return; }
          sendJSON(res, 200, {ok:true});
        });
      });
      return;
    }
    sendJSON(res, 405, {ok:false, error:'Méthode non supportée'});
    return;
  }

  // ---- Fichiers statiques ----
  let urlPath = req.url.split('?')[0];
  if(urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, decodeURIComponent(urlPath));

  // sécurité basique : rester dans le dossier du projet
  if(!filePath.startsWith(ROOT)){
    res.writeHead(403); res.end('Interdit'); return;
  }

  fs.readFile(filePath, (err, content) => {
    if(err){
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
      res.end('Fichier non trouvé : ' + urlPath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================');
  console.log(' Commission Exposé — serveur local démarré');
  console.log(' Sur cet ordinateur : http://localhost:' + PORT);
  console.log(' Sur la tablette (même Wi-Fi) : http://<IP-DE-CE-PC>:' + PORT);
  console.log(' (Windows : tapez "ipconfig" dans un terminal pour trouver l\'IP)');
  console.log('=================================================');
  console.log('');
});
