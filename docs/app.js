import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm";

const $=s=>document.querySelector(s);
const scenes=[...document.querySelectorAll(".scene")];
const progress=$("#progressBar");
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile=matchMedia("(max-width: 800px)").matches;
const deviceMemory=navigator.deviceMemory||4;
const cpuCores=navigator.hardwareConcurrency||4;
let quality=(mobile||deviceMemory<4||cpuCores<4)?.68:1;
let audioEnabled=false,audioCtx=null,warp=0,currentScene="intro",petalIntensity=0;
let lowFpsMode=false,frameCounter=0,fpsClock=performance.now();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const haptic=(ms=10)=>{try{if(navigator.vibrate)navigator.vibrate(ms)}catch{}};

window.addEventListener("error",e=>{
  console.warn("Runtime warning:",e.message||e.error||e);
});

function updateLoader(value){
  const bar=$("#loaderBar"),pct=$("#loaderPercent");
  if(bar)bar.style.width=value+"%";
  if(pct)pct.textContent=Math.round(value)+"%";
}
async function finishLoader(){
  let p=0;
  const timer=setInterval(()=>{p=Math.min(92,p+7+Math.random()*8);updateLoader(p)},90);
  try{if(document.fonts?.ready)await document.fonts.ready}catch{}
  await wait(650);clearInterval(timer);updateLoader(100);
  await wait(280);$("#loader")?.classList.add("is-hidden");
}

function sceneStep(id){return {intro:0,countdown:1,journey:2,flowerScene:3,messages:4,finale:5}[id]??0}
async function showBridge(text){
  const el=$("#bridgeText");if(!el)return;
  el.textContent=text;
  gsap.fromTo(el,{autoAlpha:0,scale:.96,filter:"blur(12px)"},{autoAlpha:1,scale:1,filter:"blur(0)",duration:.55,ease:"power2.out"});
  await wait(650);
  gsap.to(el,{autoAlpha:0,scale:1.02,filter:"blur(10px)",duration:.45,ease:"power2.in"});
  await wait(420);
}

function setAtmosphere(id){
  const dawn=$("#dawnLayer");
  const opacity=id==="finale"?.72:id==="flowerScene"?.25:id==="messages"?.38:0;
  if(dawn)gsap.to(dawn,{opacity,duration:1.5,ease:"sine.inOut"});
  const exposure=id==="finale"?1.22:id==="flowerScene"?1.12:1.06;
  gsap.to(renderer,{toneMappingExposure:exposure,duration:1.5,ease:"sine.inOut"});
}

async function showScene(id){
  if(id===currentScene)return;
  const old=$("#"+currentScene),next=$("#"+id);
  if(old){
    gsap.to(old,{autoAlpha:0,duration:reduced?.1:1.5,ease:"power2.inOut"});
    await wait(reduced?80:1200);
    old.classList.remove("scene--active");
  }
  next.classList.add("scene--active");
  gsap.set(next,{autoAlpha:0});
  gsap.to(next,{autoAlpha:1,duration:reduced?.1:1.5,ease:"power2.out"});
  currentScene=id;
  progress.style.width=Math.max(8,(sceneStep(id)/5)*100)+"%";
  petalIntensity=id==="finale"?2.8:id==="flowerScene"?2.2:id==="messages"?.9:0;
  updateFloralScene(id);
  setAtmosphere(id);
  if(id==="flowerScene")chord();
}

function tone(freq=220,duration=.25,volume=.022){
  if(!audioEnabled)return;
  if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type="sine";o.frequency.value=freq;
  g.gain.setValueAtTime(.0001,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(volume,audioCtx.currentTime+.05);
  g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
  o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);
}
function chord(){
  if(!audioEnabled)return;
  [146.83,220,293.66,369.99].forEach((f,i)=>setTimeout(()=>tone(f,3.6,.007),i*360));
}
$("#soundBtn").onclick=()=>{audioEnabled=!audioEnabled;$("#soundBtn").classList.toggle("sound-on",audioEnabled);$("#soundLabel").textContent=audioEnabled?"Sonido activo":"Sonido";if(audioEnabled){tone(523,.45,.018);chord()}};
$("#restartBtn").onclick=()=>location.reload();
$("#replayBtn").onclick=()=>location.reload();

