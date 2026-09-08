import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
const result = await build({stdin:{contents:"import React from 'react'; import {createRoot} from 'react-dom/client'; import Game from './app/page'; createRoot(document.getElementById('root')).render(<Game/>);",resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,minify:true,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const css=(await readFile('app/globals.css','utf8')).replace(/@import\s+['"]tailwindcss['"];?/g,'');
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
await writeFile('index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Slotty — The Lucky Club</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log('Created self-contained index.html');
