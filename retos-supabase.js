
(async function () {
  const db = window.retoArenaSupabase;

  if (!db) {
    console.error("RetoArena: Supabase no está conectado.");
    return;
  }

  async function cargarRetosAprobados() {
    const { data, error } = await db
      .from("challenges")
      .select("id, title, description, category, status, creator_id, video_url, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar los retos:", error.message);
      return;
    }

    const retos = data || [];
    window.retoArenaRetosAprobados = retos;

    // Eliminar los retos de Supabase anteriores antes de recargarlos.
    for (let i = challenges.length - 1; i >= 0; i--) {
      if (String(challenges[i].id).startsWith("supabase-")) {
        challenges.splice(i, 1);
      }
    }

    // Añadir cada reto aprobado una sola vez.
    retos.forEach(r => {
      challenges.push({
        id: "supabase-" + r.id,
        type: r.category === "real" ? "real" : "juego",
        title: r.title,
        desc: r.description || "Reto de la comunidad.",
        icon: "🎯",
        art: "art-purple",
        tag: "Comunidad",
        players: 0,
        action: "Ver reto",
        videoUrl: r.video_url || ""
      });
    });

    // Actualizar las dos secciones.
    if (typeof renderChallenges === "function") {
      renderChallenges();
    }

    if (typeof renderCommunity === "function") {
      renderCommunity();
    }

    console.log("RetoArena: retos aprobados cargados:", retos.length);
  }

  window.retoArenaCargarRetosAprobados = cargarRetosAprobados;
  await cargarRetosAprobados();
})();
