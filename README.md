# RetoArena MVP v0.1

Prototipo instalable para móvil. Interfaz en español, minijuegos funcionales y almacenamiento local del navegador.

## Incluye
- Inicio, tarjetas de retos y filtros.
- Minijuego de cultura general.
- Minijuego de memoria.
- Reto de velocidad con secuencia.
- Retos de comunidad con votos locales.
- Formulario para enviar un enlace a un reto real (queda guardado localmente como pendiente).
- Ranking de demostración.
- PWA: manifest, icono y service worker.

## Límites importantes de esta demo
- No hay backend, cuentas reales ni sincronización entre dispositivos.
- Los votos y retos se guardan solo en el navegador actual y pueden borrarse.
- Los nombres y puntuaciones de ranking son datos de ejemplo.
- No hay premios activos, pagos, monedero ni dinero real.
- El formulario no envía el contenido a un moderador: solo lo guarda en el dispositivo.
- No subir retos peligrosos, datos personales ni vídeos de terceros sin autorización.

## Probar en tu ordenador
Abre `index.html` en un navegador moderno. La mayoría de funciones se pueden probar localmente. Para que la instalación PWA y el service worker funcionen, publica los archivos en un alojamiento HTTPS.

## Publicar gratis en GitHub Pages
1. Crea una cuenta en GitHub si no tienes una.
2. Crea un repositorio público llamado `retoarena`.
3. Sube todos los archivos de esta carpeta a la raíz del repositorio.
4. En el repositorio, entra en Settings → Pages.
5. En Build and deployment, selecciona Deploy from a branch; elige `main` y `/ (root)`, y guarda.
6. Espera a que GitHub genere la URL HTTPS. Abre esa URL desde el móvil.
7. En Android, usa el menú del navegador para instalar/añadir a pantalla de inicio. En iPhone, abre con Safari → Compartir → Añadir a pantalla de inicio.

## Siguiente fase antes de una beta pública
1. Añadir backend real (por ejemplo, Supabase) y reglas de acceso.
2. Moderación y denuncias reales; no depender de localStorage.
3. Autenticación, protección contra votos duplicados y límites antiabuso.
4. Política de privacidad, condiciones de uso, normas de contenido y revisión legal.
5. Publicar un premio únicamente tras confirmar por escrito patrocinador, presupuesto, fechas, elegibilidad y bases.

## Estructura
- `index.html`: estructura y diálogos.
- `styles.css`: diseño responsive.
- `app.js`: interacciones y datos demo.
- `manifest.webmanifest`: configuración PWA.
- `sw.js`: caché para uso básico sin conexión.
- `icon.svg`: icono de la app.
