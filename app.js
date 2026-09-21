import * as THREE from "three";

const $ = s => document.querySelector(s);
const scenes = [...document.querySelectorAll(".scene")];
const progress = $("#progressBar");
let currentScene = 0;
let audioEnabled = false;
let audioCtx = null;
let warp = 0;

function showScene(id, step){
  scenes.forEach(s => s.classList.toggle("scene--active", s.id === id));
  currentScene = step;
  progress.style.width = Math.max(8, (step / 5) * 100) + "%";
}

function tone(freq=220,duration=.2,volume=.035){
  if(!audioEnabled) return;
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type="sine"; o.frequency.setValueAtTime(freq,audioCtx.currentTime);
  g.gain.setValueAtTime(0,audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(volume,audioCtx.currentTime+.02);
  g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
  o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);
}

function ambience(){
  if(!audioEnabled) return;
  [146.83,220,293.66].forEach((f,i)=>setTimeout(()=>tone(f,2.8,.012),i*650));
}

$("#soundBtn").addEventListener("click",()=>{
  audioEnabled=!audioEnabled;
  $("#soundBtn").classList.toggle("sound-on",audioEnabled);
  $("#soundLabel").textContent=audioEnabled?"Sonido activo":"Sonido";
  if(audioEnabled){ tone(523,.35,.025); ambience(); }
});

$("#restartBtn").addEventListener("click",()=>location.reload());
$("#replayBtn").addEventListener("click",()=>location.reload());

function makeFlower(el, petals=15){
  el.innerHTML="";
  for(let i=0;i<petals;i++){
    const p=document.createElement("i"); p.className="petal";
    const angle=(360/petals)*i, scale=.68+(i%4)*.08;
    p.style.transform=`rotate(${angle}deg) translate(5px,-50%) scale(${scale}) rotateX(${(i%3)*7}deg)`;
    p.style.filter=`hue-rotate(${(i%3-1)*5}deg) brightness(${.88+(i%5)*.035})`;
    el.appendChild(p);
  }
  const core=document.createElement("i");core.className="core";el.appendChild(core);
}
document.querySelectorAll(".flower").forEach((f,i)=>makeFlower(f,i?11:17));

