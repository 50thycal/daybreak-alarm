import {cp,mkdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
await rm('ios/Daybreak/Web',{recursive:true,force:true});
await cp('dist','ios/Daybreak/Web',{recursive:true});
await mkdir('ios/Daybreak/Sounds',{recursive:true});
await cp('web/sounds','ios/Daybreak/Sounds',{recursive:true});
console.log('iPhone offline resources prepared. On macOS: cd ios && xcodegen generate');
