# Entrenador de oído musical

App web para entrenar el oído y la afinación vocal: toca una nota, la cantas y la app te dice
en tiempo real si estás afinado. Funciona 100% en el navegador, sin backend.

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

## Estado

- [x] Fase 1 — Base y utilidades musicales
- [x] Fase 2 — Reproducción de referencia
- [x] Fase 3 — Micrófono y afinador libre
- [x] Fase 4 — Ejercicio de nota suelta
- [ ] Fase 5 — Rango vocal y ajustes
- [ ] Fase 6 — Estadísticas y pulido
