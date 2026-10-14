const challenges = [
  {id:"quiz", type:"juego", title:"Duelo de cultura general", desc:"5 preguntas rápidas. ¿Cuántas aciertas?", icon:"🧠", art:"art-purple", tag:"MINIJUEGO", players:"42 jugando", action:"Jugar ahora"},
  {id:"memory", type:"juego", title:"Memoria relámpago", desc:"Pon a prueba tu memoria visual.", icon:"🧩", art:"art-blue", tag:"MINIJUEGO", players:"28 jugando", action:"Jugar ahora"},
  {id:"speed", type:"juego", title:"Reto de velocidad", desc:"Resuelve una secuencia contra reloj.", icon:"⚡", art:"art-pink", tag:"MINIJUEGO", players:"19 jugando", action:"Probar reto"},
  {id:"dance", type:"real", title:"Tu mejor paso de baile", desc:"Comparte tu vídeo y deja que la comunidad lo descubra.", icon:"🕺", art:"art-pink", tag:"RETO REAL", players:"12 participantes", action:"Ver reto"},
  {id:"talent", type:"real", title:"60 segundos de talento", desc:"Música, dibujo, magia o una habilidad sorprendente.", icon:"🎤", art:"art-purple", tag:"RETO REAL", players:"8 participantes", action:"Ver reto"},
  {id:"photo", type:"real", title:"Foto creativa del día", desc:"Cuenta una historia con una sola imagen.", icon:"📸", art:"art-green", tag:"RETO REAL", players:"15 participantes", action:"Ver reto"}
];
const questions = [
  {q:"¿Cuál es el planeta más grande del sistema solar?", a:["Marte","Júpiter","Venus","Mercurio"], correct:1, fact:"Júpiter es el planeta más grande del sistema solar."},
  {q:"¿Cuántos lados tiene un hexágono?", a:["5","6","7","8"], correct:1, fact:"Un hexágono tiene seis lados."},
  {q:"¿Qué océano es el más grande?", a:["Atlántico","Índico","Pacífico","Ártico"], correct:2, fact:"El océano Pacífico es el de mayor superficie."},
  {q:"¿Cuánto es 9 × 7?", a:["56","63","72","67"], correct:1, fact:"9 por 7 es 63."},
  {q:"¿Qué gas absorben las plantas principalmente durante la fotosíntesis?", a:["Oxígeno","Helio","Dióxido de carbono","Hidrógeno"], correct:2, fact:"Las plantas absorben dióxido de carbono durante la fotosíntesis."}
];
const community = [
  {id:"c1",title:"Mi truco de fútbol",desc:"¿Cuántos toques seguidos puedes hacer?",creator:"Leo_10",icon:"⚽",votes:18},
  {id:"c2",title:"Dibujo en 1 minuto",desc:"Un dibujo rápido, sin borrar.",creator:"NereaCrea",icon:"🎨",votes:14},
  {id:"c3",title:"Imita una voz famosa",desc:"Adivina el personaje en los comentarios.",creator:"VozMisteriosa",icon:"🎭",votes:11},
  {id:"c4",title:"Construcción imposible",desc:"La torre más alta usando solo papel.",creator:"PapelPro",icon:"🗼",votes:9}
];
const players = [
  {name:"LunaPixel", initials:"LP", points:1480, label:"Racha de 4 días"},
  {name:"AlexReto", initials:"AR", points:1260, label:"Jugador versátil"},
  {name:"NereaCrea", initials:"NC", points:990, label:"Creadora"},
  {name:"Leo_10", initials:"L10", points:870, label:"En racha"},
  {name:"PixelMarta", initials:"PM", points:740, label:"Exploradora"}
];
let votes = JSON.parse(localStorage.getItem("retoarena_votes") || "{}");
let localSubmissions = JSON.parse(localStorage.getItem("retoarena_submissions") || "[]");
let points = Number(localStorage.getItem("retoarena_points") || "0");
let gameState = {index:0, score:0, answered:false};
let deferredInstallPrompt = null;

