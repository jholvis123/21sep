import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm";

const $=s=>document.querySelector(s);
const scenes=[...document.querySelectorAll(".scene")];
const progress=$("#progressBar");
let currentScene="intro",audioEnabled=false,audioCtx=null,seen=new Set();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const haptic=(ms=10)=>{try{navigator.vibrate?.(ms)}catch{}};

document.body.classList.add("lite-mode");
$("#fallback")?.setAttribute("hidden","");
const canvas=$("#space");if(canvas)canvas.style.display="none";

function tone(freq=220,duration=.2,volume=.016){
  if(!audioEnabled)return;
  try{
    if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type="sine";o.frequency.value=freq;
    g.gain.setValueAtTime(.0001,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(volume,audioCtx.currentTime+.03);
    g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
    o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);
  }catch{}
}

function makeLiteGarden(){
  const layer=document.createElement("div");layer.className="lite-garden";layer.id="liteGarden";
  const flowers=[
    ["rose",-18,8,1.15],["peony",5,2,1],["tulip",24,8,.86],["rose",-32,26,.72],
    ["daisy",35,30,.65],["peony",-5,29,.74],["tulip",18,38,.63],["rose",-25,44,.58]
  ];
  flowers.forEach(([type,x,y,s],idx)=>{
    const f=document.createElement("div");f.className="lite-flower "+type;
    f.style.setProperty("--x",x+"vw");f.style.setProperty("--y",y+"vh");f.style.setProperty("--s",s);
    for(let i=0;i<(type==="daisy"?12:type==="tulip"?6:16);i++){
      const p=document.createElement("i");p.style.setProperty("--i",i);p.style.setProperty("--n",type==="daisy"?12:type==="tulip"?6:16);f.appendChild(p);
    }
    const core=document.createElement("b");f.appendChild(core);layer.appendChild(f);
  });
  document.body.appendChild(layer);

  const petals=document.createElement("div");petals.className="lite-petals";petals.id="litePetals";
  for(let i=0;i<56;i++){
    const p=document.createElement("i");
    p.style.left=Math.random()*100+"vw";
    p.style.animationDelay=(-Math.random()*8)+"s";
    p.style.animationDuration=(4.5+Math.random()*5)+"s";
    p.style.setProperty("--drift",(Math.random()*140-70)+"px");
    p.style.setProperty("--size",(.55+Math.random()*.9).toFixed(2));
    petals.appendChild(p);
  }
  document.body.appendChild(petals);
}
makeLiteGarden();

async function showScene(id){
  if(id===currentScene)return;
  const old=$("#"+currentScene),next=$("#"+id);
  if(old){gsap.to(old,{autoAlpha:0,duration:.55});await wait(420);old.classList.remove("scene--active")}
  next.classList.add("scene--active");gsap.fromTo(next,{autoAlpha:0},{autoAlpha:1,duration:.7});
  currentScene=id;
  progress.style.width=Math.max(8,({intro:0,countdown:1,journey:2,flowerScene:3,messages:4,finale:5}[id]/5)*100)+"%";
  document.body.dataset.scene=id;
}

$("#soundBtn").onclick=()=>{audioEnabled=!audioEnabled;$("#soundBtn").classList.toggle("sound-on",audioEnabled);$("#soundLabel").textContent=audioEnabled?"Sonido activo":"Sonido";tone(523,.3)};
$("#restartBtn").onclick=()=>location.reload();$("#replayBtn").onclick=()=>location.reload();

