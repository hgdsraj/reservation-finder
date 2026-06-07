const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args:['--no-sandbox','--disable-blink-features=AutomationControlled'] });
  const p = await b.newPage(); await p.setUserAgent(UA);
  let hmlHash=null, hmlVars=null, csrf=null;
  p.on('request', req => {
    const u=req.url(); const h=req.headers();
    if (h['x-csrf-token']&&!csrf) csrf=h['x-csrf-token'];
    if (u.includes('/dapi/fe/gql')&&u.includes('HomeModuleLists')) {
      try { const body=JSON.parse(req.postData()||'{}'); hmlHash=body?.extensions?.persistedQuery?.sha256Hash; hmlVars=body?.variables; } catch{}
    }
  });
  await p.goto('https://www.opentable.com/', { waitUntil:'networkidle2', timeout:35000 });
  await sleep(4000);
  console.log('harvested hash:', hmlHash);
  console.log('harvested vars keys:', hmlVars?JSON.stringify(Object.keys(hmlVars)):null);
  console.log('sample vars:', JSON.stringify(hmlVars)?.slice(0,400));
  // re-issue with Vancouver lat/lng, metroId 0
  const reissue = async (metroId) => p.evaluate(async (hash, baseVars, csrf, metroId) => {
    const vars = { ...baseVars, metroId, latitude:49.2827, longitude:-123.1207, locQ:'49.2827,-123.1207', locU:'49.2827,-123.1207', requestedDate:'2026-06-12', requestedTime:'19:00', partySize:2, requestDateTime:'2026-06-12T19:00:00' };
    const res = await fetch(`/dapi/fe/gql?optype=query&opname=HomeModuleLists`, { method:'POST', headers:{'content-type':'application/json','x-csrf-token':csrf,'ot-page-group':'seo-landing-home','ot-page-type':'home'}, body: JSON.stringify({ operationName:'HomeModuleLists', variables:vars, extensions:{persistedQuery:{version:1,sha256Hash:hash}} }) });
    const j = await res.json().catch(()=>null);
    let names=[]; const walk=(o,d=0)=>{if(!o||typeof o!=='object'||d>8)return;for(const[k,v]of Object.entries(o)){if(k==='restaurants'&&Array.isArray(v))v.forEach(r=>r?.name&&names.push(r.name));else if(v&&typeof v==='object')walk(v,d+1)}};
    walk(j?.data);
    return { status:res.status, errors:j?.errors?.map(e=>e.message)?.slice(0,2), count:new Set(names).size, sample:[...new Set(names)].slice(0,4) };
  }, hmlHash, hmlVars, csrf, metroId);
  console.log('reissue metroId=0:', JSON.stringify(await reissue(0)));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