const renderer=new THREE.WebGLRenderer({canvas:$("#space"),antialias:true,alpha:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x06030a,.029);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,200);
camera.position.set(0,0,8);

const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),mobile?.48:.78,.9,.82);
composer.addPass(bloom);
let bokeh=null;
if(!mobile&&quality>.8){
  bokeh=new BokehPass(scene,camera,{focus:7.2,aperture:.00007,maxblur:.0055,width:innerWidth,height:innerHeight});
  composer.addPass(bokeh);
}

const ambient=new THREE.HemisphereLight(0xffd8e5,0x12091c,1.15);
scene.add(ambient);
const key=new THREE.DirectionalLight(0xffdfeb,3.2);key.position.set(4,6,6);scene.add(key);
const rim=new THREE.PointLight(0xb49aff,18,20,2);rim.position.set(-4,1,4);scene.add(rim);
const warm=new THREE.PointLight(0xff8fac,13,16,2);warm.position.set(3,-1,4);scene.add(warm);

function starField(count,radius,size,color,opacity){
  const geo=new THREE.BufferGeometry(),pts=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const r=Math.pow(Math.random(),.5)*radius,a=Math.random()*Math.PI*2,z=(Math.random()-.5)*radius*1.8;
    pts[i*3]=Math.cos(a)*r;pts[i*3+1]=Math.sin(a)*r*.65;pts[i*3+2]=z;
  }
  geo.setAttribute("position",new THREE.BufferAttribute(pts,3));
  return new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));
}
const stars=starField(mobile?2200:4300,38,.048,0xf2eaff,.92);
const roseDust=starField(mobile?700:1600,26,.07,0xff9fc6,.5);
const blueDust=starField(mobile?450:1000,28,.068,0x8d88ff,.42);
scene.add(stars,roseDust,blueDust);

const nebula=new THREE.Group();
[0x501954,0x172d57,0x54213f].forEach((color,i)=>{
  for(let j=0;j<2;j++){
    const mesh=new THREE.Mesh(
      new THREE.SphereGeometry(7+i*1.7+j,32,24),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:.018+(j*.009),side:THREE.BackSide,blending:THREE.AdditiveBlending})
    );
    mesh.position.set((i-1)*3.2,(j-.5)*2.2,-3-i);
    mesh.scale.set(1.4,.8,1);
    nebula.add(mesh);
  }
});
scene.add(nebula);

const floralRoot=new THREE.Group();
floralRoot.visible=false;
scene.add(floralRoot);

const petalMaterials=[
  new THREE.MeshPhysicalMaterial({color:0xffd8e4,roughness:.52,clearcoat:.2,clearcoatRoughness:.55,side:THREE.DoubleSide}),
  new THREE.MeshPhysicalMaterial({color:0xf4a9bf,roughness:.5,clearcoat:.18,clearcoatRoughness:.5,side:THREE.DoubleSide}),
  new THREE.MeshPhysicalMaterial({color:0xc85a82,roughness:.55,clearcoat:.12,side:THREE.DoubleSide}),
  new THREE.MeshPhysicalMaterial({color:0xffeee9,roughness:.57,clearcoat:.16,side:THREE.DoubleSide})
];
const leafMaterial=new THREE.MeshStandardMaterial({color:0x233a21,roughness:.8,side:THREE.DoubleSide});
const stemMaterial=new THREE.MeshStandardMaterial({color:0x31472a,roughness:.86});
const centerMaterial=new THREE.MeshPhysicalMaterial({color:0xc67b72,roughness:.7});
const dewMaterial=new THREE.MeshPhysicalMaterial({
  color:0xffffff,roughness:.04,metalness:0,transmission:.9,transparent:true,opacity:.72,
  ior:1.33,thickness:.08,clearcoat:1,clearcoatRoughness:.04
});
const yellowCenter=new THREE.MeshStandardMaterial({color:0xe2b95b,roughness:.75});

