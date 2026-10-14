(async function () {
  const db = window.retoArenaSupabase;

  if (!db) {
    console.error("RetoArena: Supabase no está conectado.");
    return;
  }

  async function cargarRetosAprobados() {
    const { data, error } = await db
      .from("challenges")
      .select("id, title, description, category, status, video_url, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "RetoArena: error al cargar retos:",
        error.message
      );
      return;
    }

    const retos = data || [];

    // Guardar los retos para que app.js pueda mostrarlos.
    window.retoArenaRetosAprobados = retos;

    // Avisar a app.js de que ya llegaron los retos.
    document.dispatchEvent(
      new CustomEvent("retoarena:retos-cargados", {
        detail: retos
      })
    );

    // Actualizar la sección de la comunidad.
    if (typeof window.renderCommunity === "function") {
      window.renderCommunity();
    }

    console.log(
      "RetoArena: retos aprobados cargados:",
      retos.length
    );
  }

  window.retoArenaCargarRetosAprobados = cargarRetosAprobados;

  await cargarRetosAprobados();
})();

