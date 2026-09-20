// Run `node scripts/build.js`, then `node scripts/preview.js`.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../dist');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  const file = path.resolve(root,'.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(error,data) => {
    if(error) { res.writeHead(404); return res.end('Not found'); }
    res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(4173,'127.0.0.1',() => console.log('Open http://127.0.0.1:4173'));