function createPetalMesh(material,scaleX=1,scaleY=1){
  const geo=new THREE.SphereGeometry(.42,16,10);
  const p=new THREE.Mesh(geo,material);
  p.scale.set(.72*scaleX,1.08*scaleY,.11);
  p.castShadow=false;p.receiveShadow=false;
  return p;
}
function createRose({radius=1,colorIndex=0,petals=34}={}){
  const g=new THREE.Group();
  for(let i=0;i<petals;i++){
    const t=i/(petals-1),angle=i*2.399963;
    const ring=Math.pow(t,.72);
    const p=createPetalMesh(petalMaterials[(colorIndex+(i%3===0?1:0))%petalMaterials.length],.72+ring*.55,.64+ring*.52);
    const r=.05+ring*radius*.74;
    p.position.set(Math.cos(angle)*r,(.26-ring*.38)+Math.sin(angle*.7)*.03,Math.sin(angle)*r*.88);
    p.rotation.order="YXZ";
    p.rotation.y=-angle+Math.PI/2;
    p.rotation.x=.35+ring*1.12;
    p.rotation.z=Math.sin(angle)*.18;
    p.scale.multiplyScalar(.42+ring*.55);
    g.add(p);
  }
  const core=new THREE.Mesh(new THREE.SphereGeometry(.18,18,12),centerMaterial);
  core.position.y=.18;g.add(core);
  return g;
}
function addDewDrops(group,count=3){
  for(let i=0;i<count;i++){
    const d=new THREE.Mesh(new THREE.SphereGeometry(.045+Math.random()*.025,10,8),dewMaterial);
    const a=Math.random()*Math.PI*2,r=.22+Math.random()*.42;
    d.position.set(Math.cos(a)*r,.06+Math.random()*.18,Math.sin(a)*r);
    d.scale.y=.72;group.add(d);
  }
}
function createTulip(colorIndex=0){
  const g=new THREE.Group();
  for(let i=0;i<6;i++){
    const p=createPetalMesh(petalMaterials[(colorIndex+i%2)%petalMaterials.length],.82,.92);
    const a=i*Math.PI/3;
    p.position.set(Math.cos(a)*.22,.13,Math.sin(a)*.22);
    p.rotation.set(.85,-a+Math.PI/2,Math.sin(a)*.08);
    p.scale.multiplyScalar(.7);g.add(p);
  }
  addDewDrops(g,2);return g;
}
function createDaisy(){
  const g=new THREE.Group();
  for(let i=0;i<12;i++){
    const p=createPetalMesh(petalMaterials[3],.65,.9),a=i*Math.PI/6;
    p.position.set(Math.cos(a)*.34,.04,Math.sin(a)*.34);
    p.rotation.set(1.2,-a+Math.PI/2,0);p.scale.multiplyScalar(.55);g.add(p);
  }
  const core=new THREE.Mesh(new THREE.SphereGeometry(.16,14,10),yellowCenter);core.position.y=.08;g.add(core);
  return g;
}
function createPeony(colorIndex=1){
  const g=createRose({radius:1.05,colorIndex,petals:mobile?36:54});
  g.scale.set(1.12,.9,1.12);addDewDrops(g,4);return g;
}
function createStem(height=2.6){
  const g=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,height,10),stemMaterial);
  stem.position.y=-height/2;stem.rotation.z=.04;g.add(stem);
  for(const side of [-1,1]){
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),leafMaterial);
    leaf.scale.set(1.8,.18,.62);leaf.position.set(side*.29,-height*.48+(side>0?.18:-.15),0);
    leaf.rotation.z=side*(.55);leaf.rotation.y=side*.45;g.add(leaf);
  }
  return g;
}
function addFlower(x,y,z,s,colorIndex,rot=0){
  const wrap=new THREE.Group();
  const rose=createRose({radius:1,colorIndex,petals:mobile?26:38});
  addDewDrops(rose,mobile?2:4);
  rose.scale.setScalar(s);rose.rotation.y=rot;wrap.add(rose);
  const stem=createStem(2.4*s);stem.position.y=-.3*s;wrap.add(stem);
  wrap.position.set(x,y,z);
  floralRoot.add(wrap);
  return wrap;
}
const mainFlower=addFlower(-1.15,.55,0,1.26,0,-.2);
const flower2=addFlower(.95,.25,-.55,.92,1,.55);
const flower3=addFlower(-2.35,-.1,-1.05,.72,3,-.5);
const flower4=addFlower(2.05,-.25,-1.15,.76,0,.9);
const flower5=addFlower(.1,-.55,-1.65,.66,2,.2);
const flower6=addFlower(-.25,1.35,-1.5,.48,3,-.8);
const flower7=addFlower(2.85,.75,-1.9,.62,1,.4);
const flower8=addFlower(-3.0,.9,-2.0,.58,0,-.4);
const flower9=addFlower(1.65,1.5,-2.1,.55,3,.65);
const flower10=addFlower(-1.55,1.65,-2.2,.52,2,-.65);
const flower11=addFlower(3.2,-.75,-2.2,.52,0,.25);
const flower12=addFlower(-3.25,-.85,-2.25,.5,1,-.25);

