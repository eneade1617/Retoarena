
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
        "RetoArena: error al cargar los retos:",
        error.message
      );
      return;
    }

    // Guardar los retos aprobados que llegan desde Supabase.
    window.retoArenaRetosAprobados = data || [];

    // Quitar de la lista únicamente los retos de Supabase
    // que se hayan añadido en una carga anterior.
    for (let i = challenges.length - 1; i >= 0; i--) {
      if (String(challenges[i].id).startsWith("supabase-")) {
        challenges.splice(i, 1);
      }
    }

    // Añadir cada reto aprobado una sola vez.
    window.retoArenaRetosAprobados.forEach(r => {
      challenges.push({
        id: "supabase-" + r.id,
        type: r.category === "real" ? "real" : "juego",
        title: r.title,
        desc: r.description || "Reto de la comunidad.",
        icon: "🎬",
        art: "art-purple",
        tag: "RETO REAL",
        players: 0,
        action: "Ver reto",
        videoUrl: r.video_url || ""
      });
    });

    // Actualizar las dos secciones de la aplicación.
    if (typeof renderChallenges === "function") {
      renderChallenges();
    }

    if (typeof renderCommunity === "function") {
      renderCommunity();
    }

    console.log(
      "RetoArena: retos aprobados cargados:",
      window.retoArenaRetosAprobados.length
    );
  }

  window.retoArenaCargarRetosAprobados = cargarRetosAprobados;

  await cargarRetosAprobados();
})();
