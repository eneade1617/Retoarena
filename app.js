const challenges = [];
const categoryNames = {
  extremo: "EXTREMO · SOLO RETOS SEGUROS",
  comida: "COMIDA",
  deporte: "DEPORTE",
  challenge: "CHALLENGE",
  "te-reto": "TE RETO"
};
const questions = [
  {level:"CALENTAMIENTO",time:20,q:"Un producto cuesta 80 €. Tiene un descuento del 25 %. ¿Cuál es el precio final?",a:["65 €","60 €","55 €","75 €"],correct:1,fact:"El 25 % de 80 es 20; 80 − 20 = 60 €."},
  {level:"ESTRATEGIA",time:18,q:"Una secuencia sigue esta regla: 2, 6, 12, 20, 30… ¿Qué número sigue?",a:["36","42","40","44"],correct:1,fact:"Las diferencias son +4, +6, +8, +10; sigue +12. La respuesta es 42."},
  {level:"RAZONAMIENTO",time:15,q:"Todos los zorbs son azules. Algunos objetos azules son metálicos. ¿Qué conclusión es segura?",a:["Todos los zorbs son metálicos","Ningún zorb es metálico","Todos los zorbs son azules","Todos los objetos metálicos son zorbs"],correct:2,fact:"La única conclusión garantizada es que todos los zorbs son azules; las otras relaciones no se deducen."},
  {level:"ÉLITE",time:12,q:"Un tren recorre 120 km en 1 h 30 min a velocidad constante. ¿Cuánto tardará en recorrer 200 km?",a:["2 h","2 h 30 min","2 h 15 min","3 h"],correct:1,fact:"120 km en 1,5 h equivale a 80 km/h; 200 ÷ 80 = 2,5 horas, es decir, 2 h 30 min."},
  {level:"FINAL BOSS",time:10,q:"Tienes 3 interruptores fuera de una habitación y una bombilla dentro. Solo puedes entrar una vez. ¿Cómo identificas el interruptor correcto?",a:["Enciendo uno y entro inmediatamente","Enciendo los tres y entro","Enciendo el primero un rato, lo apago, enciendo el segundo y entro: luz encendida = segundo; apagada y caliente = primero; apagada y fría = tercero","No se puede resolver"],correct:2,fact:"El calor de la bombilla permite distinguir el primer interruptor del tercero, mientras que la luz encendida identifica el segundo."}
];
// Los retos de la comunidad se cargan desde Supabase; no mostramos votos ficticios.
const community = [];
// No mostramos participantes ficticios en el ranking. La comunidad real se carga desde Supabase.
const players = [];
let votes = JSON.parse(localStorage.getItem("retoarena_votes") || "{}");
let localSubmissions = JSON.parse(localStorage.getItem("retoarena_submissions") || "[]");
let points = Number(localStorage.getItem("retoarena_points") || "0");
let gameState = {index:0, score:0, answered:false};
let quizTimerInterval = null;
let quizTimeoutHandle = null;

let deferredInstallPrompt = null;

const $ = (sel) => document.querySelector(sel);
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600)}



function renderChallenges(filter = "todos") {
  // Solo mostramos retos reales aprobados. Los minijuegos quedan fuera de esta etapa.
  const todosLosRetos = challenges.filter(c => c.type !== "juego");

  const list = todosLosRetos.filter(c => filter === "todos" || c.type === filter);
  if (!list.length) {
    $("#challengeGrid").innerHTML = '<div class="challenge-empty"><span>✦</span><h3>'+(filter==="todos"?"La arena está esperando tu primer reto":"Próximamente en esta categoría")+'</h3><p>Publica un vídeo original, elige esta categoría y ayuda a inaugurarla.</p><button class="primary-btn" type="button" id="emptyPublish">Crear un reto ↗</button></div>';
    $("#statChallenges").textContent = "5";
    return;
  }
  $("#challengeGrid").innerHTML = list.map(c => `
    <article class="challenge-card">
      <div class="challenge-art ${c.art || ""}">
        ${c.videoUrl ? '<video class="challenge-card-video" src="'+escapeHtml(c.videoUrl)+'" muted playsinline preload="metadata"></video>' : '<span class="challenge-art-symbol">'+(c.icon || "🎯")+'</span>'}
        <span class="tag real">${escapeHtml(categoryNames[c.type] || c.tag || "RETO DE LA COMUNIDAD")}</span>
      </div>
      <div class="challenge-body">
        <h3>${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.desc)}</p>
        <div class="card-meta">
          <span>${escapeHtml(c.players || "Disponible")}</span>
          <span>Comunidad</span>
        </div>
        <button class="play-btn" data-challenge="${c.id}">
          ${escapeHtml(c.action || "Ver reto")} <span>›</span>
        </button>
      </div>
    </article>
  `).join("");

  $("#statChallenges").textContent = String(list.length);
}



