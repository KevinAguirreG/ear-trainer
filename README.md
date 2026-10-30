# Entrenador de oído musical

App web para entrenar el oído y la afinación vocal: toca una nota, la cantas y la app te dice
en tiempo real si estás afinado. Funciona 100% en el navegador, sin backend.

**App en línea:** https://kevinaguirreg.github.io/ear-trainer/

Especificación completa: [docs/SPEC.md](docs/SPEC.md).

## Desarrollo

```bash
npm install
npm run dev
npm test
```

El micrófono requiere `localhost` o HTTPS. Para probar desde el celular en la misma red Wi-Fi,
usa `npm run dev:https` y abre la dirección de red que muestra Vite (acepta la advertencia
del certificado autofirmado). Se recomienda usar audífonos (no Bluetooth) para
que el micrófono no capte la nota de referencia.

## Despliegue

Cada push a `main` corre lint, pruebas y build en GitHub Actions y publica `dist/` en
GitHub Pages (`.github/workflows/deploy.yml`). Requiere, una sola vez, activar
**Settings › Pages › Source: GitHub Actions** en el repositorio.

El build usa rutas relativas (`base: './'`), así que `dist/` también sirve tal cual en
Netlify, Vercel o cualquier hosting estático con HTTPS.

## Estado

- [x] Fase 1 — Base y utilidades musicales
- [x] Fase 2 — Reproducción de referencia
- [x] Fase 3 — Micrófono y afinador libre
- [x] Fase 4 — Ejercicio de nota suelta
- [x] Fase 5 — Rango vocal y ajustes
- [x] Fase 6 — Estadísticas y pulido