$("#startBtn").onclick=async()=>{
  audioEnabled=true;$("#soundBtn").classList.add("sound-on");$("#soundLabel").textContent="Sonido activo";
  await showScene("countdown");
  const n=$("#countNumber");
  for(const item of ["3","2","1"]){
    n.textContent=item;
    gsap.fromTo(n,{autoAlpha:0,scale:.62,filter:"blur(12px)"},{autoAlpha:1,scale:1,filter:"blur(0)",duration:.6});
    gsap.to(n,{autoAlpha:0,scale:1.22,delay:.72,duration:.5});
    tone(240+Number(item)*55,.18);await wait(1500);
  }
  n.textContent="✦";gsap.fromTo(n,{autoAlpha:0,scale:.4},{autoAlpha:1,scale:.72,duration:.7});await wait(700);
  await showScene("journey");
  const phrases=[
    ["Entre millones de luces","A veces una persona llega…"],
    ["Sin hacer demasiado ruido","…y cambia el color de algunos días."],
    ["Sin pedir nada a cambio","Hay sonrisas que se vuelven refugio y presencias que se sienten como calma."],
    ["Hoy, 21 de septiembre","quise recordarte que también eres parte de todo lo bonito que todavía existe."]
  ];
  for(const [k,p] of phrases){
    $("#journeyKicker").textContent=k;$("#journeyPhrase").textContent=p;
    gsap.fromTo($("#journeyPhrase"),{autoAlpha:0,y:22,filter:"blur(10px)"},{autoAlpha:1,y:0,filter:"blur(0)",duration:.65});
    await wait(1500);gsap.to($("#journeyPhrase"),{autoAlpha:0,duration:.35});await wait(350);
  }
  await showScene("flowerScene");
};

$("#discoverBtn").onclick=async()=>{await showScene("messages");setupMessages()};

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
function setupMessages(){
  const box=$("#constellation");if(box.querySelector(".message-node"))return;
  const spots=innerWidth<800?[[12,18],[41,8],[72,21],[20,41],[58,38],[82,48],[37,60],[69,68]]:[[18,62],[31,47],[47,66],[61,43],[77,58],[70,76],[40,80],[84,34]];
  messages.forEach((m,i)=>{
    const b=document.createElement("button");b.className="message-node";b.dataset.label=m[0];
    b.style.left=spots[i][0]+"%";b.style.top=spots[i][1]+"%";
    b.onclick=()=>{seen.add(i);b.classList.add("is-read");$("#messageNumber").textContent=String(i+1).padStart(2,"0");$("#messageTitle").textContent=m[0];$("#messageText").textContent=m[1];$("#messageModal").classList.add("show");gsap.fromTo($("#messageModal"),{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.5});haptic(10);if(seen.size>=4)$("#finalBtn").disabled=false};
    box.appendChild(b);
  });
}
$("#finalBtn").onclick=async()=>{await showScene("finale");document.body.classList.add("lite-dawn");createLiteLis();haptic(20)};

function createLiteLis(){
  const box=$("#lisPetals");box.innerHTML="";
  const letters=["L","I","S"];
  letters.forEach((letter,li)=>{
    const s=document.createElement("span");s.textContent=letter;s.className="lite-letter";box.appendChild(s);
    gsap.fromTo(s,{autoAlpha:0,y:25,scale:.7},{autoAlpha:1,y:0,scale:1,duration:.8,delay:li*.15,ease:"back.out(1.7)"});
  });
  setTimeout(()=>box.classList.add("heart-shape"),1400);
}

function setPhotoMode(on){document.body.classList.toggle("photo-mode",on)}
$("#photoBtn")?.addEventListener("click",()=>setPhotoMode(true));
$("#photoExitBtn")?.addEventListener("click",()=>setPhotoMode(false));
$("#letterBtn")?.addEventListener("click",()=>{$("#letterModal").classList.add("is-open");$("#letterModal").setAttribute("aria-hidden","false")});
$("#closeLetterBtn")?.addEventListener("click",()=>{$("#letterModal").classList.remove("is-open");$("#letterModal").setAttribute("aria-hidden","true")});

const loader=$("#loader");if(loader){$("#loaderBar").style.width="100%";$("#loaderPercent").textContent="100%";setTimeout(()=>loader.classList.add("is-hidden"),500)}
gsap.from(".intro h1",{autoAlpha:0,y:20,filter:"blur(10px)",duration:1.1});
