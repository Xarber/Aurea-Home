// SPDX-License-Identifier: AGPL-3.0-only
import React, {useEffect, useRef, useState} from 'react';
import tvSource from '../../distribution/obtainium.json';
import phoneSource from '../../distribution/obtainium-remote.json';
import {downloads, latestRelease, repository} from './releases';

type InstallPrompt = Event & {prompt(): Promise<unknown>};
const enteredKey = 'aurea-web-entered';
const introductionKey = 'aurea-web-introduction';
function hasEntered() {
  try { return localStorage.getItem(enteredKey) === '1'; } catch { return false; }
}

export function WebEntry({children}: {children: React.ReactNode}) {
  const [landing, setLanding] = useState(() => location.hash === '#welcome' || !hasEntered());
  const [entered, setEntered] = useState(!landing);
  const [introduction, setIntroduction] = useState(false);
  const open = useRef<HTMLButtonElement>(null);
  const information = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const change = () => {
      const show = location.hash === '#welcome' || !hasEntered() && !history.state?.aureaEntered;
      setLanding(show);
      if (!show) setEntered(true);
    };
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, []);
  function openApp() {
    try {
      if (localStorage.getItem(introductionKey) === '1') { enter(); return; }
    } catch { /* The introduction can still be dismissed once per visit. */ }
    setIntroduction(true);
  }
  function finishIntroduction() {
    try { localStorage.setItem(introductionKey, '1'); } catch { /* Optional persistence. */ }
    setIntroduction(false);
    if (landing) enter();
    else requestAnimationFrame(() => information.current?.focus());
  }
  function enter() {
    try { localStorage.setItem(enteredKey, '1'); } catch { /* Private browsing can disable storage. */ }
    history.pushState({aureaEntered: true}, '', '/');
    setEntered(true);
    setLanding(false);
    requestAnimationFrame(() => information.current?.focus());
  }
  function show() {
    history.pushState({}, '', '/#welcome');
    setLanding(true);
    requestAnimationFrame(() => open.current?.focus());
  }
  return <>
    {entered && <div hidden={landing || introduction} style={{height:'100%', flex:1, position:'relative', display:landing || introduction?'none':'flex',flexDirection:'column'}}>
      <div className="aurea-tools"><button onClick={()=>setIntroduction(true)}>Replay Introduction</button><button ref={information} className="aurea-about" onClick={show}>About Aurea</button></div>
      <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>{children}</div>
    </div>}
    {landing && !introduction && <Landing open={open} enter={openApp}/>}
    {introduction && <Introduction finish={finishIntroduction}/>}
    <style>{styles}</style>
  </>;
}

function obtainiumLink(source: object) {
  return 'https://apps.obtainium.imranr.dev/redirect?r='+encodeURIComponent('obtainium://app/'+encodeURIComponent(JSON.stringify(source)));
}

