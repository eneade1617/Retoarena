
(() => {
  const db = window.retoArenaSupabase;

  if (!db) {
    console.error("RetoArena: no se encuentra la conexión con Supabase.");
    return;
  }

  const header = document.querySelector(".topbar");
  const avatar = document.querySelector(".avatar");

  const accessButton = document.createElement("button");
  accessButton.type = "button";
  accessButton.textContent = "Entrar";
  accessButton.style.cssText =
    "border:1px solid #8b5cf6;border-radius:12px;padding:10px 14px;background:#201735;color:white;cursor:pointer";

  if (header && avatar) header.insertBefore(accessButton, avatar);

  const dialog = document.createElement("dialog");
  dialog.style.cssText =
    "max-width:420px;width:calc(100% - 36px);border:1px solid #554078;border-radius:20px;background:#151326;color:white;padding:24px";

  dialog.innerHTML = `
    <form method="dialog">
      <button style="float:right;background:none;color:white;border:0;font-size:24px">×</button>
    </form>
    <h2 id="authTitle">Entrar en RetoArena</h2>
    <p id="authMessage">Accede para publicar tus retos.</p>
    <form id="authForm">
      <label style="display:block;margin:12px 0">
        Nombre público
        <input name="username" maxlength="30" placeholder="Tu nombre"
          style="display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:6px">
      </label>
      <label style="display:block;margin:12px 0">
        Correo electrónico
        <input name="email" type="email" required autocomplete="email"
          style="display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:6px">
      </label>
      <label style="display:block;margin:12px 0">
        Contraseña
        <input name="password" type="password" required minlength="6"
          autocomplete="current-password"
          style="display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:6px">
      </label>
      <button id="loginButton" type="submit"
        style="width:100%;padding:12px;border:0;border-radius:10px;background:#9657ee;color:white;font-weight:bold">
        Entrar
      </button>
      <button id="registerButton" type="button"
        style="width:100%;padding:12px;margin-top:10px;border:1px solid #8b5cf6;border-radius:10px;background:transparent;color:white">
        Crear cuenta
      </button>
      <p id="authFeedback" role="status" style="overflow-wrap:anywhere"></p>
    </form>
  `;

  document.body.appendChild(dialog);

  const form = dialog.querySelector("#authForm");
  const username = form.elements.username;
  const email = form.elements.email;
  const password = form.elements.password;
  const feedback = dialog.querySelector("#authFeedback");
  const loginButton = dialog.querySelector("#loginButton");
  const registerButton = dialog.querySelector("#registerButton");

  let mode = "login";
  let busy = false;

  function showFeedback(message) {
    feedback.textContent = message;
  }

  function setMode(nextMode) {
    mode = nextMode;
    const registering = mode === "register";
    dialog.querySelector("#authTitle").textContent =
      registering ? "Crear cuenta" : "Entrar en RetoArena";
    loginButton.textContent = registering ? "Registrarme" : "Entrar";
    registerButton.textContent =
      registering ? "Ya tengo cuenta" : "Crear cuenta";
    username.required = registering;
    username.style.display = registering ? "block" : "none";
    username.parentElement.style.display = registering ? "block" : "none";
    showFeedback("");
  }

  async function ensureProfile(user) {
    const name = String(
      user.user_metadata?.username || user.email?.split("@")[0] || "Jugador"
    ).slice(0, 30);

    const { data: existing, error: readError } = await db
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.warn("No se pudo comprobar el perfil:", readError.message);
      return;
    }

    // Crear el perfil solo si no existe para conservar el nombre personalizado.
    if (!existing) {
      const { error } = await db.from("profiles").insert({
        id: user.id,
        username: name
      });
      if (error) console.warn("Perfil pendiente de crear:", error.message);
    }
  }

  async function refreshSession() {
    const { data } = await db.auth.getSession();
    const user = data.session?.user;

    accessButton.textContent = user
      ? "Mi cuenta · " + (user.email || "").split("@")[0].slice(0, 12)
      : "Entrar";

    if (user) await ensureProfile(user);
  }

  accessButton.addEventListener("click", async () => {
    const { data } = await db.auth.getSession();

    if (data.session) {
      if (confirm("¿Quieres cerrar sesión?")) {
        const { error } = await db.auth.signOut();
        if (error) alert(error.message);
        else {
          await refreshSession();
          alert("Has cerrado sesión.");
        }
      }
      return;
    }

    setMode("login");
    dialog.showModal();
  });

  registerButton.addEventListener("click", () => {
    setMode(mode === "login" ? "register" : "login");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;

    busy = true;
    loginButton.disabled = true;
    showFeedback("Procesando...");

    try {
      let result;

      if (mode === "register") {
        result = await db.auth.signUp({
          email: email.value.trim(),
          password: password.value,
          options: {
            emailRedirectTo: location.origin + location.pathname,
            data: { username: username.value.trim() }
          }
        });

        if (result.error) throw result.error;

        if (!result.data.session) {
          showFeedback(
            "Cuenta solicitada. Revisa tu correo y confirma el registro antes de entrar."
          );
          return;
        }
      } else {
        result = await db.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        });

        if (result.error) throw result.error;
      }

      if (result.data.user) await ensureProfile(result.data.user);
      await refreshSession();
      showFeedback("¡Acceso correcto!");
      setTimeout(() => dialog.close(), 900);
    } catch (error) {
      showFeedback(error.message || "No se pudo completar el acceso.");
    } finally {
      busy = false;
      loginButton.disabled = false;
    }
  });

  // Guardar retos en Supabase, no solo en el navegador.
  const submitForm = document.querySelector("#submitForm");

  if (submitForm) {
    submitForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const { data } = await db.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        alert("Para publicar un reto, primero entra o crea una cuenta.");
        setMode("login");
        if (!dialog.open) dialog.showModal();
        return;
      }

      const fd = new FormData(submitForm);
      const title = String(fd.get("title") || "").trim();
      const creator = String(fd.get("creator") || "").trim();
      const videoUrl = String(fd.get("url") || "").trim();
      const description = String(fd.get("description") || "").trim();

      if (!/^https?:\/\//i.test(videoUrl)) {
        alert("Introduce un enlace de vídeo válido.");
        return;
      }

      const button = submitForm.querySelector('[type="submit"]');
      button.disabled = true;

      try {
        const { error } = await db.from("challenges").insert({
          title,
          description,
          category: "real",
          status: "pending",
          creator_id: user.id,
          video_url: videoUrl
        });

        if (error) throw error;

        submitForm.reset();
        const feedback = document.querySelector("#submitFeedback");
        feedback.classList.remove("hidden");
        feedback.textContent =
          "Reto enviado correctamente. Queda pendiente de revisión.";

        const creatorField = submitForm.elements.creator;
        if (creatorField) creatorField.value = creator;

        const submitDialog = document.querySelector("#submitDialog");
        if (submitDialog?.open) submitDialog.close();

        alert("¡Reto guardado en Supabase!");
      } catch (error) {
        alert("No se pudo guardar el reto: " + error.message);
      } finally {
        button.disabled = false;
      }
    }, true);
  }

  db.auth.onAuthStateChange(() => {
    refreshSession();
  });

  setMode("login");
  refreshSession();
})();
