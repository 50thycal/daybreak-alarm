import {cp,mkdir,rm} from 'node:fs/promises';
import {build} from 'esbuild';
await rm('dist',{recursive:true,force:true}); await mkdir('dist',{recursive:true});
await cp('web','dist',{recursive:true}); await cp('src','dist/src',{recursive:true});
await build({entryPoints:['web/app.js'],bundle:true,outfile:'dist/app.js',format:'esm',target:['safari16','chrome100'],minify:true});
console.log('Daybreak built: dist/ (no server, secrets, or external services required).');
