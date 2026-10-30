# CLAUDE.md

## Proyecto

Entrenador de oído musical: app web 100% del lado del cliente para practicar afinación vocal.
La app toca una nota de referencia, el usuario la canta y la app detecta en tiempo real si está
afinado (±25 cents por defecto). Sin backend; el progreso se guarda en `localStorage`.

La especificación completa está en `docs/SPEC.md`. Léela antes de implementar una fase.
El plan se implementa por fases (ver "Plan de implementación por fases" en el spec);
no avances a la siguiente fase sin confirmación del usuario.

## Stack

React 18 + TypeScript + Vite, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand, Web Audio API,
[pitchy](https://github.com/ianprime0509/pitchy) para detección de pitch, Vitest para pruebas.

## Comandos

- `npm run dev` — servidor de desarrollo (el micrófono requiere `localhost` o HTTPS)
- `npm run build` — typecheck (`tsc -b`) + build estático en `dist/`
- `npm test` — pruebas unitarias (Vitest, una sola corrida)
- `npm run test:watch` — Vitest en modo watch
- `npm run lint` — oxlint

## Estructura

```
src/
├── audio/       # AudioContext singleton, reproducción de referencia, micrófono
├── music/       # notes.ts (MIDI <-> Hz <-> nombre, cents), voiceRanges.ts, noteGenerator.ts
├── pitch/       # wrapper de pitchy (RMS + claridad), mediana móvil
├── exercise/    # holdEvaluator.ts: lógica de acierto sostenido
├── store/       # Zustand + persistencia en localStorage
├── hooks/       # usePitch: expone el pitch suavizado a la UI
├── components/  # TunerNeedle, ExercisePanel, RangeSetup, SettingsPanel, StatsPanel
├── App.tsx
└── main.tsx
tests/           # Vitest: *.test.ts, uno por módulo puro
docs/SPEC.md     # especificación del proyecto
```

## Convenciones

- La lógica de audio y música vive en módulos TS puros fuera de React
  (`src/audio`, `src/music`, `src/pitch`, `src/exercise`). React solo presenta.
- Todo el cálculo musical se hace en números MIDI (La4 = 69 = 440 Hz). Los nombres de nota
  (`La4` / `A4`) son solo presentación; usa `noteName()` y `parseNoteName()` de `src/music/notes.ts`.
- Octavas en notación científica: Do4 = MIDI 60.
- Cada módulo puro lleva pruebas en Vitest en `tests/`. La aleatoriedad y el tiempo se inyectan
  como parámetros para que las pruebas sean deterministas.
- Un solo `AudioContext` compartido, creado tras un gesto del usuario (requisito de iOS/Safari);
  llamar `resume()` si está en `suspended`.
- UI y mensajes en español.
