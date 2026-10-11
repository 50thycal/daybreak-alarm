import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'};
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403);return res.end();}
  const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end('Not found');}}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Daybreak: http://localhost:'+Number(process.env.PORT||3000)));