function renderCommunity() {
  const retosAprobados = (window.retoArenaRetosAprobados || []).map(r => ({
    id: "supabase-" + r.id,
    title: r.title,
    desc: r.description || "Reto aprobado por la comunidad.",
    creator: (window.retoArenaProfilesById && window.retoArenaProfilesById[r.creator_id] && (window.retoArenaProfilesById[r.creator_id].display_name || window.retoArenaProfilesById[r.creator_id].username)) || "Comunidad",
    icon: "🎬",
    votes: 0,
    pending: false
  }));

  const pendientes = localSubmissions
    .filter(s => s.status === "pending")
    .map(s => ({
      id: s.id,
      title: s.title,
      desc: s.description || "Reto enviado para revisión.",
      creator: s.creator || "Jugador",
      icon: "🎬",
      votes: 0,
      pending: true
    }));

  const combined = [...retosAprobados];

  if (!combined.length) {
    $("#communityGrid").innerHTML = '<p style="color:var(--muted);font-size:13px">Todavía no hay retos aprobados. ¡Publica el primero y espera la revisión de moderación!</p>';
    return;
  }

  $("#communityGrid").innerHTML = combined.map(c =>
    `<article class="community-card">
      <div class="community-thumb">${c.icon}</div>
      <div class="community-content">
        <h3>${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.desc)}</p>
        <div class="community-foot">
          <span class="creator">@${escapeHtml(c.creator)}</span>
          <button class="vote-btn" data-vote="${escapeHtml(c.id)}" disabled>
            ♡ ${c.votes}
          </button>
        </div>
      </div>
    </article>`
  ).join("");
}
function renderLeaderboard(){
  const list=[...players];
  if(points>0)list.push({name:"Tú (demo)",initials:"TÚ",points,label:"Puntuación local de demostración"});
  list.sort((a,b)=>b.points-a.points);
  if(!list.length){
    $("#leaderboard").innerHTML='<p style="color:var(--muted);font-size:13px;padding:12px 0">Todavía no hay puntuaciones competitivas. Los puntos de los minijuegos son de demostración y no cuentan para el ranking.</p>';
    return;
  }
  $("#leaderboard").innerHTML=list.slice(0,10).map((p,i)=>`<div class="leader-row"><span class="rank ${i===0?"gold":""}">${String(i+1).padStart(2,"0")}</span><div class="player"><span class="player-avatar">${escapeHtml(p.initials || (p.name || "J").slice(0,2).toUpperCase())}</span><span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.label || "Participante")}</small></span></div><span class="points">${Number(p.points||0).toLocaleString("es-ES")} <small>pts</small></span></div>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function startQuiz(){
  const db = window.retoArenaSupabase;
  if (!db) { toast("No se pudo conectar con el sistema de puntos."); return; }
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    toast("Inicia sesión para jugar y ganar puntos reales.");
    $("#accountBtn")?.click();
    return;
  }
  const { data: gameSessionId, error } = await db.rpc("retoarena_start_quiz");
  if (error || !gameSessionId) {
    console.error("RetoArena: no se pudo iniciar la partida:", error?.message);
    toast(error?.message || "No se pudo iniciar la partida. Inténtalo de nuevo.");
    return;
  }
  gameState={index:0,score:0,answered:false,sessionId:gameSessionId,pointsAwarded:0,pointsTotal:null};
  showQuestion();
  $("#gameDialog").showModal();
}
function stopQuizTimer(){
  if(quizTimerInterval)clearInterval(quizTimerInterval);
  if(quizTimeoutHandle)clearTimeout(quizTimeoutHandle);
  quizTimerInterval=null;quizTimeoutHandle=null;
}
function showQuestion(){
  stopQuizTimer();
  if(gameState.index>=questions.length){finishQuiz();return}
  const q=questions[gameState.index];
  $("#gameContent").innerHTML=`<div class="duel-top"><span class="game-kicker">⚔ DUELO RELÁMPAGO · RONDA ${gameState.index+1}/5</span><span class="duel-score">${gameState.score} / 5</span></div><div class="duel-level">${q.level}</div><h2>${gameState.index===4?"FINAL BOSS: demuestra lo que sabes":gameState.index>=2?"La arena se complica":"Entra en combate"}</h2><div class="duel-timer"><div id="duelTimerBar"></div></div><div class="duel-timer-label"><span>TIEMPO RESTANTE</span><strong id="duelTimerText">${q.time} s</strong></div><div class="game-question">${q.q}</div><div class="answer-list">${q.a.map((a,i)=>`<button class="answer-btn" data-answer="${i}"><span class="answer-letter">${String.fromCharCode(65+i)}</span>${a}</button>`).join("")}</div><div id="answerFeedback"></div><p class="form-hint">Una respuesta por ronda. Si se agota el tiempo, no suma acierto. Máximo 3 duelos competitivos al día.</p>`;
  let remaining=q.time;
  const updateTimer=()=>{
    const text=$("#duelTimerText"),bar=$("#duelTimerBar");
    if(text)text.textContent=remaining+" s";
    if(bar)bar.style.width=(remaining/q.time*100)+"%";
    if(remaining<=5 && text)text.classList.add("urgent");
  };
  updateTimer();
  quizTimerInterval=setInterval(()=>{remaining--;updateTimer();if(remaining<=0){clearInterval(quizTimerInterval);quizTimerInterval=null}},1000);
  quizTimeoutHandle=setTimeout(()=>{if(!gameState.answered)answerQuestion(-1)},q.time*1000);
}
async function answerQuestion(index){
  if(gameState.answered)return;
  gameState.answered=true;
  stopQuizTimer();
  document.querySelectorAll("[data-answer]").forEach(b=>b.disabled=true);
  const db = window.retoArenaSupabase;
  const { data, error } = await db.rpc("retoarena_submit_quiz_answer", {
    p_session_id: gameState.sessionId,
    p_question_index: gameState.index,
    p_answer_index: index
  });
  if(error || !data){
    console.error("RetoArena: error validando respuesta:", error?.message);
    $("#answerFeedback").innerHTML='<div class="game-result">No se pudo validar la respuesta. Cierra esta partida e inténtalo de nuevo.</div>';
    return;
  }
  const q=questions[gameState.index];
  const correct=Boolean(data.correct);
  if(correct)gameState.score+=1;
  if(data.completed){
    gameState.pointsAwarded=Number(data.points_awarded||0);
    gameState.pointsTotal=Number(data.points_total||0);
  }
  document.querySelectorAll("[data-answer]").forEach((b,i)=>{
    if(i===q.correct)b.classList.add("correct");
    else if(i===index)b.classList.add("wrong");
  });
  $("#answerFeedback").innerHTML=`<div class="game-result">${data.timed_out?"⏱ Se acabó el tiempo.":correct?"✅ ¡Correcto!":"💡 Respuesta incorrecta."} ${q.fact}<br><button class="primary-btn full" id="nextQuestion">${gameState.index===questions.length-1?"Ver resultado":"Siguiente ronda"} ↗</button></div>`;
}
function finishQuiz(){
  stopQuizTimer();
  const awarded=Number(gameState.pointsAwarded||0);
  const total=gameState.pointsTotal===null?"actualiza tu perfil":Number(gameState.pointsTotal).toLocaleString("es-ES")+" puntos";
  $("#gameContent").innerHTML=`<span class="game-kicker">RESULTADO OFICIAL</span><h2>${gameState.score>=4?"¡Dominaste la arena!":gameState.score>=2?"Buen combate.":"El próximo duelo es tuyo."}</h2><div class="duel-final-score">${gameState.score}<small>/ 5</small></div><div class="game-result">Has acertado <strong>${gameState.score} de 5 rondas</strong>.<br>Recompensa: <strong>+${awarded} puntos</strong>.<br>Tu total en Supabase: <strong>${total}</strong>.<br><br>Los puntos se validan en el servidor. Tienes hasta 3 duelos competitivos al día.</div><button class="primary-btn full" id="playAgain">Jugar otro duelo ↻</button>`;
}



async function openRealChallenge(id) {
  const c = challenges.find(x => x.id === id);
  if (!c) return;

  // Exigir inicio de sesión para los retos reales guardados en Supabase.
  if (String(c.id).startsWith("supabase-")) {
    const db = window.retoArenaSupabase;

    if (!db) {
      alert("No se pudo conectar con el sistema de cuentas.");
      return;
    }

    const { data, error } = await db.auth.getSession();

    if (error || !data.session) {
      alert("Para participar en retos reales, inicia sesión o crea tu cuenta.");
      document.querySelector("#accountBtn")?.click();
      return;
    }
  }

  const esRetoGuardado = String(c.id).startsWith("supabase-");
  const contenido = $("#gameContent");

  contenido.innerHTML = "";

  const titulo = document.createElement("h2");
  titulo.textContent = c.title || "Reto de la comunidad";
  contenido.appendChild(titulo);

  const descripcion = document.createElement("p");
  descripcion.className = "modal-intro";
  descripcion.textContent = c.desc || "";
  contenido.appendChild(descripcion);

  if (esRetoGuardado) {
    const mensaje = document.createElement("div");
    mensaje.className = "game-result";
    mensaje.textContent = "Este reto está aprobado y publicado en RetoArena.";
    contenido.appendChild(mensaje);

    let urlValida = "";

    try {
      const url = new URL(c.videoUrl || "");
      if (url.protocol === "https:" || url.protocol === "http:") {
        urlValida = url.href;
      }
    } catch (error) {
      urlValida = "";
    }

    if (urlValida) {
      const boton = document.createElement("button");
      boton.className = "primary-btn";
      boton.textContent = "Ver vídeo ↗";
      boton.type = "button";
      boton.addEventListener("click", () => {
        window.open(urlValida, "_blank", "noopener,noreferrer");
      });
      contenido.appendChild(boton);
    } else {
      mensaje.textContent =
        "Este reto todavía no tiene un enlace de vídeo válido.";
    }
  } else {
    // Mantener el minijuego original.
    contenido.innerHTML = "";
    const tituloJuego = document.createElement("h2");
    tituloJuego.textContent = c.title || "Reto";
    contenido.appendChild(tituloJuego);

    const descripcionJuego = document.createElement("p");
    descripcionJuego.className = "modal-intro";
    descripcionJuego.textContent = c.desc || "";
    contenido.appendChild(descripcionJuego);

    contenido.insertAdjacentHTML(
      "beforeend",
      '<p>Este es un minijuego de demostración.</p>'
    );
  }

  $("#gameDialog").showModal();
}



function openMemory(){
  const icons=["🍋","🎧","🚀","🐼","🎯","🌈","🍋","🎧","🚀","🐼","🎯","🌈"];
  let shuffled=icons.map((v,i)=>({v,k:i})).sort(()=>Math.random()-.5), opened=[],matched=0,locked=false;
  $("#gameContent").innerHTML=`<span class="game-kicker">ARENA DIGITAL</span><h2>Memoria relámpago</h2><p class="modal-intro">Encuentra las seis parejas. Toca dos tarjetas para descubrirlas.</p><div class="memory-grid">${shuffled.map((x,i)=>`<button class="memory-card" data-mem="${i}" aria-label="Tarjeta oculta">?</button>`).join("")}</div><div id="memoryStatus" class="game-result">Parejas: 0/6</div>`;
  $("#gameDialog").showModal();
  $("#gameContent").onclick=(e)=>{const b=e.target.closest("[data-mem]");if(!b||locked||b.classList.contains("matched")||opened.includes(Number(b.dataset.mem)))return;const i=Number(b.dataset.mem);b.textContent=shuffled[i].v;b.classList.add("revealed");opened.push(i);if(opened.length===2){const [a,z]=opened;if(shuffled[a].v===shuffled[z].v){document.querySelectorAll(`[data-mem="${a}"],[data-mem="${z}"]`).forEach(x=>x.classList.add("matched"));matched++;opened=[];$("#memoryStatus").textContent=`Parejas: ${matched}/6`;if(matched===6){$("#memoryStatus").innerHTML="🎉 ¡Completado! Entrenamiento finalizado; este modo no concede puntos de ranking. <button class='play-btn' id='memoryAgain'>Entrenar otra vez</button>";}}else{locked=true;setTimeout(()=>{[a,z].forEach(n=>{const el=document.querySelector(`[data-mem="${n}"]`);if(el){el.textContent="?";el.classList.remove("revealed")}});opened=[];locked=false},700)}}};
}
$("#challengeGrid").addEventListener("click",e=>{const b=e.target.closest("[data-challenge]");if(!b)return;const id=b.dataset.challenge;if(id==="quiz")startQuiz();else if(id==="memory")openMemory();else if(id==="speed"){let seq=Array.from({length:5},()=>Math.floor(Math.random()*9)+1);$("#gameContent").innerHTML=`<span class="game-kicker">ARENA DIGITAL</span><h2>Reto de velocidad</h2><p class="modal-intro">Memoriza esta secuencia durante 3 segundos y luego introdúcela.</p><div class="game-result" id="sequence">${seq.join(" · ")}</div><form id="speedForm" class="submit-form"><label>Escribe los números en orden<input name="sequence" required inputmode="numeric" pattern="[0-9 ]+" placeholder="Ej. 3 5 1 8 2"></label><button class="primary-btn full">Comprobar ↗</button></form><div id="speedResult"></div>`;$("#gameDialog").showModal();setTimeout(()=>{const s=$("#sequence");if(s)s.textContent="Secuencia oculta";},3000);$("#gameContent").onsubmit=(ev)=>{if(ev.target.id!=="speedForm")return;ev.preventDefault();const val=new FormData(ev.target).get("sequence").replace(/\s/g,"");const ok=val===seq.join("");$("#speedResult").innerHTML=`<div class="game-result">${ok?"⚡ ¡Correcto! Secuencia completada. Este modo es entrenamiento y no suma puntos de ranking.":"La secuencia era "+seq.join("")+". ¡Entrena y vuelve a intentarlo!"}</div>`;};}else openRealChallenge(id)});
$("#gameContent").addEventListener("click",e=>{const a=e.target.closest("[data-answer]");if(a){answerQuestion(Number(a.dataset.answer));return}if(e.target.id==="nextQuestion"){gameState.index++;gameState.answered=false;showQuestion()}if(e.target.id==="playAgain")startQuiz();if(e.target.id==="fromRealSubmit"){$("#gameDialog").close();$("#submitDialog").showModal()}if(e.target.id==="memoryAgain")openMemory()});
// Los votos de retos reales los gestiona community.js y se guardan en Supabase.
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderChallenges(b.dataset.filter)}));
$("#exploreBtn").addEventListener("click",()=>$("#challenges").scrollIntoView({behavior:"smooth"}));
$("#submitNav").addEventListener("click",()=>$("#submitDialog").showModal());
document.addEventListener("click",e=>{if(e.target.closest("#emptyPublish"))$("#submitDialog").showModal()});
// El envío real de vídeo a Supabase lo gestiona community.js; no guardar retos ficticios localmente.


document.addEventListener("retoarena:retos-cargados", (event) => {
  const retos = Array.isArray(event.detail) ? event.detail : [];

  retos.forEach((reto) => {
    const id = `supabase-${reto.id}`;

    // Evitar duplicados si el reto ya fue cargado.
    const existente = challenges.find((item) => item.id === id);

    const esJuego = false;
    const category = ["extremo","comida","deporte","challenge","te-reto"].includes(reto.category) ? reto.category : "challenge";

    const retoActualizado = {
      id,
      type: category,
      title: reto.title || "Reto de la comunidad",
      desc: reto.description || "Descubre este reto de la comunidad.",
      icon: category === "comida" ? "🍔" : category === "deporte" ? "🏆" : category === "extremo" ? "🔥" : category === "te-reto" ? "⚔️" : "🎯",
      art: category === "comida" ? "art-orange" : category === "deporte" ? "art-blue" : category === "extremo" ? "art-red" : category === "te-reto" ? "art-pink" : "art-purple",
      tag: categoryNames[category],
      players: "Reto aprobado",
      action: esJuego ? "Jugar ahora" : "Ver reto",
      videoUrl: reto.video_url || ""
    };

    if (existente) {
      Object.assign(existente, retoActualizado);
    } else {
      challenges.push(retoActualizado);
    }
  });

  // Actualizar ambas secciones de la aplicación.
  const filtroActivo = document.querySelector(".filter.active");
  renderChallenges(filtroActivo ? filtroActivo.dataset.filter : "todos");

  renderCommunity();
});
