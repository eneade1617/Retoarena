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
      <label style="display:grid;gap:6px;font-size:12px">URL de imagen de perfil (opcional)
        <input name="avatar_url" type="url" placeholder="https://..." style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #39364f;background:#0f0f1f;color:white">
      </label>
      <p style="margin:0;color:#aaa4c2;font-size:11px;line-height:1.5">Por ahora la imagen se añade mediante un enlace público; la subida directa de fotos la añadiremos más adelante para mantener el prototipo gratuito.</p>
      <button type="submit" style="padding:12px;border:0;border-radius:10px;background:#9657ee;color:white;font-weight:bold;cursor:pointer">Guardar perfil</button>
      <p id="profileFeedback" role="status" style="margin:0;overflow-wrap:anywhere;font-size:12px"></p>
    </form>
  `;
  document.body.appendChild(dialog);

  const form = dialog.querySelector("#profileForm");
  const feedback = dialog.querySelector("#profileFeedback");
  let activeUser = null;

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
    const avatarUrl = rawAvatar ? safeImageUrl(rawAvatar) : null;

    if (rawAvatar && !avatarUrl) {
      feedback.textContent = "La URL de imagen debe comenzar por http:// o https://.";
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    feedback.textContent = "Guardando perfil…";
    try {
      const { error } = await db.from("profiles").upsert({
        id: activeUser.id,
        username,
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl
      }, { onConflict: "id" });
      if (error) throw error;
      feedback.textContent = "Perfil guardado correctamente.";
      await loadProfile();
      setTimeout(() => { if (dialog.open) dialog.close(); }, 700);
    } catch (error) {
      feedback.textContent = error.message || "No se pudo guardar el perfil.";
    } finally {
      submit.disabled = false;
    }
  });

  db.auth.onAuthStateChange(() => {
    loadProfile();
  });
  loadProfile();
})();
