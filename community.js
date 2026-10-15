(() => {
  const db = window.retoArenaSupabase;
  if (!db) {
    console.error("RetoArena: Supabase no está disponible para la comunidad.");
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const safeUrl = (value) => {
    try {
      const u = new URL(value);
      return ["http:", "https:"].includes(u.protocol) ? u.href : "";
    } catch (_) { return ""; }
  };
  const notify = (message) => {
    const toast = $("#toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 2800);
    } else {
      window.alert(message);
    }
  };

  // Add a public community directory without replacing existing sections.
  const leaderboard = $(".leaderboard-section");
  if (leaderboard && !$("#publicCommunity")) {
    const section = document.createElement("section");
    section.id = "publicCommunity";
    section.className = "section";
    section.innerHTML = `
      <div class="section-heading">
        <div><span class="eyebrow">PERSONAS REALES · RETOS REALES</span><h2>Comunidad</h2></div>
        <span class="pill" id="communityCount">Cargando perfiles…</span>
      </div>
      <p style="color:var(--muted);font-size:13px;line-height:1.6;margin-top:-12px;margin-bottom:20px">Conoce a los participantes de RetoArena y descubre quién está detrás de cada reto.</p>
      <div id="publicProfiles" class="community-grid"><p style="color:var(--muted)">Cargando comunidad…</p></div>
      <p id="publicCommunityEmpty" style="display:none;color:var(--muted);font-size:13px">Aún no hay perfiles públicos. ¡Sé de los primeros en completar el tuyo!</p>
    `;
    leaderboard.parentNode.insertBefore(section, leaderboard);
  }


  // Public profile modal: show the participant's approved challenges.
  if (!$("#publicProfileDialog")) {
    const profileDialog = document.createElement("dialog");
    profileDialog.id = "publicProfileDialog";
    profileDialog.style.cssText = "max-width:560px;width:calc(100% - 28px);max-height:86vh;overflow:auto;border:1px solid #ff4f9b66;border-radius:18px;background:#151020;color:white;padding:0";
    profileDialog.innerHTML = '<form method="dialog"><button aria-label="Cerrar perfil" style="float:right;background:none;color:white;border:0;font-size:24px;cursor:pointer">×</button></form><div id="publicProfileDetails"></div>';
    document.body.appendChild(profileDialog);
  }

  async function showPublicProfile(profileId) {
    const profile = window.retoArenaProfilesById?.[profileId];
    const profileDialog = $("#publicProfileDialog");
    const details = $("#publicProfileDetails");
    if (!profile || !profileDialog || !details) return;
    const name = profile.display_name || profile.username || "Jugador";
    const image = safeUrl(profile.avatar_url || "");
    const avatar = image
      ? '<img class="public-profile-avatar" src="' + esc(image) + '" alt="">'
      : '<div class="public-profile-avatar" style="display:grid;place-items:center;font-size:25px;font-weight:900;color:white">' + esc(name.slice(0,2).toUpperCase()) + '</div>';
    const bio = profile.bio || "Este competidor todavía no ha añadido una presentación.";
    details.innerHTML = '<div class="public-profile-cover"></div><div class="public-profile-main">' +
      '<div class="public-profile-identity">' + avatar + '<div style="min-width:0;padding-bottom:4px"><h2 class="public-profile-name">' + esc(name) +
      '</h2><p class="public-profile-handle">@' + esc(profile.username || "jugador") + '</p><span style="font-size:12px;color:#c1afff;font-weight:800">◆ COMPETIDOR DE RETOARENA</span></div></div>' +
      '<p class="public-profile-bio">' + esc(bio) + '</p>' +
      '<div class="public-profile-stats"><div class="public-profile-stat"><strong>' + Number(profile.points || 0).toLocaleString("es-ES") +
      '</strong><span>Puntos</span></div><div class="public-profile-stat"><strong id="profilePostCount">—</strong><span>Retos publicados</span></div><div class="public-profile-stat"><strong>RA</strong><span>Miembro</span></div></div>' +
      '<div class="public-profile-posts-title"><strong>Publicaciones y retos</strong><span style="font-size:10px;color:#aaa3c1;letter-spacing:1px">PUBLICACIONES</span></div>' +
      '<div id="profileChallenges" class="public-profile-posts"><p style="color:var(--muted)">Cargando publicaciones…</p></div></div>';
    if (!profileDialog.open) profileDialog.showModal();
    const target = $("#profileChallenges", details);
    const [{ data: challenges, error: challengeError }, { data: mediaPosts, error: mediaError }] = await Promise.all([
      db.from("challenges").select("id, title, description, video_url, created_at").eq("creator_id", profileId).eq("status", "approved").order("created_at", { ascending: false }).limit(20),
      db.from("profile_posts").select("id, media_url, media_type, caption, created_at").eq("user_id", profileId).eq("status", "published").order("created_at", { ascending: false }).limit(60)
    ]);
    if (!profileDialog.open || !target) return;
    if (challengeError || mediaError) {
      target.innerHTML = '<p style="color:var(--muted)">No se pudieron cargar todas las publicaciones de este participante.</p>';
      console.warn("RetoArena: error cargando publicaciones públicas:", challengeError?.message || mediaError?.message);
      return;
    }
    const items = mediaPosts || [], challengeRows = challenges || [];
    const postCount = $("#profilePostCount", details);
    if (postCount) postCount.textContent = String(items.length + challengeRows.length);
    const mediaMarkup = items.map(post => {
      const url = safeUrl(post.media_url || ""), caption = esc(post.caption || "");
      const media = post.media_type === "video"
        ? '<video src="' + esc(url) + '" controls playsinline preload="metadata" style="width:100%;aspect-ratio:4/5;object-fit:cover;background:#09080e"></video>'
        : '<img src="' + esc(url) + '" loading="lazy" alt="" style="width:100%;aspect-ratio:4/5;object-fit:cover;background:#09080e">';
      return '<article class="public-post-card">' + media + '<div class="public-post-copy"><p>' + caption + '</p><span style="font-size:10px;color:#aaa3c1">' + new Date(post.created_at).toLocaleDateString("es-ES", {day:"2-digit",month:"short"}) + '</span></div></article>';
    }).join("");
    const challengeMarkup = challengeRows.map(challenge => {
      const url = safeUrl(challenge.video_url || "");
      return '<article class="public-post-card"><div class="public-post-art">🏆</div><div class="public-post-copy"><strong>' +
        esc(challenge.title) + '</strong><p>' + esc(challenge.description || "Reto publicado en RetoArena") + '</p>' +
        (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">VER RETO ↗</a>' : '') +
        '</div></article>';
    }).join("");
    target.innerHTML = mediaMarkup + challengeMarkup;
    if (!items.length && !challengeRows.length) {
      target.innerHTML = '<div style="grid-column:1/-1;padding:20px 14px;border:1px dashed #ffffff25;border-radius:13px;text-align:center"><div style="font-size:30px;margin-bottom:8px">🎬</div><strong style="display:block">Todavía no hay publicaciones</strong><p style="font-size:12px;color:#aaa3c1;line-height:1.6">Cuando publique fotos, vídeos o retos, aparecerán aquí.</p></div>';
    }
  }

  document.addEventListener("click", event => {
    const card = event.target.closest("#publicProfiles .community-card");
    if (!card) return;
    const profileId = card.getAttribute("data-profile-id");
    if (profileId) showPublicProfile(profileId);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest?.("#publicProfiles .community-card[role='button']");
    if (!card) return;
    event.preventDefault();
    showPublicProfile(card.getAttribute("data-profile-id"));
  });

  async function loadProfiles() {
    const grid = $("#publicProfiles");
    const count = $("#communityCount");
    if (!grid) return;
    const { data, error } = await db
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, points, created_at")
      .order("points", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(60);

    if (error) {
      grid.innerHTML = '<p style="color:var(--muted)">No se pudieron cargar los perfiles. Inténtalo de nuevo más tarde.</p>';
      if (count) count.textContent = "No disponible";
      console.error("RetoArena: error cargando perfiles públicos:", error.message);
      return;
    }

    const profiles = data || [];
    window.retoArenaProfilesById = Object.fromEntries(profiles.map(p => [p.id, p]));
    if (count) count.textContent = profiles.length + (profiles.length === 1 ? " participante" : " participantes");

    // Replace demo ranking with the actual registered community when profiles exist.
    const leaderboardGrid = $("#leaderboard");
    if (leaderboardGrid && profiles.length) {
      const ranked = [...profiles].sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
      leaderboardGrid.innerHTML = ranked.slice(0, 10).map((p, i) => {
        const name = p.display_name || p.username || "Jugador";
        return '<div class="leader-row"><span class="rank ' + (i === 0 ? 'gold' : '') + '">' +
          String(i + 1).padStart(2, "0") + '</span><div class="player"><span class="player-avatar">' +
          esc(name.slice(0, 2).toUpperCase()) + '</span><span><b>' + esc(name) +
          '</b><small>@' + esc(p.username || "jugador") + '</small></span></div><span class="points">' +
          Number(p.points || 0).toLocaleString("es-ES") + ' <small>pts</small></span></div>';
      }).join("");
    }
    $("#publicCommunityEmpty").style.display = profiles.length ? "none" : "block";
    if (!profiles.length) {
      grid.innerHTML = "";
      return;
    }

    grid.innerHTML = profiles.map(profile => {
      const name = profile.display_name || profile.username || "Jugador";
      const image = safeUrl(profile.avatar_url || "");
      const avatar = image
        ? '<span class="player-avatar" style="background-image:url(&quot;' + esc(image) + '&quot;);background-size:cover;background-position:center;color:transparent">' + esc(name.slice(0,2).toUpperCase()) + '</span>'
        : '<span class="player-avatar">' + esc(name.slice(0,2).toUpperCase()) + '</span>';
      return `
        <article class="community-card" data-profile-id="${esc(profile.id)}" tabindex="0" role="button" aria-label="Ver perfil de ${esc(name)}" style="cursor:pointer">
          <div style="display:flex;flex-direction:column;align-items:center;gap:7px;min-width:70px">
            ${avatar}
            <span style="font-size:10px;color:var(--muted)">${Number(profile.points || 0).toLocaleString("es-ES")} pts</span>
          </div>
          <div class="community-content">
            <h3>${esc(name)}</h3>
            <p style="color:#c1afff;margin-bottom:6px">@${esc(profile.username || "jugador")}</p>
            <p>${esc(profile.bio || "Este participante todavía no ha añadido una presentación.")}</p>
            <div class="community-foot"><span class="creator">Participante de RetoArena</span></div>
          </div>
        </article>`;
    }).join("");
    if (typeof window.renderCommunity === "function") window.renderCommunity();
  }

  let voteCounts = {};
  let currentUserId = null;
  let ownVotes = new Set();

  async function loadVotes() {
    const { data: sessionData } = await db.auth.getSession();
    currentUserId = sessionData.session?.user?.id || null;
    const { data, error } = await db.from("votes").select("challenge_id, user_id");
    if (error) {
      console.warn("RetoArena: no se pudieron cargar los votos:", error.message);
      return;
    }
    voteCounts = {};
    ownVotes = new Set();
    (data || []).forEach(vote => {
      voteCounts[vote.challenge_id] = (voteCounts[vote.challenge_id] || 0) + 1;
      if (currentUserId && vote.user_id === currentUserId) ownVotes.add(vote.challenge_id);
    });
    enhanceChallengeCards();
  }

  function enhanceChallengeCards() {
    const grid = $("#communityGrid");
    if (!grid) return;
    grid.querySelectorAll("[data-vote]").forEach(button => {
      const rawId = button.getAttribute("data-vote") || "";
      if (!rawId.startsWith("supabase-")) return;
      const challengeId = rawId.slice("supabase-".length);
      button.disabled = !currentUserId || ownVotes.has(challengeId);
      button.title = !currentUserId
        ? "Inicia sesión para votar"
        : ownVotes.has(challengeId) ? "Ya has votado por este reto" : "Votar por este reto";
      button.innerHTML = (ownVotes.has(challengeId) ? "♥ " : "♡ ") + (voteCounts[challengeId] || 0);
      button.style.opacity = ownVotes.has(challengeId) ? "1" : "";
      button.style.color = ownVotes.has(challengeId) ? "#ff8bc8" : "";
    });
  }


  // Sponsor / local business contact section, backed by Supabase.
  if (!$("#sponsorSection")) {
    const sponsorSection = document.createElement("section");
    sponsorSection.id = "sponsorSection";
    sponsorSection.className = "section";
    sponsorSection.innerHTML = `
      <div class="section-heading">
        <div><span class="eyebrow">CRECEMOS CON NEGOCIOS LOCALES</span><h2>Patrocina RetoArena</h2></div>
        <span class="pill">Colaboraciones</span>
      </div>
      <div class="sponsor-panel" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:22px;padding:22px;border:1px solid var(--line);border-radius:20px;background:var(--panel)">
        <div><h3>Tu negocio puede ser parte del reto</h3><p style="color:var(--muted);line-height:1.7;font-size:14px">Conecta tu marca con una comunidad que participa, crea vídeos y descubre nuevos retos. Buscamos negocios locales para premios patrocinados, retos de marca y colaboraciones transparentes.</p><ul style="color:var(--muted);font-size:13px;line-height:1.9;padding-left:20px"><li>Retos patrocinados con reglas claras</li><li>Visibilidad de marca en campañas piloto</li><li>Colaboraciones sin compromiso inicial</li></ul><p style="font-size:11px;color:var(--muted)">Los patrocinios no se consideran confirmados hasta acordar por escrito las condiciones.</p></div>
        <form id="sponsorLeadForm" style="display:grid;gap:11px;align-content:start">
          <label style="display:grid;gap:6px;font-size:12px">Nombre del negocio<input name="business_name" required minlength="2" maxlength="100" placeholder="Ej. Cafetería Central"></label>
          <label style="display:grid;gap:6px;font-size:12px">Persona de contacto<input name="contact_name" required minlength="2" maxlength="80" placeholder="Tu nombre"></label>
          <label style="display:grid;gap:6px;font-size:12px">Correo electrónico<input name="email" type="email" required maxlength="254" placeholder="contacto@negocio.es"></label>
          <label style="display:grid;gap:6px;font-size:12px">¿Qué colaboración te interesa?<textarea name="message" required minlength="10" maxlength="1000" rows="3" placeholder="Cuéntanos qué tipo de colaboración tienes en mente"></textarea></label>
          <button class="primary-btn full" type="submit">Enviar propuesta ↗</button>
          <p id="sponsorFeedback" role="status" style="font-size:12px;color:var(--muted);margin:0"></p>
        </form>
      </div>`;
    const footer = $("footer");
    if (footer) footer.parentNode.insertBefore(sponsorSection, footer);
    else if (leaderboard?.parentNode) leaderboard.parentNode.insertBefore(sponsorSection, leaderboard.nextSibling);
  }

  const sponsorForm = $("#sponsorLeadForm");
  if (sponsorForm) sponsorForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = sponsorForm.querySelector('button[type="submit"]');
    const feedback = $("#sponsorFeedback");
    const fd = new FormData(sponsorForm);
    const lead = {
      business_name: String(fd.get("business_name") || "").trim(),
      contact_name: String(fd.get("contact_name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      message: String(fd.get("message") || "").trim()
    };
    if (button) button.disabled = true;
    if (feedback) feedback.textContent = "Enviando propuesta…";
    try {
      const { error } = await db.from("sponsor_leads").insert(lead);
      if (error) throw error;
      sponsorForm.reset();
      if (feedback) feedback.textContent = "¡Gracias! Hemos recibido tu interés. Te contactaremos si los datos de contacto son válidos.";
      notify("Propuesta de patrocinio enviada.");
    } catch (error) {
      console.error("RetoArena: error guardando propuesta:", error.message);
      if (feedback) feedback.textContent = "No se pudo enviar ahora. Inténtalo de nuevo más tarde.";
    } finally {
      if (button) button.disabled = false;
    }
  });

  window.retoArenaRefreshCommunity = async () => {
    await loadProfiles();
    await loadVotes();
  };

  // Keep the existing renderer and its demo content, then enable votes for approved database challenges.
  if (typeof window.renderCommunity === "function" && !window.retoArenaOriginalCommunityRenderer) {
    window.retoArenaOriginalCommunityRenderer = window.renderCommunity;
    window.renderCommunity = function () {
      window.retoArenaOriginalCommunityRenderer();
      enhanceChallengeCards();
    };
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-vote]");
    if (!button) return;
    const rawId = button.getAttribute("data-vote") || "";
    if (!rawId.startsWith("supabase-")) return;
    event.preventDefault();
    const challengeId = rawId.slice("supabase-".length);

    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    const user = sessionData?.session?.user;
    if (sessionError || !user) {
      notify("Inicia sesión para votar por los retos de la comunidad.");
      $("#accountBtn")?.click();
      return;
    }
    if (ownVotes.has(challengeId)) {
      notify("Ya has votado por este reto. Cada cuenta puede votar una vez.");
      return;
    }

    button.disabled = true;
    button.textContent = "…";
    const { error } = await db.from("votes").insert({
      challenge_id: challengeId,
      user_id: user.id
    });
    if (error) {
      console.error("RetoArena: no se pudo guardar el voto:", error.message);
      notify(error.code === "23505"
        ? "Ya has votado por este reto."
        : String(error.message || "").includes("No puedes votar por tu propio reto")
          ? "No puedes votar por tu propio reto. ¡Invita a la comunidad a participar!"
          : "No se pudo registrar tu voto. Comprueba que has iniciado sesión e inténtalo de nuevo.");
      await loadVotes();
      return;
    }

    ownVotes.add(challengeId);
    voteCounts[challengeId] = (voteCounts[challengeId] || 0) + 1;
    enhanceChallengeCards();
    notify("¡Voto registrado! Gracias por participar.");
  });

  // Turn challenge submission into a real authenticated submission stored for moderation.
  const submitForm = $("#submitForm");
  if (submitForm) {
    submitForm.addEventListener("submit", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const feedback = $("#submitFeedback");
      const submitButton = submitForm.querySelector('[type="submit"]');
      const fd = new FormData(submitForm);
      const title = String(fd.get("title") || "").trim();
      const url = safeUrl(String(fd.get("url") || "").trim());
      const description = String(fd.get("description") || "").trim();
      if (!url) {
        if (feedback) {
          feedback.classList.remove("hidden");
          feedback.textContent = "Introduce un enlace de vídeo válido que empiece por http:// o https://.";
        }
        return;
      }

      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      const user = sessionData?.session?.user;
      if (sessionError || !user) {
        if (feedback) {
          feedback.classList.remove("hidden");
          feedback.textContent = "Para publicar un reto, primero inicia sesión o crea una cuenta. Tu reto no se ha enviado todavía.";
        }
        notify("Inicia sesión antes de publicar un reto.");
        $("#accountBtn")?.click();
        return;
      }

      if (submitButton) submitButton.disabled = true;
      if (feedback) {
        feedback.classList.remove("hidden");
        feedback.textContent = "Enviando tu reto para revisión…";
      }

      try {
        const { data: profile } = await db.from("profiles")
          .select("username, display_name")
          .eq("id", user.id)
          .maybeSingle();

        const { error } = await db.from("challenges").insert({
          title,
          description: description || null,
          category: "real",
          status: "pending",
          creator_id: user.id,
          video_url: url
        });
        if (error) throw error;

        if (feedback) feedback.textContent = "¡Reto enviado correctamente! Queda pendiente de revisión y solo aparecerá públicamente si lo aprueba moderación.";
        submitForm.reset();
        notify("Reto enviado para revisión.");
        if (typeof window.retoArenaCargarRetosAprobados === "function") {
          await window.retoArenaCargarRetosAprobados();
        }
      } catch (error) {
        console.error("RetoArena: error enviando reto:", error.message);
        if (feedback) feedback.textContent = "No se pudo enviar el reto: " + (error.message || "error desconocido") + ". Comprueba tu sesión e inténtalo de nuevo.";
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    }, true);
  }

  document.addEventListener("click", async event => {
    if (!event.target.closest("#submitNav")) return;
    const creatorInput = $('#submitForm [name="creator"]');
    if (!creatorInput) return;
    const { data } = await db.auth.getSession();
    if (!data.session?.user) return;
    const { data: profile } = await db.from("profiles")
      .select("username, display_name")
      .eq("id", data.session.user.id)
      .maybeSingle();
    creatorInput.value = profile?.display_name || profile?.username || data.session.user.email?.split("@")[0] || "";
  });

  async function loadModerationPanel() {
    const userResult = await db.auth.getUser();
    const user = userResult.data?.user;
    let panel = $("#moderationPanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "moderationPanel";
      panel.className = "section";
      panel.style.display = "none";
      panel.innerHTML = '<div class="section-heading"><div><span class="eyebrow">HERRAMIENTAS INTERNAS</span><h2>Moderación de retos</h2></div><span class="pill" id="pendingCount">0 pendientes</span></div><p style="color:var(--muted);font-size:13px">Revisa cada envío antes de hacerlo público.</p><div id="pendingChallenges" style="display:grid;gap:12px"></div>';
      const community = $("#publicCommunity");
      if (community) community.parentNode.insertBefore(panel, community.nextSibling);
    }
    if (!user) {
      panel.style.display = "none";
      return;
    }

    const { data: admin, error: adminError } = await db.from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminError || !admin) {
      panel.style.display = "none";
      return;
    }

    panel.style.display = "block";
    const { data: pending, error } = await db.from("challenges")
      .select("id, title, description, video_url, created_at, creator_id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);
    const grid = $("#pendingChallenges");
    if (error) {
      grid.textContent = "No se pudieron cargar los retos pendientes.";
      return;
    }
    const rows = pending || [];
    $("#pendingCount").textContent = rows.length + (rows.length === 1 ? " pendiente" : " pendientes");
    if (!rows.length) {
      grid.innerHTML = '<p style="color:var(--muted)">No hay retos pendientes de revisión.</p>';
      return;
    }
    grid.innerHTML = rows.map(challenge => {
      const video = safeUrl(challenge.video_url || "");
      const creator = window.retoArenaProfilesById?.[challenge.creator_id];
      return '<article class="community-card" style="display:block"><div style="display:flex;justify-content:space-between;gap:12px;align-items:start"><div><h3>' +
        esc(challenge.title) + '</h3><p>' + esc(challenge.description || "Sin descripción") + '</p><small style="color:var(--muted)">Por @' +
        esc(creator?.username || "participante") + '</small></div><span class="pill">Pendiente</span></div>' +
        (video ? '<p><a href="' + esc(video) + '" target="_blank" rel="noopener noreferrer" style="color:#c1afff;text-decoration:underline">Abrir vídeo para revisar ↗</a></p>' : '') +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="play-btn" data-moderate="approved" data-id="' + esc(challenge.id) + '">Aprobar</button><button class="play-btn" data-moderate="rejected" data-id="' + esc(challenge.id) + '" style="border-color:#7a3d5b">Rechazar</button></div></article>';
    }).join("");
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-moderate]");
    if (!button) return;
    const status = button.getAttribute("data-moderate");
    const id = button.getAttribute("data-id");
    if (!["approved", "rejected"].includes(status) || !id) return;
    button.disabled = true;
    const { error } = await db.from("challenges")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending");
    if (error) {
      notify("No se pudo actualizar el reto. Comprueba que tu cuenta tiene permisos de moderación.");
      button.disabled = false;
      return;
    }
    notify(status === "approved" ? "Reto aprobado y publicado." : "Reto rechazado.");
    await loadModerationPanel();
    if (typeof window.retoArenaCargarRetosAprobados === "function") {
      await window.retoArenaCargarRetosAprobados();
    }
  });

  db.auth.onAuthStateChange(() => {
    // Defer queries until Supabase has released its auth-state lock.
    window.setTimeout(() => {
      loadProfiles();
      loadVotes();
      loadModerationPanel();
    }, 0);
  });

  loadProfiles();
  loadVotes();
  loadModerationPanel();
})();
