```javascript
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
    window.retoArenaRetosAprobados = retos;

    // Retirar las versiones anteriores de los retos de Supabase.
    for (let i = challenges.length - 1; i >= 0; i--) {
      if (String(challenges[i].id).startsWith("supabase-")) {
        challenges.splice(i, 1);
      }
    }

    // Insertar cada reto aprobado una sola vez.
    retos.forEach((r) => {
      challenges.push({
        id: "supabase-" + r.id,
        type: r.category === "real" ? "real" : "juego",
        title: r.title || "Reto de la comunidad",
        desc: r.description || "Reto aprobado por la comunidad.",
        icon: "🎯",
        art: "art-purple",
        tag: "Comunidad",
        players: 0,
        action: "Ver reto",
        videoUrl: r.video_url || ""
      });
    });

    // Actualizar las tarjetas destacadas y las de la comunidad.
    if (typeof renderChallenges === "function") {
      const filtroActivo = document.querySelector(".filter.active");
      renderChallenges(
        filtroActivo ? filtroActivo.dataset.filter : "todos"
      );
    }

    if (typeof renderCommunity === "function") {
      renderCommunity();
    }

    console.log(
      "RetoArena: retos aprobados cargados:",
      retos.length
    );
  }

  window.retoArenaCargarRetosAprobados = cargarRetosAprobados;

  await cargarRetosAprobados();
})();
```