const $ = (sel) => document.querySelector(sel);
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600)}
function renderChallenges(filter="todos"){
  const list=challenges.filter(c=>filter==="todos"||c.type===filter);
  $("#challengeGrid").innerHTML=list.map(c=>`<article class="challenge-card">
    <div class="challenge-art ${c.art}"><span class="tag ${c.type==="real"?"real":"open"}">${c.tag}</span><span class="emoji">${c.icon}</span></div>
    <div class="challenge-body"><h3>${c.title}</h3><p>${c.desc}</p><div class="card-meta"><span>◉ ${c.players}</span><span>${c.type==="real"?"Comunidad":"Puntos demo"}</span></div>
    <button class="play-btn" data-challenge="${c.id}">${c.action} <span>↗</span></button></div></article>`).join("");
  $("#statChallenges").textContent=String(challenges.length);
}
function renderCommunity(){
  const combined=[...community,...localSubmissions.filter(s=>s.status==="pending").map(s=>({id:s.id,title:s.title,desc:s.description||"Reto enviado para revisión.",creator:s.creator,icon:"🎬",votes:0,pending:true}))];
  $("#communityGrid").innerHTML=combined.map(c=>`<article class="community-card"><div class="community-thumb">${c.icon}</div><div class="community-content"><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.desc)}</p><div class="community-foot"><span class="creator">@${escapeHtml(c.creator)} ${c.pending? "· Pendiente":""}</span><button class="vote-btn" data-vote="${c.id}" ${c.pending?"disabled":""}>♡ ${c.votes+(votes[c.id]||0)} ${votes[c.id]?"· Votado":""}</button></div></div></article>`).join("");
}
function renderLeaderboard(){
  const list=[...players]; if(points>0)list.push({name:"Tú (demo)",initials:"TÚ",points,label:"Tu puntuación local"});
  list.sort((a,b)=>b.points-a.points);
  $("#leaderboard").innerHTML=list.slice(0,6).map((p,i)=>`<div class="leader-row"><span class="rank ${i===0?"gold":""}">${String(i+1).padStart(2,"0")}</span><div class="player"><span class="player-avatar">${p.initials}</span><span><b>${p.name}</b><small>${p.label}</small></span></div><span class="points">${p.points.toLocaleString("es-ES")} <small>pts</small></span></div>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function startQuiz(){
  gameState={index:0,score:0,answered:false}; showQuestion();
  $("#gameDialog").showModal();
}
function showQuestion(){
  if(gameState.index>=questions.length){finishQuiz();return}
  const q=questions[gameState.index];
  $("#gameContent").innerHTML=`<span class="game-kicker">ARENA DIGITAL · PREGUNTA ${gameState.index+1}/${questions.length}</span><h2>Duelo de cultura general</h2><div class="game-question">${q.q}</div><div class="answer-list">${q.a.map((a,i)=>`<button class="answer-btn" data-answer="${i}">${String.fromCharCode(65+i)}. ${a}</button>`).join("")}</div><div id="answerFeedback"></div><p class="form-hint">Modo demostración: los puntos se guardan solo en este dispositivo.</p>`;
}
function answerQuestion(index){
  if(gameState.answered)return; gameState.answered=true;
  const q=questions[gameState.index];const correct=index===q.correct;if(correct)gameState.score+=100;
  document.querySelectorAll("[data-answer]").forEach((b,i)=>{b.disabled=true;if(i===q.correct)b.classList.add("correct");else if(i===index)b.classList.add("wrong")});
  $("#answerFeedback").innerHTML=`<div class="game-result">${correct?"✅ ¡Correcto! +100 puntos":"💡 No pasa nada."} ${q.fact}<br><button class="primary-btn full" id="nextQuestion">${gameState.index===questions.length-1?"Ver resultado":"Siguiente pregunta"} ↗</button></div>`;
}
function finishQuiz(){
  points+=gameState.score;localStorage.setItem("retoarena_points",String(points));renderLeaderboard();
  $("#gameContent").innerHTML=`<span class="game-kicker">FIN DEL RETO</span><h2>¡Bien jugado!</h2><div class="game-result">Has conseguido <strong>${gameState.score} puntos demo</strong> en esta partida. Tu total local es ${points} puntos.<br><br>Estos puntos no tienen valor monetario y no representan un premio.</div><button class="primary-btn full" id="playAgain">Volver a jugar ↻</button>`;
}
function openRealChallenge(id){
  const c=challenges.find(x=>x.id===id);
  $("#gameContent").innerHTML=`<span class="game-kicker">ARENA REAL</span><h2>${c.title}</h2><p class="modal-intro">${c.desc}</p><div class="game-result"><strong>¿Cómo participar?</strong><br>Prepara un vídeo seguro, publícalo en una plataforma que permita compartirlo y envía el enlace con el botón “Publicar”. En esta versión, los retos se revisan manualmente y no hay premios activos.</div><button class="primary-btn full" id="fromRealSubmit">Publicar mi reto ↗</button>`;
  $("#gameDialog").showModal();
}
function openMemory(){
  const icons=["🍋","🎧","🚀","🐼","🎯","🌈","🍋","🎧","🚀","🐼","🎯","🌈"];
  let shuffled=icons.map((v,i)=>({v,k:i})).sort(()=>Math.random()-.5), opened=[],matched=0,locked=false;
  $("#gameContent").innerHTML=`<span class="game-kicker">ARENA DIGITAL</span><h2>Memoria relámpago</h2><p class="modal-intro">Encuentra las seis parejas. Toca dos tarjetas para descubrirlas.</p><div class="memory-grid">${shuffled.map((x,i)=>`<button class="memory-card" data-mem="${i}" aria-label="Tarjeta oculta">?</button>`).join("")}</div><div id="memoryStatus" class="game-result">Parejas: 0/6</div>`;
  $("#gameDialog").showModal();
  $("#gameContent").onclick=(e)=>{const b=e.target.closest("[data-mem]");if(!b||locked||b.classList.contains("matched")||opened.includes(Number(b.dataset.mem)))return;const i=Number(b.dataset.mem);b.textContent=shuffled[i].v;b.classList.add("revealed");opened.push(i);if(opened.length===2){const [a,z]=opened;if(shuffled[a].v===shuffled[z].v){document.querySelectorAll(`[data-mem="${a}"],[data-mem="${z}"]`).forEach(x=>x.classList.add("matched"));matched++;opened=[];$("#memoryStatus").textContent=`Parejas: ${matched}/6`;if(matched===6){points+=100;localStorage.setItem("retoarena_points",String(points));$("#memoryStatus").innerHTML="🎉 ¡Completado! +100 puntos demo. <button class='play-btn' id='memoryAgain'>Jugar otra vez</button>";renderLeaderboard()}}else{locked=true;setTimeout(()=>{[a,z].forEach(n=>{const el=document.querySelector(`[data-mem="${n}"]`);if(el){el.textContent="?";el.classList.remove("revealed")}});opened=[];locked=false},700)}}};
}
$("#challengeGrid").addEventListener("click",e=>{const b=e.target.closest("[data-challenge]");if(!b)return;const id=b.dataset.challenge;if(id==="quiz")startQuiz();else if(id==="memory")openMemory();else if(id==="speed"){let seq=Array.from({length:5},()=>Math.floor(Math.random()*9)+1);$("#gameContent").innerHTML=`<span class="game-kicker">ARENA DIGITAL</span><h2>Reto de velocidad</h2><p class="modal-intro">Memoriza esta secuencia durante 3 segundos y luego introdúcela.</p><div class="game-result" id="sequence">${seq.join(" · ")}</div><form id="speedForm" class="submit-form"><label>Escribe los números en orden<input name="sequence" required inputmode="numeric" pattern="[0-9 ]+" placeholder="Ej. 3 5 1 8 2"></label><button class="primary-btn full">Comprobar ↗</button></form><div id="speedResult"></div>`;$("#gameDialog").showModal();setTimeout(()=>{const s=$("#sequence");if(s)s.textContent="Secuencia oculta";},3000);$("#gameContent").onsubmit=(ev)=>{if(ev.target.id!=="speedForm")return;ev.preventDefault();const val=new FormData(ev.target).get("sequence").replace(/\s/g,"");const ok=val===seq.join("");if(ok){points+=100;localStorage.setItem("retoarena_points",String(points));renderLeaderboard()}$("#speedResult").innerHTML=`<div class="game-result">${ok?"⚡ ¡Correcto! +100 puntos demo.":"La secuencia era "+seq.join("")+". ¡Inténtalo de nuevo!"}</div>`;};}else openRealChallenge(id)});
$("#gameContent").addEventListener("click",e=>{const a=e.target.closest("[data-answer]");if(a){answerQuestion(Number(a.dataset.answer));return}if(e.target.id==="nextQuestion"){gameState.index++;gameState.answered=false;showQuestion()}if(e.target.id==="playAgain")startQuiz();if(e.target.id==="fromRealSubmit"){$("#gameDialog").close();$("#submitDialog").showModal()}if(e.target.id==="memoryAgain")openMemory()});
$("#communityGrid").addEventListener("click",e=>{const b=e.target.closest("[data-vote]");if(!b||b.disabled)return;const id=b.dataset.vote;if(votes[id]){toast("Ya has votado este reto desde este navegador.");return}votes[id]=1;localStorage.setItem("retoarena_votes",JSON.stringify(votes));renderCommunity();toast("¡Voto registrado en esta demo!")});
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderChallenges(b.dataset.filter)}));
$("#exploreBtn").addEventListener("click",()=>$("#challenges").scrollIntoView({behavior:"smooth"}));
$("#submitNav").addEventListener("click",()=>$("#submitDialog").showModal());
$("#submitForm").addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.target);const url=String(fd.get("url")).trim();if(!/^https?:\/\//i.test(url)){toast("Introduce un enlace válido que empiece por https://");return}const sub={id:"local-"+Date.now(),title:String(fd.get("title")).trim(),creator:String(fd.get("creator")).trim(),url,description:String(fd.get("description")||"").trim(),status:"pending",createdAt:new Date().toISOString()};localSubmissions.unshift(sub);localStorage.setItem("retoarena_submissions",JSON.stringify(localSubmissions));renderCommunity();$("#submitFeedback").classList.remove("hidden");$("#submitFeedback").textContent="Envío guardado en este dispositivo y marcado como pendiente. En esta demo no se publica en un servidor ni lo recibe un moderador.";e.target.reset();toast("Reto guardado localmente")});

document.addEventListener("retoarena:retos-cargados", (event) => {
  const retos = Array.isArray(event.detail) ? event.detail : [];
  const idsExistentes = new Set(challenges.map((reto) => reto.id));

  retos.forEach((reto) => {
    const id = `supabase-${reto.id}`;

    if (idsExistentes.has(id)) return;

    const esJuego = reto.category === "juego";

    challenges.push({
      id,
      type: esJuego ? "juego" : "real",
      title: reto.title || "Reto de la comunidad",
      desc: reto.description || "Descubre este reto de la comunidad.",
      icon: esJuego ? "🎮" : "🎬",
      art: esJuego ? "art-blue" : "art-pink",
      tag: esJuego ? "MINIJUEGO" : "RETO REAL",
      players: "Reto aprobado",
      action: esJuego ? "Jugar ahora" : "Ver reto",
      videoUrl: reto.video_url || ""
    });

    idsExistentes.add(id);
  });

  const filtroActivo = document.querySelector(".filter.active");

  renderChallenges(
    filtroActivo ? filtroActivo.dataset.filter : "todos"
  );
});
renderChallenges();renderCommunity();renderLeaderboard();
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").addEventListener("click",async()=>{if(!deferredInstallPrompt){toast("En iPhone: abre el menú Compartir de Safari y elige “Añadir a pantalla de inicio”.");return}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$("#installBtn").classList.add("hidden")});
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
if(/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!window.matchMedia("(display-mode: standalone)").matches){$("#installBtn").classList.remove("hidden");$("#installBtn").addEventListener("click",()=>toast("En Safari: Compartir → Añadir a pantalla de inicio."))}
