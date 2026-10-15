(() => {
  const db = window.retoArenaSupabase;
  if (!db) {
    console.error("RetoArena: no se puede iniciar el perfil sin Supabase.");
    return;
  }

  const header = document.querySelector(".topbar");
  const avatar = document.querySelector(".avatar");
  if (!header || !avatar) return;

  const profileButton = document.createElement("button");
  profileButton.type = "button";
  profileButton.textContent = "Mi perfil";
  profileButton.style.cssText =
    "border:1px solid #554078;border-radius:12px;padding:10px 14px;background:#171526;color:white;cursor:pointer;margin-right:8px";
  header.insertBefore(profileButton, avatar);

  const dialog = document.createElement("dialog");
  dialog.className = "profile-dialog";
  dialog.style.cssText = "max-width:560px;width:calc(100% - 28px);max-height:88vh;overflow:auto";
  dialog.innerHTML = `
    <div class="profile-editor-cover"></div><div class="profile-editor-inner">
    <form method="dialog">
      <button aria-label="Cerrar" style="float:right;background:none;color:white;border:0;font-size:24px;cursor:pointer">×</button>
    </form>
    <div class="profile-editor-heading"><div class="profile-editor-badge" id="profileEditorAvatar">RA</div><div><h2>Tu perfil de competidor</h2><p>Personaliza tu identidad en RetoArena</p></div></div>
    <form id="profileForm" style="display:grid;gap:13px">
      <label style="display:grid;gap:6px;font-size:12px">Nombre de usuario
        <input name="username" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_.-]+" placeholder="ej. Alex_Reto" style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #39364f;background:#0f0f1f;color:white">
      </label>
      <label style="display:grid;gap:6px;font-size:12px">Nombre público
        <input name="display_name" maxlength="40" placeholder="Cómo quieres que te llamen" style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #39364f;background:#0f0f1f;color:white">
      </label>
      <label style="display:grid;gap:6px;font-size:12px">Presentación
        <textarea name="bio" maxlength="180" rows="3" placeholder="Cuéntale algo a la comunidad (máximo 180 caracteres)" style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #39364f;background:#0f0f1f;color:white;resize:vertical"></textarea>
      </label>
      <label style="display:grid;gap:6px;font-size:12px">Foto de perfil
        <input name="avatar_file" type="file" accept="image/png,image/jpeg,image/webp" style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid #39364f;background:#0f0f1f;color:white">
      </label>
      <p style="margin:0;color:#aaa4c2;font-size:11px;line-height:1.5">Sube una imagen JPG, PNG o WebP de hasta 2 MB. También puedes pegar un enlace público opcional:</p>
      <label style="display:grid;gap:6px;font-size:12px">URL de imagen (opcional)
        <input name="avatar_url" type="url" placeholder="https://..." style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #39364f;background:#0f0f1f;color:white">
      </label>
      <button type="submit" style="padding:12px;border:0;border-radius:10px;background:#9657ee;color:white;font-weight:bold;cursor:pointer">Guardar perfil</button>
      <p id="profileFeedback" role="status" style="margin:0;overflow-wrap:anywhere;font-size:12px"></p>
    </form>
    <section id="profilePreview" style="display:none;margin-top:18px;padding:16px;border:1px solid #39364f;border-radius:14px;background:#0f0f1f">
      <p style="margin:0 0 10px;color:#c5a1ff;font-size:10px;font-weight:bold;letter-spacing:1px">VISTA PREVIA DE TU PERFIL</p>
      <div style="display:flex;align-items:center;gap:12px">
        <div id="profilePreviewAvatar" style="width:48px;height:48px;flex:0 0 48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#7650bb;font-weight:bold;overflow:hidden">RA</div>
        <div style="min-width:0">
          <strong id="profilePreviewName" style="display:block;overflow-wrap:anywhere"></strong>
          <span id="profilePreviewUsername" style="color:#aaa4c2;font-size:12px"></span>
        </div>
      </div>
      <p id="profilePreviewBio" style="font-size:13px;line-height:1.5;color:#ddd8ed;white-space:pre-wrap;overflow-wrap:anywhere"></p>
    </section>
    </div>
  `;
  document.body.appendChild(dialog);

  const ownProfileDialog = document.createElement("dialog");
  ownProfileDialog.id = "ownProfileDialog";
  ownProfileDialog.className = "own-profile-dialog";
  ownProfileDialog.innerHTML = `
    <div class="own-profile-topbar"><button type="button" id="ownProfileClose">‹</button><strong>MI ESPACIO</strong><button type="button" id="ownProfileEdit">Editar perfil</button></div>
    <div class="own-profile-cover"><span>RETOARENA / CREATOR SPACE</span></div>
    <section class="own-profile-content">
      <div class="own-profile-identity"><div class="own-profile-avatar" id="ownProfileAvatar">RA</div><div class="own-profile-idtext"><h1 id="ownProfileName">Tu perfil</h1><p id="ownProfileHandle">@competidor</p><span class="own-profile-tag">◆ COMPETIDOR</span></div></div>
      <p id="ownProfileBio" class="own-profile-bio"></p>
      <div class="own-profile-stats"><div><strong id="ownProfilePoints">0</strong><span>PUNTOS</span></div><div><strong id="ownProfilePostCount">0</strong><span>PUBLICACIONES</span></div><div><strong id="ownProfileChallengeCount">0</strong><span>RETOS APROBADOS</span></div></div>
      <section class="own-profile-publish"><span class="own-profile-overline">TU HISTORIA, EN IMÁGENES</span><h2>Publica un momento</h2><p>Sube varias fotos o vídeos desde tu móvil. Hasta 10 archivos por tanda.</p>
        <form id="profileMediaForm"><label class="profile-media-picker"><span class="profile-media-icon">＋</span><span><strong>Elegir fotos o vídeos</strong><small>JPG, PNG, WebP, MP4, MOV o WebM</small></span><input id="profileMediaFiles" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple></label>
        <div id="profileMediaSelection" class="profile-media-selection">No has seleccionado archivos todavía.</div>
        <label class="profile-caption-label">Descripción (opcional)<textarea id="profileMediaCaption" maxlength="500" rows="2" placeholder="¿Qué está pasando en este momento?"></textarea></label>
        <button id="profileMediaSubmit" class="profile-media-submit" type="submit">Publicar en mi perfil ↗</button><p id="profileMediaFeedback" role="status" class="profile-media-feedback"></p></form>
      </section>
      <div class="own-profile-gallery-head"><div><span class="own-profile-overline">TU CONTENIDO</span><h2>Mis publicaciones</h2></div><span id="ownProfileGalleryCount">0 posts</span></div>
      <div class="own-profile-tabs"><button type="button" class="active" data-profile-filter="all">Todo</button><button type="button" data-profile-filter="image">Fotos</button><button type="button" data-profile-filter="video">Vídeos</button></div>
      <p class="own-profile-gallery-hint">Toca una foto para abrir la publicación y ver sus reacciones y comentarios.</p>
      <div id="ownProfileGallery" class="own-profile-gallery"></div>
    </section>`;
  document.body.appendChild(ownProfileDialog);


  const form = dialog.querySelector("#profileForm");
  const feedback = dialog.querySelector("#profileFeedback");
  const preview = dialog.querySelector("#profilePreview");
  let activeUser = null;
  let ownProfileData = null;
  let ownProfilePosts = [];
  let ownProfileFilter = "all";


  function renderOwnProfile() {
    const profile=ownProfileData||{}, name=profile.display_name||profile.username||activeUser?.email?.split("@")[0]||"Competidor";
    const url=safeImageUrl(profile.avatar_url||""), av=ownProfileDialog.querySelector("#ownProfileAvatar");
    av.textContent=url?"":name.slice(0,2).toUpperCase(); av.style.backgroundImage=url?'url("'+url.replace(/["\\\\]/g,"")+'")':""; av.style.backgroundSize="cover"; av.style.backgroundPosition="center";
    ownProfileDialog.querySelector("#ownProfileName").textContent=name;
    ownProfileDialog.querySelector("#ownProfileHandle").textContent="@"+(profile.username||"competidor");
    ownProfileDialog.querySelector("#ownProfileBio").textContent=profile.bio||"Este es tu espacio. Cuéntale a la comunidad quién eres y qué retos te mueven.";
    ownProfileDialog.querySelector("#ownProfilePoints").textContent=Number(profile.points||0).toLocaleString("es-ES");
    ownProfileDialog.querySelector("#ownProfilePostCount").textContent=String(ownProfilePosts.length);
    ownProfileDialog.querySelector("#ownProfileGalleryCount").textContent=ownProfilePosts.length+(ownProfilePosts.length===1?" publicación":" publicaciones");
  }
  function renderOwnGallery() {
    const gallery=ownProfileDialog.querySelector("#ownProfileGallery"), posts=ownProfilePosts.filter(p=>ownProfileFilter==="all"||p.media_type===ownProfileFilter);
    ownProfileDialog.querySelectorAll("[data-profile-filter]").forEach(b=>b.classList.toggle("active",b.dataset.profileFilter===ownProfileFilter));
    if(!posts.length){gallery.innerHTML='<div class="own-profile-empty"><span>✦</span><strong>'+(ownProfileFilter==="image"?"Aún no hay fotos":ownProfileFilter==="video"?"Aún no hay vídeos":"Tu historia empieza aquí")+'</strong><p>Publica tu primera foto o vídeo y construye tu perfil.</p></div>';return;}
    gallery.innerHTML=posts.map(p=>{const url=safeImageUrl(p.media_url||""),cap=String(p.caption||"");const media=p.media_type==="video"?'<video src="'+url+'" controls playsinline preload="metadata"></video>':'<img src="'+url+'" loading="lazy" alt="">';return '<article class="own-profile-post">'+media+'<div class="own-profile-post-meta"><p>'+cap.replace(/[&<>"]/g,"")+'</p><span>'+new Date(p.created_at).toLocaleDateString("es-ES",{day:"2-digit",month:"short"})+'</span><button type="button" data-delete-profile-post="'+p.id+'">Eliminar</button></div></article>';}).join("");
  }
  async function loadOwnProfilePage() {
    const {data:session}=await db.auth.getSession();activeUser=session.session?.user||null;if(!activeUser)return;
    const [pr,po,ch]=await Promise.all([
      db.from("profiles").select("id,username,display_name,bio,avatar_url,points").eq("id",activeUser.id).maybeSingle(),
      db.from("profile_posts").select("id,media_url,media_type,caption,created_at").eq("user_id",activeUser.id).eq("status","published").order("created_at",{ascending:false}).limit(100),
      db.from("challenges").select("id",{count:"exact",head:true}).eq("creator_id",activeUser.id).eq("status","approved")
    ]);
    if(pr.error)throw pr.error;if(po.error)throw po.error;ownProfileData=pr.data||{};ownProfilePosts=po.data||[];
    ownProfileDialog.querySelector("#ownProfileChallengeCount").textContent=String(ch.count||0);renderOwnProfile();renderOwnGallery();
  }
  ownProfileDialog.querySelector("#ownProfileClose").addEventListener("click",()=>ownProfileDialog.close());
  ownProfileDialog.querySelector("#ownProfileEdit").addEventListener("click",async()=>{await loadProfile();dialog.showModal();});
  ownProfileDialog.querySelectorAll("[data-profile-filter]").forEach(b=>b.addEventListener("click",()=>{ownProfileFilter=b.dataset.profileFilter;renderOwnGallery();}));
  ownProfileDialog.querySelector("#profileMediaFiles").addEventListener("change",e=>{const fs=Array.from(e.target.files||[]);ownProfileDialog.querySelector("#profileMediaSelection").textContent=fs.length?fs.map(f=>f.name).join(" · "):"No has seleccionado archivos todavía.";});
  ownProfileDialog.querySelector("#profileMediaForm").addEventListener("submit",async e=>{
    e.preventDefault();const feedback=ownProfileDialog.querySelector("#profileMediaFeedback"),btn=ownProfileDialog.querySelector("#profileMediaSubmit"),files=Array.from(ownProfileDialog.querySelector("#profileMediaFiles").files||[]),caption=ownProfileDialog.querySelector("#profileMediaCaption").value.trim();
    const allowed=["image/jpeg","image/png","image/webp","video/mp4","video/quicktime","video/webm"];
    if(!files.length){feedback.textContent="Elige al menos una foto o un vídeo.";return;}if(files.length>10){feedback.textContent="Puedes subir un máximo de 10 archivos a la vez.";return;}
    for(const f of files){if(!allowed.includes(f.type)){feedback.textContent="Formato no admitido: "+f.name;return;}if(f.size>(f.type.startsWith("video/")?50:8)*1024*1024){feedback.textContent=f.name+" supera el límite de tamaño.";return;}}
    const {data:session}=await db.auth.getSession();activeUser=session.session?.user||null;if(!activeUser){feedback.textContent="Inicia sesión para publicar.";return;}
    btn.disabled=true;ownProfileDialog.querySelector("#profileMediaFiles").disabled=true;let count=0;
    try{for(const f of files){feedback.textContent="Subiendo "+(count+1)+" de "+files.length+"…";const ext=f.name.includes(".")?f.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,""):f.type.split("/")[1];const path=activeUser.id+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,9)+"."+ext;
      const {error:uploadError}=await db.storage.from("retoarena-media").upload(path,f,{upsert:false,contentType:f.type,cacheControl:"3600"});if(uploadError)throw uploadError;
      const {data:pub}=db.storage.from("retoarena-media").getPublicUrl(path);
      const {error:insertError}=await db.from("profile_posts").insert({user_id:activeUser.id,media_url:pub.publicUrl,media_type:f.type.startsWith("video/")?"video":"image",caption:caption||null,status:"published"});if(insertError)throw insertError;count++;}
      ownProfileDialog.querySelector("#profileMediaFiles").value="";ownProfileDialog.querySelector("#profileMediaCaption").value="";ownProfileDialog.querySelector("#profileMediaSelection").textContent="No has seleccionado archivos todavía.";feedback.textContent="¡Publicado! "+count+(count===1?" archivo añadido.":" archivos añadidos.");await loadOwnProfilePage();
    }catch(err){feedback.textContent="Se han publicado "+count+" de "+files.length+". "+(err.message||"No se pudo completar la subida.");}
    finally{btn.disabled=false;ownProfileDialog.querySelector("#profileMediaFiles").disabled=false;}
  });
  ownProfileDialog.addEventListener("click",async e=>{const b=e.target.closest("[data-delete-profile-post]");if(!b)return;const post=ownProfilePosts.find(p=>p.id===b.dataset.deleteProfilePost);if(!post||!confirm("¿Eliminar esta publicación de tu perfil?"))return;b.disabled=true;try{const {error}=await db.from("profile_posts").delete().eq("id",post.id).eq("user_id",activeUser.id);if(error)throw error;await loadOwnProfilePage();}catch(err){alert("No se pudo eliminar: "+(err.message||"error desconocido"));b.disabled=false;}});

  function renderPreview(profile) {
    preview.style.display = "block";
    const displayName = profile.display_name || profile.username || "Jugador de RetoArena";
    dialog.querySelector("#profilePreviewName").textContent = displayName;
    dialog.querySelector("#profilePreviewUsername").textContent = "@" + (profile.username || "");
    dialog.querySelector("#profilePreviewBio").textContent = profile.bio || "Todavía no has añadido una presentación.";
    const previewAvatar = dialog.querySelector("#profilePreviewAvatar");
    const imageUrl = safeImageUrl(profile.avatar_url || "");
    previewAvatar.style.backgroundImage = imageUrl ? 'url("' + imageUrl.replace(/["\\\\]/g, "") + '")' : "";
    previewAvatar.style.backgroundSize = "cover";
    previewAvatar.style.backgroundPosition = "center";
    previewAvatar.textContent = imageUrl ? "" : displayName.slice(0, 2).toUpperCase();
  }

  function safeImageUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
    } catch (_) {
      return "";
    }
  }

  async function getUser() {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    return data.session?.user || null;
  }

  async function loadProfile() {
    try {
      activeUser = await getUser();
      profileButton.disabled = !activeUser;
      profileButton.style.opacity = activeUser ? "1" : ".65";
      if (!activeUser) {
        profileButton.textContent = "Mi perfil · Entrar";
        avatar.textContent = "RA";
        avatar.style.backgroundImage = "";
        return;
      }

      profileButton.textContent = "Mi perfil";
      const { data, error } = await db.from("profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("id", activeUser.id)
        .maybeSingle();
      if (error) throw error;

      const profile = data || {};
      form.elements.username.value = profile.username || activeUser.user_metadata?.username || activeUser.email?.split("@")[0] || "";
      form.elements.display_name.value = profile.display_name || "";
      form.elements.bio.value = profile.bio || "";
      form.elements.avatar_url.value = profile.avatar_url || "";
      renderPreview(profile);
      const editorAvatar = dialog.querySelector("#profileEditorAvatar");
      const editorName = profile.display_name || profile.username || "RA";
      editorAvatar.textContent = editorName.slice(0, 2).toUpperCase();
      const editorImageUrl = safeImageUrl(profile.avatar_url || "");
      editorAvatar.style.backgroundImage = editorImageUrl ? `url("${editorImageUrl.replace(/["\\]/g, "")}")` : "";
      editorAvatar.style.backgroundSize = "cover";
      editorAvatar.style.backgroundPosition = "center";

      const imageUrl = safeImageUrl(profile.avatar_url || "");
      if (imageUrl) {
        avatar.textContent = "";
        avatar.style.backgroundImage = 'url("' + imageUrl.replace(/["\\\\]/g, "") + '")';
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
      } else {
        avatar.style.backgroundImage = "";
        avatar.textContent = (profile.display_name || profile.username || "RA").slice(0, 2).toUpperCase();
      }
    } catch (error) {
      console.error("RetoArena: no se pudo cargar el perfil:", error.message);
    }
  }

  profileButton.addEventListener("click", async () => {
    await loadProfile();
    if (!activeUser) { alert("Primero entra o crea tu cuenta con el botón Entrar."); return; }
    try { await loadOwnProfilePage(); ownProfileDialog.showModal(); }
    catch (error) { alert("No se pudo abrir tu perfil: " + (error.message || "error desconocido")); }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeUser) {
      feedback.textContent = "Tu sesión ha caducado. Vuelve a entrar.";
      return;
    }

    const username = form.elements.username.value.trim();
    const displayName = form.elements.display_name.value.trim();
    const bio = form.elements.bio.value.trim();
    const rawAvatar = form.elements.avatar_url.value.trim();
    const avatarFile = form.elements.avatar_file.files?.[0] || null;
    let avatarUrl = rawAvatar ? safeImageUrl(rawAvatar) : null;

    if (avatarFile && !["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type)) {
      feedback.textContent = "Usa una imagen JPG, PNG o WebP.";
      return;
    }
    if (avatarFile && avatarFile.size > 2 * 1024 * 1024) {
      feedback.textContent = "La imagen supera los 2 MB. Elige una foto más pequeña.";
      return;
    }
    if (rawAvatar && !avatarUrl) {
      feedback.textContent = "La URL de imagen debe comenzar por http:// o https://.";
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    feedback.textContent = "Guardando perfil…";
    try {
      if (avatarFile) {
        feedback.textContent = "Subiendo foto de perfil…";
        const extension = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const objectPath = activeUser.id + "/" + Date.now() + "." + extension;
        const { error: uploadError } = await db.storage.from("retoarena-avatars").upload(objectPath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
          cacheControl: "3600"
        });
        if (uploadError) throw uploadError;
        const { data: publicData } = db.storage.from("retoarena-avatars").getPublicUrl(objectPath);
        avatarUrl = publicData.publicUrl;
      }

      const { error } = await db.from("profiles").upsert({
        id: activeUser.id,
        username,
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl
      }, { onConflict: "id" });
      if (error) throw error;
      feedback.textContent = "✓ Perfil guardado correctamente. Así lo verá la comunidad:";
      form.elements.avatar_file.value = "";
      await loadProfile();
      if (typeof window.retoArenaRefreshCommunity === "function") await window.retoArenaRefreshCommunity();
    } catch (error) {
      feedback.textContent = error.message || "No se pudo guardar el perfil.";
    } finally {
      submit.disabled = false;
    }
  });

  db.auth.onAuthStateChange(() => {
    window.setTimeout(() => loadProfile(), 0);
  });
  loadProfile();
})();