$("#startBtn").addEventListener("click", async ()=>{
  audioEnabled=true; $("#soundBtn").classList.add("sound-on"); $("#soundLabel").textContent="Sonido activo";
  tone(392,.5,.025);
  showScene("countdown",1);
  const n=$("#countNumber"), c=$("#countCaption");
  for(const item of ["3","2","1"]){
    n.textContent=item; n.animate([{opacity:0,transform:"scale(.6)"},{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(1.35)"}],{duration:900,easing:"cubic-bezier(.2,.8,.2,1)"});
    tone(220+Number(item)*50,.18,.025);
    await wait(900);
  }
  c.textContent="prepárate para una nueva experiencia";
  n.textContent="✦"; tone(659,.8,.03); await wait(700);
  startJourney();
});

const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function startJourney(){
  showScene("journey",2); warp=1;
  $("#speedLines").style.opacity="1";
  buildSpeedLines();
  const phrases=[
    ["Entre millones de luces","A veces una persona llega…"],
    ["Sin avisar","…y hace que algunos días se sientan diferentes."],
    ["Sin darse cuenta","Nos recuerda que todavía existen razones para sonreír."],
    ["Hoy, 21 de septiembre","quise dejarte una pequeña prueba de ello."]
  ];
  for(const [k,p] of phrases){
    $("#journeyKicker").textContent=k;$("#journeyPhrase").textContent=p;
    $("#journeyPhrase").animate([{opacity:0,filter:"blur(14px)",transform:"translateY(25px)"},{opacity:1,filter:"blur(0)",transform:"none"}],{duration:850,fill:"both"});
    tone(293.66,1.6,.009); await wait(1900);
  }
  warp=0; $("#speedLines").style.opacity="0"; showScene("flowerScene",3); ambience();
}

function buildSpeedLines(){
  const box=$("#speedLines");box.innerHTML="";
  for(let i=0;i<40;i++){const e=document.createElement("i");e.style.transform=`rotate(${i*9}deg)`;e.style.animationDelay=`${Math.random()*.8}s`;box.appendChild(e)}
}

$("#discoverBtn").addEventListener("click",()=>{showScene("messages",4);setupMessages()});

const messages=[
  ["Alegría","Que nunca te falten razones para sonreír, incluso en los días que parezcan pequeños."],
  ["Sueños","Que sigas persiguiendo aquello que te emociona, aunque el camino todavía no esté completo."],
  ["Fortaleza","Recuerda todo lo que ya superaste. Eres más fuerte de lo que a veces imaginas."],
  ["Cariño","Que siempre estés rodeada de personas capaces de quererte bonito y con verdad."],
  ["Esperanza","Incluso la noche más larga termina encontrándose con la luz."],
  ["Futuro","Todavía existen muchos momentos increíbles que aún no sabes que van a ocurrir."],
  ["Calma","No tienes que tener todo resuelto hoy. También está bien avanzar despacio."],
  ["Tú","Entre tantas estrellas, ninguna necesita parecerse a otra para poder brillar."]
];
let seen=new Set();

function setupMessages(){
  const box=$("#constellation"); if(box.children.length) return;
  const spots=[[18,63],[31,48],[47,67],[61,43],[77,58],[70,75],[40,82],[84,34]];
  messages.forEach((m,i)=>{
    const b=document.createElement("button");b.className="message-node";b.dataset.label=m[0];
    b.style.left=spots[i][0]+"%";b.style.top=spots[i][1]+"%";b.setAttribute("aria-label","Abrir mensaje: "+m[0]);
    b.addEventListener("click",()=>openMessage(i,b));box.appendChild(b)
  })
}
function openMessage(i,node){
  seen.add(i);node.classList.add("is-read");
  $("#messageNumber").textContent=String(i+1).padStart(2,"0");$("#messageTitle").textContent=messages[i][0];$("#messageText").textContent=messages[i][1];
  $("#messageModal").classList.add("show");tone(440+i*25,.45,.018);
  if(seen.size>=4) $("#finalBtn").disabled=false;
}
$("#finalBtn").addEventListener("click",()=>{showScene("finale",5);createHeart();tone(523,1.8,.02);setTimeout(()=>tone(659,1.8,.015),420)});

function createHeart(){
  const box=$("#heartParticles");box.innerHTML="";
  for(let i=0;i<150;i++){
    const t=Math.random()*Math.PI*2;
    const x=16*Math.pow(Math.sin(t),3);
    const y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
    const p=document.createElement("i");p.style.left=(50+x*2.4)+"%";p.style.top=(48-y*2.4)+"%";
    p.style.opacity=.25+Math.random()*.75;p.style.transform=`scale(${.5+Math.random()*1.8})`;box.appendChild(p)
  }
}

// Three.js galaxy
const canvas=$("#space"), renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x05030b,.035);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,1000);camera.position.z=7;

function starField(count,radius,size,color){
  const g=new THREE.BufferGeometry(),p=new Float32Array(count*3);
  for(let i=0;i<count;i++){const r=Math.pow(Math.random(),.52)*radius, a=Math.random()*Math.PI*2, z=(Math.random()-.5)*radius*1.7;p[i*3]=Math.cos(a)*r;p[i*3+1]=Math.sin(a)*r*.65;p[i*3+2]=z}
  g.setAttribute("position",new THREE.BufferAttribute(p,3));
  const m=new THREE.PointsMaterial({color,size,transparent:true,opacity:.85,sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending});
  return new THREE.Points(g,m)
}
const stars=starField(3500,34,.055,0xe7dcff), dust=starField(1600,23,.09,0xff9fc9), blue=starField(900,27,.08,0x8b80ff);
scene.add(stars,dust,blue);
const nebula=new THREE.Mesh(new THREE.SphereGeometry(11,48,48),new THREE.MeshBasicMaterial({color:0x3a174f,transparent:true,opacity:.055,side:THREE.BackSide}));
scene.add(nebula);

let mx=0,my=0;
addEventListener("pointermove",e=>{mx=(e.clientX/innerWidth-.5);my=(e.clientY/innerHeight-.5)});
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

let last=performance.now();
function render(now){
  const dt=Math.min((now-last)/1000,.04);last=now;
  stars.rotation.z+=dt*.008;dust.rotation.z-=dt*.012;blue.rotation.y+=dt*.006;
  camera.position.x+=(mx*.6-camera.position.x)*.025;camera.position.y+=(-my*.4-camera.position.y)*.025;
  camera.position.z += ((warp?1.8:7)-camera.position.z)*.035;
  stars.position.z += warp?dt*8:dt*.08;if(stars.position.z>10)stars.position.z=0;
  dust.position.z += warp?dt*5:0;if(dust.position.z>8)dust.position.z=0;
  renderer.render(scene,camera);requestAnimationFrame(render)
}
requestAnimationFrame(render);
