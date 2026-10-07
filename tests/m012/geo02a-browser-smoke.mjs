import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const dist = join(dirname(require.resolve("maplibre-gl/package.json")), "dist");
const browsers = [
  process.env.CHROME_BIN,
  process.platform === "win32"
    ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    : "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const browser = browsers.find(existsSync);
assert.ok(browser, "GEO-02A browser qualification requires Chrome/Edge");

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>#map{height:360px;width:640px}</style></head>
<body><div id="map"></div>
<section aria-label="branch-list"><a href="#branch">Synthetic branch</a></section>
<output id="status">starting</output>
<script type="module">
import * as maplibre from "/dist/maplibre-gl.mjs";
const status=document.querySelector("#status");
maplibre.setWorkerUrl("/dist/maplibre-gl-worker.mjs");
let map;
try {
  map=new maplibre.Map({
    container:"map",style:{version:8,sources:{},layers:[]},
    center:[46.6753,24.7136],zoom:10,keyboard:true,
    attributionControl:false
  });
  let completed=false;
  const markReady=()=>{
    if(completed)return;
    completed=true;
    map.remove();
    status.textContent="ready";
  };
  map.on("load",markReady);
  map.on("error",()=>{
    if(completed)return;
    completed=true;
    map.remove();
    status.textContent="error";
  });
  if(map.loaded())markReady();
  setTimeout(()=>{
    if(completed)return;
    completed=true;
    map.remove();
    status.textContent="timeout";
  },8000);
} catch(error) {
  status.textContent="exception";
}
</script></body></html>`;

const routes = Object.freeze({
  "/dist/maplibre-gl.mjs":"maplibre-gl.mjs",
  "/dist/maplibre-gl-worker.mjs":"maplibre-gl-worker.mjs",
  "/dist/maplibre-gl-shared.mjs":"maplibre-gl-shared.mjs",
});
const server=createServer((request,response)=>{
  const location=new URL(request.url??"/","http://localhost");
  if(location.pathname==="/"){
    response.writeHead(200,{
      "Content-Type":"text/html; charset=utf-8",
      "Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'",
    });
    response.end(page);
    return;
  }
  const file=routes[location.pathname];
  if(!file){
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200,{"Content-Type":"application/javascript"});
  response.end(readFileSync(join(dist,file)));
});

const profile=mkdtempSync(join(tmpdir(),"zyara-geo02a-"));
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));

try {
  const url=`http://127.0.0.1:${server.address().port}/`;
  const args=[
    "--headless=new","--disable-extensions","--no-first-run","--no-default-browser-check",
    "--disable-background-networking","--disable-gpu-sandbox",
    "--enable-unsafe-swiftshader","--use-angle=swiftshader","--enable-webgl",
    "--no-sandbox",`--user-data-dir=${profile}`,
    "--virtual-time-budget=10000","--dump-dom",url,
  ];
  const run=await new Promise((resolve,reject)=>{
    const child=spawn(browser,args,{windowsHide:true});
    let stdout="",stderr="";
    const watchdog=setTimeout(()=>child.kill(),25000);
    child.stdout.on("data",chunk=>{stdout+=chunk.toString();});
    child.stderr.on("data",chunk=>{if(stderr.length<6000)stderr+=chunk.toString();});
    child.on("error",error=>{clearTimeout(watchdog);reject(error);});
    child.on("exit",code=>{
      clearTimeout(watchdog);
      child.stdout.destroy();
      child.stderr.destroy();
      resolve({code,stdout,stderr});
    });
  });

  const status=run.stdout.match(/<output id="status">([^<]*)<\/output>/)?.[1]??"not-found";
  const listPresent=run.stdout.includes('aria-label="branch-list"');
  console.log(JSON.stringify({browser,status,listPresent,exitCode:run.code}));
  if(run.code!==0||status!=="ready"||!listPresent) {
    console.error(run.stderr.slice(0,1200));
    throw new Error(`GEO-02A browser smoke failed: ${status}`);
  }
} finally {
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  rmSync(profile,{recursive:true,force:true,maxRetries:3});
}
