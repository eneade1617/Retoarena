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
