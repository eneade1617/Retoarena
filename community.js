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
        <article class="community-card">
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

  db.auth.onAuthStateChange(() => {
    loadProfiles();
    loadVotes();
  });

  loadProfiles();
  loadVotes();
})();
