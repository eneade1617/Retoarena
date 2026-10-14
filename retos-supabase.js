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
      console.error("Error al cargar los retos:", error.message);
      return;
    }

    window.retoArenaRetosAprobados = data || [];

    // Evitar duplicados y conservar los minijuegos originales.
    for (let i = challenges.length - 1; i >= 0; i--) {
      if (String(challenges[i].id).startsWith("supabase-")) {
        challenges.splice(i, 1);
      }
    }

    window.retoArenaRetosAprobados.forEach(r => {
      challenges.push({
        id: "supabase-" + r.id,
        type: r.category === "juego" ? "juego" : "real",
        title: r.title,
        desc: r.description || "Reto de la comunidad.",
        icon: "🎬",
        art: "art-purple",
        tag: "RETO REAL",
        players: "Comunidad",
        action: "Ver reto",
        videoUrl: r.video_url || ""
      });
    });

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