function addMixedFlower(kind,x,y,z,s,color=0,rot=0){
  const wrap=new THREE.Group();
  const bloom=kind==="tulip"?createTulip(color):kind==="daisy"?createDaisy():createPeony(color);
  bloom.scale.setScalar(s);bloom.rotation.y=rot;wrap.add(bloom);
  const stem=createStem(2.2*s);stem.position.y=-.26*s;wrap.add(stem);
  wrap.position.set(x,y,z);floralRoot.add(wrap);return wrap;
}
addMixedFlower("peony",-.15,.3,-.4,.9,1,.1);
addMixedFlower("tulip",2.25,.95,-1.25,.78,2,.4);
addMixedFlower("tulip",-2.45,1.05,-1.35,.72,0,-.35);
addMixedFlower("daisy",1.25,1.65,-1.9,.7,3,.2);
addMixedFlower("daisy",-1.05,-.95,-1.25,.72,3,-.2);

for(let i=0;i<(mobile?18:36);i++){
  const bud=createRose({radius:.7,colorIndex:i%4,petals:mobile?18:24});
  const a=(i/(mobile?18:36))*Math.PI*2;
  bud.scale.setScalar(.24+Math.random()*.22);
  bud.position.set(Math.cos(a)*(3.1+Math.random()*1.2),-1.6+Math.random()*3.6,-2.4-Math.random()*1.8);
  bud.rotation.set(Math.random()*.4,a,Math.random()*.3);
  floralRoot.add(bud);
}

const fallingPetals=new THREE.Group();
scene.add(fallingPetals);
const petals=[];
const petalCount=Math.round((mobile?72:160)*quality);
for(let i=0;i<petalCount;i++){
  const p=createPetalMesh(petalMaterials[i%3],.35+Math.random()*.3,.32+Math.random()*.4);
  p.scale.multiplyScalar(.18+Math.random()*.22);
  p.userData={
    speed:.14+Math.random()*.30,
    drift:(Math.random()-.5)*.52,
    spinX:(Math.random()-.5)*.8,
    spinY:(Math.random()-.5)*1.0,
    phase:Math.random()*Math.PI*2
  };
  p.position.set((Math.random()-.5)*9,Math.random()*8-1,(Math.random()-.5)*7);
  petals.push(p);fallingPetals.add(p);
}
fallingPetals.visible=false;

function resetPetal(p,top=true){
  p.position.set((Math.random()-.5)*9,top?4.8+Math.random()*2:-1,(Math.random()-.5)*7);
  p.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
}

function bloomBouquet(){
  let order=0;
  floralRoot.traverse(o=>{
    if(!o.isMesh||!petalMaterials.includes(o.material)||o.userData.bloomed)return;
    o.userData.bloomed=true;
    const target=o.scale.clone();
    o.scale.multiplyScalar(.18);
    gsap.to(o.scale,{x:target.x,y:target.y,z:target.z,duration:.8+Math.random()*.7,delay:Math.min(.65,order++*.012),ease:"back.out(1.35)"});
  });
}
function updateFloralScene(id){
  if(id==="flowerScene"){
    floralRoot.visible=true;fallingPetals.visible=true;
    gsap.killTweensOf(floralRoot.position);gsap.killTweensOf(floralRoot.scale);
    floralRoot.position.set(mobile?0:-1.2,mobile?1.15:.2,0);
    floralRoot.scale.setScalar(.15);
    gsap.to(floralRoot.scale,{x:mobile?.9:1.12,y:mobile?.9:1.12,z:mobile?.9:1.12,duration:reduced?.1:1.5,ease:"power3.out"});
    gsap.to(floralRoot.rotation,{y:.08,duration:5,ease:"sine.inOut"});
    setTimeout(bloomBouquet,120);
  }else if(id==="messages"){
    floralRoot.visible=false;fallingPetals.visible=true;
  }else if(id==="finale"){
    floralRoot.visible=true;fallingPetals.visible=true;
    floralRoot.position.set(0,mobile?1.55:.72,-.65);
    floralRoot.scale.setScalar(mobile?.82:1.02);
    gsap.fromTo(floralRoot.rotation,{y:-.22},{y:.18,duration:7,ease:"sine.inOut"});
  }else{
    floralRoot.visible=false;fallingPetals.visible=false;
  }
}

