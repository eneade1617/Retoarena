(() => {
  const db = window.retoArenaSupabase;
  if (!db) {
    console.error("RetoArena: Supabase no está disponible para la comunidad.");
    return;
  }

  if (!document.getElementById("retoArenaRankStyles")) {
    const style=document.createElement("style");
    style.id="retoArenaRankStyles";
    style.textContent=".ra-rank-badge{display:inline-flex;align-items:center;justify-content:center;margin-top:5px;padding:4px 8px;border:1px solid #a855f755;border-radius:999px;background:#a855f718;color:#f2b3e6;font-size:10px;font-weight:800;letter-spacing:.7px}";
    document.head.appendChild(style);
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


  // Dedicated discovery feed: recent public photos and videos from RetoArena profiles.
  if (!$("#discoveryFeedDialog")) {
    const feed = document.createElement("dialog");
    feed.id = "discoveryFeedDialog";
    feed.className = "discovery-feed-dialog";
    feed.innerHTML = '<header class="discovery-feed-top"><button type="button" id="discoveryFeedClose" aria-label="Cerrar">‹</button><div><strong>DESCUBRIR</strong><small>VÍDEOS · FOTOS · RETOS</small></div><button type="button" id="openNotifications" class="discovery-notification-button" aria-label="Notificaciones">♧ <span id="notificationUnreadCount"></span></button><span class="discovery-feed-live"><i></i> COMUNIDAD</span></header><div class="discovery-feed-body"><div class="discovery-feed-intro"><span>LA ARENA SE MUEVE</span><h2>Descubre a los próximos protagonistas.</h2><p>Momentos, vídeos y retos compartidos por la comunidad.</p></div><div id="discoveryFeedItems" class="discovery-feed-items"><p class="discovery-feed-state">Cargando publicaciones…</p></div></div>';
    document.body.appendChild(feed);
    feed.addEventListener("close", () => {
      if (window.retoArenaVideoObserver) {
        window.retoArenaVideoObserver.disconnect();
        window.retoArenaVideoObserver = null;
      }
      feed.querySelectorAll("video").forEach(video => video.pause());
    });
  }

  async function openDiscoveryFeed(focusPostId = null) {
    const feed = $("#discoveryFeedDialog"), target = $("#discoveryFeedItems");
    if (!feed || !target) return;
    if (window.retoArenaVideoObserver) { window.retoArenaVideoObserver.disconnect(); window.retoArenaVideoObserver = null; }
    if (!feed.open) feed.showModal();
    target.innerHTML = '<p class="discovery-feed-state">Buscando las últimas publicaciones…</p>';
    const { data: posts, error } = await db.from("profile_posts")
      .select("id, user_id, media_url, media_type, caption, created_at")
      .eq("status", "published").order("created_at", { ascending: false }).limit(40);
    if (!feed.open) return;
    if (error) {
      target.innerHTML = '<div class="discovery-feed-state">No se pudo cargar el feed ahora. Inténtalo de nuevo en unos segundos.</div>';
      console.warn("RetoArena: error cargando feed:", error.message);
      return;
    }

    // Combina publicaciones sociales con retos aprobados que ya tienen vídeo.
    // Si la consulta de retos falla, las publicaciones sociales siguen funcionando.
    const challengeResult = await db.from("challenges")
      .select("id, creator_id, title, description, category, video_url, created_at")
      .eq("status", "approved").not("video_url", "is", null)
      .order("created_at", { ascending: false }).limit(40);
    const socialRows = posts || [];
    const challengeRows = challengeResult.error ? [] : (challengeResult.data || []);
    if (challengeResult.error) console.warn("RetoArena: no se pudieron añadir retos al feed:", challengeResult.error.message);

    const authorIds = [...new Set([
      ...socialRows.map(p => p.user_id),
      ...challengeRows.map(ch => ch.creator_id)
    ].filter(Boolean))];
    let profileMap = {};
    if (authorIds.length) {
      const result = await db.from("profiles").select("id, username, display_name, avatar_url, points").in("id", authorIds);
      if (!result.error) profileMap = Object.fromEntries((result.data || []).map(p => [p.id, p]));
    }
    if (!feed.open) return;

    const items = [
      ...socialRows.map(post => ({...post, feed_kind:"post", feed_user_id:post.user_id, feed_date:post.created_at})),
      ...challengeRows.map(ch => ({...ch, feed_kind:"challenge", feed_user_id:ch.creator_id, media_url:ch.video_url, media_type:"video", caption:ch.description || "", feed_date:ch.created_at}))
    ].sort((a,b) => new Date(b.feed_date || 0) - new Date(a.feed_date || 0));

    if (!items.length) {
      target.innerHTML = '<div class="discovery-feed-empty"><span>✦</span><strong>La arena está esperando tu primera publicación.</strong><p>Los vídeos de la comunidad y los retos aprobados aparecerán aquí para que puedas descubrirlos deslizando.</p></div>';
      return;
    }
    target.innerHTML = items.map(item => {
      const profile = profileMap[item.feed_user_id] || {};
      const name = profile.display_name || profile.username || "Competidor";
      const avatarUrl = safeUrl(profile.avatar_url || "");
      const avatar = avatarUrl ? '<img src="' + esc(avatarUrl) + '" alt="" loading="lazy">' : '<span>' + esc(name.slice(0,2).toUpperCase()) + '</span>';
      const mediaUrl = safeUrl(item.media_url || "");
      const media = item.media_type === "video"
        ? '<video src="' + esc(mediaUrl) + '" controls muted playsinline loop preload="metadata"></video>'
        : '<img src="' + esc(mediaUrl) + '" loading="lazy" alt="Publicación de ' + esc(name) + '">';
      const isChallenge = item.feed_kind === "challenge";
      const title = isChallenge ? '<h3 class="discovery-challenge-title">' + esc(item.title || "Reto de la comunidad") + '</h3>' : "";
      const category = isChallenge && item.category ? '<span class="discovery-challenge-category">' + esc(item.category) + '</span>' : "";
      const cardId = isChallenge ? 'data-discovery-challenge="' + esc(item.id) + '"' : 'data-discovery-post="' + esc(item.id) + '"';
      const badge = isChallenge ? '⚡ RETO APROBADO' : (item.media_type === "video" ? '▶ VÍDEO' : '✦ FOTO');
      const action = isChallenge
        ? '<a class="discovery-open-profile discovery-challenge-link" href="' + esc(mediaUrl) + '" target="_blank" rel="noopener noreferrer">ABRIR VÍDEO DEL RETO ↗</a>'
        : '<button type="button" class="discovery-open-profile" data-open-profile="' + esc(item.feed_user_id) + '">VER PERFIL DEL COMPETIDOR ↗</button>';
      return '<article class="discovery-post ' + (isChallenge ? 'discovery-challenge-post' : '') + '" ' + cardId + ' data-discovery-user="' + esc(item.feed_user_id || "") + '"><div class="discovery-post-author"><div class="discovery-post-avatar">' + avatar + '</div><div class="discovery-post-author-copy"><strong>' + esc(name) + '</strong><span>@' + esc(profile.username || "competidor") + ' · ' + Number(profile.points || 0).toLocaleString("es-ES") + ' pts</span></div><span class="discovery-post-badge">' + badge + '</span></div>' + category + title + '<div class="discovery-post-media">' + media + '</div><div class="discovery-post-caption">' + (item.caption ? '<p>' + esc(item.caption) + '</p>' : '<p class="discovery-no-caption">Un nuevo momento en la arena.</p>') + '<span>' + new Date(item.feed_date || item.created_at).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"}) + '</span></div>' + action + '</article>';
    }).join("");
    // Las reacciones y comentarios existentes se aplican solo a profile_posts.
    await decorateSocialFeed(target, socialRows);

    // Feed vertical: reproduce solo el vídeo que está a la vista.
    const feedScroller = $("#discoveryFeedDialog .discovery-feed-body");
    const feedVideos = [...target.querySelectorAll("video")];
    feedVideos.forEach(video => {
      video.muted = true;
      video.playsInline = true;
      video.pause();
      video.currentTime = 0;
    });
    if (feedScroller && "IntersectionObserver" in window) {
      if (window.retoArenaVideoObserver) window.retoArenaVideoObserver.disconnect();
      window.retoArenaVideoObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            feedVideos.forEach(other => { if (other !== video) other.pause(); });
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { root: feedScroller, threshold: [0, 0.35, 0.65, 0.9] });
      feedVideos.forEach(video => window.retoArenaVideoObserver.observe(video));
    }

    if (focusPostId) {
      const focused = [...target.querySelectorAll("[data-discovery-post], [data-discovery-challenge]")].find(card => card.dataset.discoveryPost === String(focusPostId) || card.dataset.discoveryChallenge === String(focusPostId));
      if (focused) {
        window.setTimeout(() => focused.scrollIntoView({behavior:"smooth",block:"start"}), 120);
        focused.classList.add("discovery-post-focused");
        window.setTimeout(() => focused.classList.remove("discovery-post-focused"), 1800);
      } else notify("No se encontró esa publicación en el feed.");
    }
  }

  window.retoArenaOpenPost = function(postId) {
    openDiscoveryFeed(postId || null);
  };

  async function decorateSocialFeed(target, posts) {
    const { data: sessionData } = await db.auth.getSession();
    const userId = sessionData.session?.user?.id || null;
    const ids = posts.map(p => p.id);
    if (!ids.length) return;
    const [rr, cc, ff] = await Promise.all([
      db.from("post_reactions").select("post_id,user_id,reaction_type").in("post_id", ids),
      db.from("post_comments").select("id,post_id,user_id,body,created_at").in("post_id", ids).order("created_at", {ascending:true}).limit(160),
      userId ? db.from("profile_follows").select("followed_id").eq("follower_id", userId) : Promise.resolve({data:[],error:null})
    ]);
    const reactions = rr.error ? [] : (rr.data || []);
    const comments = cc.error ? [] : (cc.data || []);
    const follows = new Set((ff.data || []).map(f => f.followed_id));
    for (const post of posts) {
      const card = target.querySelector('[data-discovery-post="' + post.id + '"]');
      if (!card) continue;
      const postReactions = reactions.filter(r => r.post_id === post.id);
      const mine = postReactions.find(r => r.user_id === userId);
      const reactionCounts = postReactions.reduce((m,r) => ((m[r.reaction_type] = (m[r.reaction_type] || 0) + 1),m),{});
      const controls = document.createElement("div");
      controls.className = "discovery-social-controls";
      const reactionsBox = document.createElement("div");
      reactionsBox.className = "discovery-post-actions";
      for (const item of [{id:"like",label:"♥ Me gusta"},{id:"epic",label:"🔥 Épico"},{id:"skill",label:"⚡ Qué nivel"},{id:"funny",label:"😂 Me hizo reír"},{id:"legend",label:"🏆 Leyenda"}]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "discovery-reaction-button" + (mine?.reaction_type === item.id ? " is-selected" : "");
        button.dataset.socialReaction = item.id;
        button.dataset.socialPost = post.id;
        button.textContent = item.label + " " + (reactionCounts[item.id] || 0);
        reactionsBox.appendChild(button);
      }
      controls.appendChild(reactionsBox);
      const commentList = document.createElement("div");
      commentList.className = "discovery-comments-preview";
      for (const cm of comments.filter(c => c.post_id === post.id).slice(-3)) {
        const profile = window.retoArenaProfilesById?.[cm.user_id] || {};
        const line = document.createElement("div"); line.className = "discovery-comment";
        const who = document.createElement("strong"); who.textContent = profile.display_name || profile.username || "Competidor";
        const body = document.createElement("span"); body.textContent = cm.body;
        line.append(who, body); commentList.appendChild(line);
      }
      controls.appendChild(commentList);
      if (userId) {
        const form = document.createElement("form"); form.className = "discovery-comment-form"; form.dataset.socialComment = post.id;
        const input = document.createElement("input"); input.name = "comment"; input.maxLength = 500; input.required = true; input.placeholder = "Escribe un comentario…";
        const send = document.createElement("button"); send.type = "submit"; send.setAttribute("aria-label","Enviar comentario"); send.textContent = "➤";
        form.append(input,send); controls.appendChild(form);
      } else {
        const hint = document.createElement("p"); hint.className = "discovery-login-hint"; hint.textContent = "Entra en tu cuenta para reaccionar y comentar."; controls.appendChild(hint);
      }
      if (userId && userId !== post.user_id) {
        const follow = document.createElement("button"); follow.type = "button";
        follow.className = "discovery-follow-button" + (follows.has(post.user_id) ? " is-following" : "");
        follow.dataset.socialFollow = post.user_id; follow.textContent = follows.has(post.user_id) ? "SIGUIENDO" : "＋ SEGUIR";
        controls.appendChild(follow);
      }
      card.appendChild(controls);
    }
    await refreshNotificationBadge();
  }

  async function toggleSocialReaction(postId, reactionType) {
    const {data} = await db.auth.getSession(), userId = data.session?.user?.id;
    if (!userId) { notify("Entra en tu cuenta para reaccionar."); return; }
    const {data:existing,error} = await db.from("post_reactions").select("id,reaction_type").eq("post_id",postId).eq("user_id",userId).maybeSingle();
    if (error) { notify("No se pudo consultar tu reacción."); return; }
    let result;
    if (existing?.reaction_type === reactionType) result = await db.from("post_reactions").delete().eq("id",existing.id);
    else if (existing) result = await db.from("post_reactions").update({reaction_type:reactionType}).eq("id",existing.id);
    else result = await db.from("post_reactions").insert({post_id:postId,user_id:userId,reaction_type:reactionType});
    if (result.error) { notify("No se pudo guardar la reacción."); return; }
    await openDiscoveryFeed();
  }

  async function toggleSocialFollow(followedId) {
    const {data} = await db.auth.getSession(), userId = data.session?.user?.id;
    if (!userId) { notify("Entra en tu cuenta para seguir competidores."); return; }
    if (userId === followedId) return;
    const {data:existing,error} = await db.from("profile_follows").select("follower_id").eq("follower_id",userId).eq("followed_id",followedId).maybeSingle();
    if (error) { notify("No se pudo consultar el seguimiento."); return; }
    const result = existing
      ? await db.from("profile_follows").delete().eq("follower_id",userId).eq("followed_id",followedId)
      : await db.from("profile_follows").insert({follower_id:userId,followed_id:followedId});
    if (result.error) { notify("No se pudo actualizar el seguimiento."); return; }
    await openDiscoveryFeed();
  }

  async function refreshNotificationBadge() {
    const badge = $("#notificationUnreadCount");
    if (!badge) return;
    const {data} = await db.auth.getSession(), userId = data.session?.user?.id;
    if (!userId) { badge.textContent = ""; return; }
    const {count,error} = await db.from("notifications").select("id",{count:"exact",head:true}).eq("recipient_id",userId).is("read_at",null);
    if (!error) badge.textContent = count ? String(count) : "";
  }

  async function openSocialNotifications() {
    const {data} = await db.auth.getSession(), userId = data.session?.user?.id;
    if (!userId) { notify("Entra en tu cuenta para ver las notificaciones."); return; }
    let dialog = $("#socialNotificationsDialog");
    if (!dialog) {
      dialog = document.createElement("dialog"); dialog.id = "socialNotificationsDialog"; dialog.className = "discovery-feed-dialog";
      dialog.innerHTML = '<header class="discovery-feed-top"><button type="button" id="socialNotificationsClose" aria-label="Cerrar">‹</button><div><strong>NOTIFICACIONES</strong><small>LO QUE PASA EN LA ARENA</small></div></header><div class="discovery-feed-body"><div class="discovery-feed-intro"><span>TU COMUNIDAD</span><h2>La arena te menciona.</h2><p>Reacciones, comentarios y nuevos seguidores.</p></div><div id="socialNotificationsList" class="notification-items"></div></div>';
      document.body.appendChild(dialog);
    }
    dialog.showModal();
    const list = $("#socialNotificationsList");
    list.innerHTML = '<p class="discovery-feed-state">Cargando notificaciones…</p>';
    const {data:rows,error} = await db.from("notifications").select("id,actor_id,kind,message,created_at,read_at").eq("recipient_id",userId).order("created_at",{ascending:false}).limit(60);
    if (error) { list.textContent = "No se pudieron cargar las notificaciones."; return; }
    const unread = (rows||[]).filter(n=>!n.read_at).map(n=>n.id);
    if (unread.length) await db.from("notifications").update({read_at:new Date().toISOString()}).in("id",unread);
    await refreshNotificationBadge();
    if (!(rows||[]).length) { list.innerHTML = '<div class="discovery-feed-empty"><span>✦</span><strong>Todo tranquilo por ahora.</strong><p>Cuando alguien interactúe contigo, lo verás aquí.</p></div>'; return; }
    const actorIds = [...new Set(rows.map(n=>n.actor_id).filter(Boolean))]; let actors={};
    if (actorIds.length) { const pr=await db.from("profiles").select("id,username,display_name").in("id",actorIds); if(!pr.error) actors=Object.fromEntries((pr.data||[]).map(p=>[p.id,p])); }
    list.innerHTML = rows.map(n=>{const a=actors[n.actor_id]||{};return '<article class="notification-row '+(n.read_at?'':'notification-unread')+'"><span class="notification-symbol">'+({follow:'＋',reaction:'♥',comment:'☷'}[n.kind]||'✦')+'</span><div><strong>'+esc(a.display_name||a.username||'Un competidor')+'</strong><p>'+esc(n.message)+'</p><small>'+new Date(n.created_at).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+'</small></div></article>';}).join("");
  }

  document.addEventListener("submit", async event => {
    const form = event.target.closest("[data-social-comment]"); if (!form) return;
    event.preventDefault();
    const {data} = await db.auth.getSession(), userId = data.session?.user?.id;
    if (!userId) { notify("Entra en tu cuenta para comentar."); return; }
    const input=form.elements.comment, body=input.value.trim(); if(!body)return;
    const submit=form.querySelector("button"); submit.disabled=true;
    const {error}=await db.from("post_comments").insert({post_id:form.dataset.socialComment,user_id:userId,body});
    submit.disabled=false;
    if(error){notify("No se pudo publicar el comentario.");return;}
    notify("Comentario publicado."); await openDiscoveryFeed();
  });

  document.addEventListener("click", event => {
    const reaction=event.target.closest("[data-social-reaction]"); if(reaction){toggleSocialReaction(reaction.dataset.socialPost,reaction.dataset.socialReaction);return;}
    const follow=event.target.closest("[data-social-follow]"); if(follow){toggleSocialFollow(follow.dataset.socialFollow);return;}
    if(event.target.closest("#openNotifications")){openSocialNotifications();return;}
    if(event.target.closest("#socialNotificationsClose")){$("#socialNotificationsDialog")?.close();return;}
  });

  document.addEventListener("click", event => {
    if (event.target.closest("#discoverNav")) {
      openDiscoveryFeed();
      return;
    }
    if (event.target.closest("#discoveryFeedClose")) {
      $("#discoveryFeedDialog")?.close();
      return;
    }
    const profileButton = event.target.closest("[data-open-profile]");
    if (profileButton) {
      const id = profileButton.getAttribute("data-open-profile");
      $("#discoveryFeedDialog")?.close();
      if (id) showPublicProfile(id);
    }
  });

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
            <span style="font-size:10px;color:var(--muted)">${Number(profile.points || 0).toLocaleString("es-ES")} pts</span><span class="ra-rank-badge">${Number(profile.points||0)>=500?"♛ ÉLITE":Number(profile.points||0)>=250?"◆ ORO":Number(profile.points||0)>=100?"◇ PLATA":"● BRONCE"}</span>
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
    const videoInput = submitForm.elements.video_file;
    const preview = $("#challengeVideoPreview");
    let previewUrl = null;
    videoInput?.addEventListener("change", () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const file = videoInput.files?.[0];
      if (!file) { preview.hidden = true; preview.innerHTML = ""; return; }
      if (!["video/mp4","video/quicktime","video/webm"].includes(file.type) || file.size > 45*1024*1024) {
        videoInput.value = ""; preview.hidden = true; preview.innerHTML = "";
        const message = $("#submitFeedback"); if (message) { message.classList.remove("hidden"); message.textContent = "Elige MP4, MOV o WebM de máximo 45 MB."; }
        return;
      }
      previewUrl = URL.createObjectURL(file);
      preview.hidden = false;
      preview.innerHTML = '<video controls playsinline preload="metadata" src="'+previewUrl+'"></video><span>'+esc(file.name)+' · '+(file.size/1024/1024).toFixed(1)+' MB</span>';
    });
    submitForm.addEventListener("submit", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const feedback = $("#submitFeedback");
      const submitButton = submitForm.querySelector('[type="submit"]');
      const fd = new FormData(submitForm);
      const title = String(fd.get("title") || "").trim();
      const category = String(fd.get("category") || "challenge");
      const description = String(fd.get("description") || "").trim();
      const file = videoInput?.files?.[0];
      if (!title || !file) {
        feedback.classList.remove("hidden"); feedback.textContent = "Añade un título y selecciona el vídeo de tu móvil."; return;
      }
      if (!["extremo","comida","deporte","challenge","te-reto"].includes(category)) {
        feedback.classList.remove("hidden"); feedback.textContent = "Selecciona una categoría válida."; return;
      }
      if (!["video/mp4","video/quicktime","video/webm"].includes(file.type) || file.size > 45*1024*1024) {
        feedback.classList.remove("hidden"); feedback.textContent = "El vídeo debe ser MP4, MOV o WebM y no superar 45 MB."; return;
      }
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      const user = sessionData?.session?.user;
      if (sessionError || !user) {
        feedback.classList.remove("hidden"); feedback.textContent = "Inicia sesión o crea una cuenta antes de publicar.";
        notify("Inicia sesión antes de publicar un reto."); $("#accountBtn")?.click(); return;
      }
      submitButton.disabled = true; videoInput.disabled = true;
      feedback.classList.remove("hidden"); feedback.textContent = "Subiendo tu vídeo… no cierres esta ventana.";
      let uploadedPath = null;
      try {
        const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,"") : "mp4";
        uploadedPath = user.id+"/retos/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+ext;
        const { error: uploadError } = await db.storage.from("retoarena-media").upload(uploadedPath,file,{upsert:false,contentType:file.type,cacheControl:"3600"});
        if (uploadError) throw uploadError;
        const { data: publicData } = db.storage.from("retoarena-media").getPublicUrl(uploadedPath);
        if (!publicData?.publicUrl) throw new Error("No se pudo generar la dirección del vídeo subido.");
        feedback.textContent = "Vídeo subido. Guardando reto para revisión…";
        const { error } = await db.from("challenges").insert({
          title, description: description || null, category, status: "pending", creator_id: user.id, video_url: publicData.publicUrl
        });
        if (error) throw error;
        submitForm.reset();
        if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
        preview.hidden = true; preview.innerHTML = "";
        feedback.textContent = "¡Reto enviado! Queda pendiente de moderación y se publicará si es aprobado.";
        notify("Vídeo subido y reto enviado para revisión.");
        if (typeof window.retoArenaCargarRetosAprobados === "function") await window.retoArenaCargarRetosAprobados();
      } catch (error) {
        if (uploadedPath) { try { await db.storage.from("retoarena-media").remove([uploadedPath]); } catch (_) {} }
        console.error("RetoArena: error enviando reto:", error.message);
        feedback.textContent = "No se pudo publicar: "+(error.message||"error desconocido")+". Comprueba tu conexión e inténtalo de nuevo.";
      } finally { submitButton.disabled = false; videoInput.disabled = false; }
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