function Landing({open,enter}:{open:React.RefObject<HTMLButtonElement|null>;enter:()=>void}) {
  const [assets,setAssets] = useState<ReturnType<typeof downloads>>();
  const [failed,setFailed] = useState(false);
  const [prompt,setPrompt] = useState<InstallPrompt>();
  const [installed,setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & {standalone?: boolean}).standalone === true);
  useEffect(() => {
    const abort = new AbortController();
    fetch(latestRelease,{signal:abort.signal,credentials:'omit'})
      .then(async response => {
        if (response.status === 404) return [];
        if (!response.ok) throw new Error('release unavailable');
        return downloads(await response.json());
      })
      .then(setAssets).catch(() => {if (!abort.signal.aborted) setFailed(true);});
    return () => abort.abort();
  },[]);
  useEffect(() => {
    const available = (event: Event) => {event.preventDefault();setPrompt(event as InstallPrompt);};
    const done = () => {setInstalled(true);setPrompt(undefined);};
    window.addEventListener('beforeinstallprompt',available);
    window.addEventListener('appinstalled',done);
    return () => {
      window.removeEventListener('beforeinstallprompt',available);
      window.removeEventListener('appinstalled',done);
    };
  },[]);
  return <main className="aurea-landing">
    <header><img src="/branding/aurea.svg" width="46" height="46" alt=""/><strong>Aurea</strong>
      <a href={repository}>GitHub</a></header>
    <section className="aurea-hero">
      <div><h1>A calmer home for your TV.</h1>
        <p>Organize your apps and inputs on Android TV. Use your phone or browser as a remote, and control a paired Apple TV from Aurea.</p>
        <div className="aurea-actions"><button ref={open} onClick={enter}>Open Web App</button>
          <a href="/?demo=1">Try the Home demo</a></div>
      </div>
      <img src="/screenshots/home.png" width="1440" height="900" alt="Aurea Home demo showing the Android TV launcher dock"/>
    </section>
    <section className="aurea-downloads" aria-labelledby="downloads-title">
      <h2 id="downloads-title">Get Aurea</h2>
      <div className="aurea-cards">
        {assets?.map(asset => <a key={asset.platform} href={asset.url}>
          <strong>{asset.platform} · {asset.version}</strong>
          <span>{asset.format} · {(asset.size/1048576).toFixed(1)} MB</span>
          {asset.format==='Unsigned IPA' && <small>Requires signing with a compatible installer</small>}
        </a>)}
      </div>
      <p role="status">{failed?'Downloads are temporarily unavailable.':!assets?'Checking GitHub for downloads…':!assets.length?'No compatible stable downloads are available.':null}</p>
      <div className="aurea-actions">
        {!installed && prompt && <button onClick={() => {
          const current=prompt;setPrompt(undefined);void current.prompt().catch(()=>{});
        }}>Install Web App</button>}
        <a href={repository+'/releases'}>All releases</a>
      </div>
      {!installed && !prompt && /iPhone|iPad/.test(navigator.userAgent) && <p>In Safari, use Share → Add to Home Screen.</p>}
      <div className="aurea-actions aurea-badges">
        {assets?.some(asset=>asset.format==='Unsigned IPA') && <a href={'https://altdirect.app/?url='+encodeURIComponent(repository+'/releases/download/sources-v1.0/altsource.json')}><img src="/installation/altsource.png" alt="Add to AltStore"/></a>}
        {assets?.some(asset=>asset.platform==='Android TV') && <a href={obtainiumLink(tvSource)}><img src="/installation/obtainium.png" alt="Add TV to Obtainium"/><span>Android TV</span></a>}
        {assets?.some(asset=>asset.platform==='Android phone') && <a href={obtainiumLink(phoneSource)}><img src="/installation/obtainium.png" alt="Add phone to Obtainium"/><span>Android phone</span></a>}
        <a href={repository+'/blob/main/distribution/README.md'}>Installation help</a>
      </div>
    </section>
    <footer><a href={repository+'/tree/main/docs'}>Documentation</a><a href={repository+'/blob/main/docs/SECURITY.md'}>Privacy and security</a><a href={repository+'/blob/main/LICENSE'}>AGPL-3.0</a></footer>
  </main>;
}
function Introduction({finish}:{finish:()=>void}) {
  const [step,setStep] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(()=>title.current?.focus(),[step]);
  return <main className="aurea-landing">
    <header><img src="/branding/aurea.svg" width="46" height="46" alt="Aurea"/>
      <button style={{marginLeft:'auto'}} aria-label="Skip introduction" onClick={finish}>×</button></header>
    <section className="aurea-hero" key={step}>
      <div><p>Step {step+1} of 2</p>
        <h1 tabIndex={-1} ref={title}>{step===0?'Make the TV yours.':'Keep the remote nearby.'}</h1>
        <p>{step===0?'Use the launcher to put your favorite apps and inputs together.':'Open Remote on your TV and pair this browser using the link and code on screen.'}</p>
        <div className="aurea-actions">
          {step>0&&<button onClick={()=>setStep(0)}>Back</button>}
          <button onClick={()=>step===0?setStep(1):finish()}>{step===0?'Next':'Get Started'}</button>
        </div>
      </div>
      <picture>
        <source media="(max-width: 730px)" srcSet="/screenshots/remote.png"/>
        <img src="/screenshots/home.png" alt="Screenshot of the Aurea web demo"/>
      </picture>
    </section>
  </main>;
}
const styles = `
.aurea-tools{display:flex;justify-content:flex-end;flex-wrap:wrap}.aurea-tools button{align-self:flex-end;margin:6px 12px;border:1px solid #777e99;border-radius:12px;background:#161b2e;color:#fff;min-height:44px;padding:8px 12px;cursor:pointer}
.aurea-landing{box-sizing:border-box;min-height:100%;height:100%;overflow:auto;color:#f5f4ff;background:radial-gradient(ellipse at 75% 12%,#313260,#141728 48%,#10131e);font-family:system-ui;padding:clamp(18px,5vw,72px)}
.aurea-landing header,.aurea-hero,.aurea-downloads,.aurea-landing footer{max-width:1200px;margin-inline:auto}
.aurea-landing header,.aurea-landing footer,.aurea-actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.aurea-landing header a{margin-left:auto}.aurea-landing a{color:#d6d5ff}
.aurea-hero{display:grid;grid-template-columns: minmax(0,1fr) minmax(0,1.3fr);align-items:center;gap:clamp(24px,5vw,72px);padding-block:clamp(40px,8vw,110px)}
.aurea-hero img{max-width:100%;height:auto;border-radius:18px;box-shadow:0 18px 50px #0008}
.aurea-hero h1{font-size:clamp(38px,5.6vw,76px);line-height:1.02;letter-spacing:-.045em;margin:0}
.aurea-landing p{line-height:1.65;color:#d3d6e9}
.aurea-landing button{background:#dbd9ff;color:#181b32;border:0;border-radius:12px;min-height:46px;padding:0 16px;font:inherit;font-weight:700;cursor:pointer}
.aurea-landing button:active{transform:scale(.98)}
.aurea-landing :is(a,button):focus-visible,.aurea-about:focus-visible{outline:3px solid #c3b9ff;outline-offset:4px}
.aurea-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px}
.aurea-cards a{display:grid;gap:8px;padding:18px;background:#20253b;border:1px solid #414867;border-radius:15px;text-decoration:none}
.aurea-cards span,.aurea-cards small{color:#d3d6e9}
.aurea-badges>a:has(img){display:inline-flex;flex-direction:column;align-items:center;min-height:44px;text-decoration:none;font-size:14px}
.aurea-badges img{height:45px;width:auto;max-width:100%;object-fit:contain}
.aurea-landing footer{padding-block:38px}
@media(max-width:730px){.aurea-hero{grid-template-columns:1fr}}
@media(prefers-reduced-motion:no-preference){.aurea-landing{animation:aurea-in .18s ease-out}.aurea-landing button{transition:transform .12s ease-out}}
@keyframes aurea-in{from{opacity:.72}to{opacity:1}}
`;