function buildSpeedLines(){
  const box=$("#speedLines");box.innerHTML="";
  for(let i=0;i<52;i++){
    const e=document.createElement("i");
    e.style.transform=`rotate(${i*(360/52)}deg)`;
    e.style.animationDelay=`${Math.random()*1.1}s`;
    box.appendChild(e);
  }
}
$("#startBtn").onclick=async()=>{
  audioEnabled=true;$("#soundBtn").classList.add("sound-on");$("#soundLabel").textContent="Sonido activo";tone(392,.6,.018);
  await showScene("countdown");
  const n=$("#countNumber");
  for(const item of ["3","2","1"]){
    n.textContent=item;
    gsap.fromTo(n,{autoAlpha:0,scale:.55,filter:"blur(18px)"},{autoAlpha:1,scale:1,duration:.65,ease:"power3.out"});
    gsap.to(n,{autoAlpha:0,scale:1.24,filter:"blur(10px)",delay:.7,duration:.55,ease:"power2.in"});
    tone(230+Number(item)*55,.25,.018);
    await wait(reduced?180:1500);
  }
  n.textContent="✦";gsap.fromTo(n,{autoAlpha:0,scale:.3},{autoAlpha:1,scale:.7,duration:1.2,ease:"power3.out"});
  tone(659,1.4,.022);await wait(reduced?150:900);startJourney();
};

async function startJourney(){
  await showScene("journey");warp=1;$("#speedLines").style.opacity="1";buildSpeedLines();
  const phrases=[
    ["Entre millones de luces","A veces una persona llega…"],
    ["Sin hacer demasiado ruido","…y cambia el color de algunos días."],
    ["Sin pedir nada a cambio","Hay sonrisas que se vuelven refugio y presencias que se sienten como calma."],
    ["Hoy, 21 de septiembre","quise recordarte que también eres parte de todo lo bonito que todavía existe."]
  ];
  for(const [k,p] of phrases){
    $("#journeyKicker").textContent=k;$("#journeyPhrase").textContent=p;
    gsap.fromTo($("#journeyPhrase"),{autoAlpha:0,y:32,filter:"blur(16px)"},{autoAlpha:1,y:0,filter:"blur(0)",duration:1.0,ease:"power3.out"});
    tone(293.66,2,.006);await wait(reduced?220:1800);
    gsap.to($("#journeyPhrase"),{autoAlpha:0,y:-18,filter:"blur(10px)",duration:.7,ease:"power2.in"});
    await wait(reduced?80:500);
  }
  warp=0;$("#speedLines").style.opacity="0";await showScene("flowerScene");chord();
}

$("#discoverBtn").onclick=async()=>{
  await showBridge("Mira un poco más cerca.");
  await showScene("messages");setupMessages();
};

