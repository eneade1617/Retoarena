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
  dialog.style.cssText =
    "max-width:460px;width:calc(100% - 32px);border:1px solid #554078;border-radius:20px;background:#151326;color:white;padding:24px";
  dialog.innerHTML = `
    <form method="dialog">
      <button aria-label="Cerrar" style="float:right;background:none;color:white;border:0;font-size:24px;cursor:pointer">×</button>
    </form>
    <h2 style="margin:8px 0 6px">Mi perfil</h2>
    <p style="color:#aaa4c2;font-size:13px;line-height:1.5">Personaliza cómo te ve la comunidad de RetoArena.</p>
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
  `;
  document.body.appendChild(dialog);

  const form = dialog.querySelector("#profileForm");
  const feedback = dialog.querySelector("#profileFeedback");
  const preview = dialog.querySelector("#profilePreview");
  let activeUser = null;

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
    if (!activeUser) {
      alert("Primero entra o crea tu cuenta con el botón Entrar.");
      return;
    }
    feedback.textContent = "";
    dialog.showModal();
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