const messages=[
  ["Tu sonrisa","Hay sonrisas capaces de cambiar el tono de un día entero. La tuya merece aparecer más veces."],
  ["Tu forma de ser","No necesitas esforzarte por parecerte a nadie. Hay belleza precisamente en todo aquello que te hace diferente."],
  ["Tus sueños","Ojalá nunca dejes pequeños tus sueños solamente para que quepan en las expectativas de otras personas."],
  ["Tu fuerza","Has llegado hasta aquí atravesando días fáciles y otros no tanto. Eso también habla de la fuerza que llevas dentro."],
  ["Tu calma","Que siempre encuentres lugares, personas y momentos donde puedas ser tú sin tener que demostrar absolutamente nada."],
  ["Tu futuro","Todavía existen abrazos, viajes, canciones, risas y días increíbles que aún no sabes que van a llevar tu nombre."],
  ["Tu corazón","Que nunca te hagan sentir que querer bonito es demasiado. El mundo necesita más personas capaces de sentir con sinceridad."],
  ["Simplemente tú","Entre millones de estrellas ninguna necesita parecerse a otra para brillar. Contigo pasa exactamente lo mismo."]
];
let seen=new Set();
function setupMessages(){
  const box=$("#constellation");if(box.children.length)return;
  const spots=mobile?[[12,18],[41,8],[72,21],[20,41],[58,38],[82,48],[37,60],[69,68]]:[[18,62],[31,47],[47,66],[61,43],[77,58],[70,76],[40,80],[84,34]];
  const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
  box.appendChild(svg);
  messages.forEach((m,i)=>{
    if(i>0){
      const line=document.createElementNS(ns,"line");
      line.setAttribute("x1",spots[i-1][0]+"%");line.setAttribute("y1",spots[i-1][1]+"%");
      line.setAttribute("x2",spots[i][0]+"%");line.setAttribute("y2",spots[i][1]+"%");svg.appendChild(line);
    }
    const b=document.createElement("button");b.className="message-node";b.dataset.label=m[0];
    b.style.left=spots[i][0]+"%";b.style.top=spots[i][1]+"%";
    b.setAttribute("aria-label","Abrir mensaje: "+m[0]);b.onclick=()=>openMessage(i,b);box.appendChild(b);
  });
}
function openMessage(i,node){
  seen.add(i);node.classList.add("is-read");
  $("#messageNumber").textContent=String(i+1).padStart(2,"0");$("#messageTitle").textContent=messages[i][0];$("#messageText").textContent=messages[i][1];
  $("#messageModal").classList.add("show");
  gsap.fromTo($("#messageModal"),{autoAlpha:0,y:16},{autoAlpha:1,y:0,duration:1,ease:"power3.out"});
  tone(430+i*27,.5,.012);haptic(12);
  if(seen.size>=4)$("#finalBtn").disabled=false;
}
$("#finalBtn").onclick=async()=>{
  haptic(22);
  await showBridge("Todavía falta algo.");
  await showScene("finale");
  createLisPetals();chord();
  setTimeout(()=>createHeart(),1450);
  setTimeout(()=>tone(659,2,.01),500);
};

function createLisPetals(){
  const box=$("#lisPetals");box.innerHTML="";
  const glyphs={
    L:["1000","1000","1000","1000","1111"],
    I:["111","010","010","010","111"],
    S:["1111","1000","1111","0001","1111"]
  };
  let offset=26;
  ["L","I","S"].forEach(letter=>{
    const rows=glyphs[letter],w=rows[0].length;
    rows.forEach((row,y)=>[...row].forEach((v,x)=>{
      if(v!=="1")return;
      const p=document.createElement("i");box.appendChild(p);
      const tx=offset+x*2.5,ty=29+y*5.2;
      gsap.set(p,{left:(Math.random()*100)+"%",top:(Math.random()*100)+"%",rotation:Math.random()*300,scale:.35+Math.random()*.7,opacity:0});
      gsap.to(p,{left:tx+"%",top:ty+"%",rotation:720*Math.random(),opacity:.86,duration:1.35,ease:"power3.out"});
    }));
    offset+=(w*2.5)+8;
  });
  setTimeout(()=>morphLisToHeart(),1500);
}
function morphLisToHeart(){
  const ps=[...$("#lisPetals").children],n=ps.length;
  ps.forEach((p,i)=>{
    const t=(i/n)*Math.PI*2,x=16*Math.pow(Math.sin(t),3),y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
    gsap.to(p,{left:(50+x*1.7)+"%",top:(48-y*1.7)+"%",rotation:"+=360",duration:1.35,ease:"power2.inOut"});
  });
}
function createHeart(){
  const box=$("#heartParticles");box.innerHTML="";
  for(let i=0;i<(mobile?125:210);i++){
    const t=Math.random()*Math.PI*2,x=16*Math.pow(Math.sin(t),3),y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
    const p=document.createElement("i");
    p.style.left=(50+x*2.35)+"%";p.style.top=(48-y*2.35)+"%";p.style.animationDelay=Math.random()*2+"s";
    p.style.transform=`scale(${.5+Math.random()*1.8})`;box.appendChild(p);
  }
  gsap.fromTo(box,{autoAlpha:0,scale:.7},{autoAlpha:.34,scale:1,duration:1.5,ease:"power3.out"});
}

let mx=0,my=0;
addEventListener("pointermove",e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
addEventListener("touchmove",e=>{const t=e.touches[0];if(t){mx=t.clientX/innerWidth-.5;my=t.clientY/innerHeight-.5}},{passive:true});
addEventListener("deviceorientation",e=>{
  if(e.gamma!=null){mx=Math.max(-.5,Math.min(.5,e.gamma/75));my=Math.max(-.5,Math.min(.5,(e.beta-40)/100))}
},{passive:true});
addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.35:1.8));
  renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
});

let last=performance.now(),time=0;
function animate(now){
  const dt=Math.min((now-last)/1000,.04);last=now;time+=dt;
  stars.rotation.z+=dt*.006;roseDust.rotation.z-=dt*.009;blueDust.rotation.y+=dt*.005;nebula.rotation.z+=dt*.0015;
  key.position.x=4+Math.sin(time*.22)*1.5;key.position.y=6+Math.cos(time*.18)*.7;
  warm.position.x=3+Math.cos(time*.2)*1.2;warm.intensity=12+Math.sin(time*.35)*2.2;
  camera.position.x+=(mx*.58-camera.position.x)*.018;camera.position.y+=(-my*.34-camera.position.y)*.018;
  camera.position.z+=((warp?1.7:8)-camera.position.z)*.025;
  stars.position.z+=warp?dt*7.5:dt*.045;if(stars.position.z>10)stars.position.z=0;
  roseDust.position.z+=warp?dt*4.5:0;if(roseDust.position.z>8)roseDust.position.z=0;

  if(floralRoot.visible){
    floralRoot.rotation.z=Math.sin(time*.28)*.018;
    floralRoot.children.forEach((f,i)=>{
      if(f.type==="Group"){
        f.rotation.y+=Math.sin(time*.22+i)*dt*.012;
        f.position.y+=Math.sin(time*.35+i)*dt*.002;
      }
    });
  }
  if(fallingPetals.visible){
    petals.forEach((p,i)=>{
      const u=p.userData;
      p.position.y-=u.speed*dt*(.8+petalIntensity*.65);
      p.position.x+=Math.sin(time*.7+u.phase)*u.drift*dt;
      p.rotation.x+=u.spinX*dt;p.rotation.y+=u.spinY*dt;
      if(p.position.y<-4.8)resetPetal(p,true);
      p.visible=Math.random()<Math.min(1,.82+petalIntensity*.12);
    });
  }
  frameCounter++;
  if(now-fpsClock>3200){
    const fps=frameCounter/((now-fpsClock)/1000);
    if(fps<42&&!lowFpsMode){
      lowFpsMode=true;quality*=.72;
      renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.05:1.35));
      bloom.strength*=.72;
      petals.forEach((p,i)=>{if(i%2)p.visible=false});
      if(bokeh)bokeh.enabled=false;
    }
    frameCounter=0;fpsClock=now;
  }
  composer.render();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

gsap.set(scenes.filter(s=>!s.classList.contains("scene--active")),{autoAlpha:0});
gsap.from(".intro .eyebrow",{autoAlpha:0,y:10,duration:1.4,delay:.35,ease:"power2.out"});
gsap.from(".intro h1",{autoAlpha:0,y:24,filter:"blur(12px)",duration:2.2,delay:.55,ease:"power3.out"});
gsap.from(".intro .lead",{autoAlpha:0,y:15,duration:1.7,delay:1.15,ease:"power2.out"});
gsap.from(".intro .primary-btn",{autoAlpha:0,y:12,duration:1.5,delay:1.55,ease:"power2.out"});


function setPhotoMode(enabled){
  document.body.classList.toggle("photo-mode",enabled);
  haptic(8);
}
$("#photoBtn")?.addEventListener("click",()=>setPhotoMode(true));
$("#photoExitBtn")?.addEventListener("click",()=>setPhotoMode(false));
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    setPhotoMode(false);
    $("#letterModal")?.classList.remove("is-open");
    $("#letterModal")?.setAttribute("aria-hidden","true");
  }
});

$("#letterBtn")?.addEventListener("click",()=>{
  const modal=$("#letterModal");modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");haptic(18);
  gsap.fromTo(".letter-sheet",{autoAlpha:0,y:24,scale:.97},{autoAlpha:1,y:0,scale:1,duration:.7,ease:"power3.out"});
});
$("#closeLetterBtn")?.addEventListener("click",()=>{
  const modal=$("#letterModal");
  gsap.to(".letter-sheet",{autoAlpha:0,y:16,duration:.35,ease:"power2.in",onComplete:()=>{
    modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");
  }});
});

finishLoader();
