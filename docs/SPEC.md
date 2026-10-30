# Entrenador de oído musical — Especificación del proyecto

Oct 29, 2026 · @Kevin

## Resumen

Una app web, 100% del lado del cliente, para entrenar el oído y la afinación vocal. La app toca una nota, el usuario la canta y la app detecta en tiempo real si está afinado, con un margen de ±25 cents.

- **Usuario objetivo:** estudiante de canto (barítono) que practica fuera de clase.
- **Objetivo del MVP:** practicar notas sueltas dentro del rango vocal propio, con feedback visual inmediato tipo afinador.
- **Sin backend:** el progreso se guarda en `localStorage`. Se despliega como sitio estático (GitHub Pages, Netlify o Vercel).
- **Fuera de alcance del MVP:** cuentas de usuario, sincronización, apps móviles nativas, reconocimiento de timbre.

## Stack técnico

React + TypeScript + Vite, con la Web Audio API nativa para generar y analizar audio.

| Pieza | Elección | Motivo |
| --- | --- | --- |
| Framework | React 18 + TypeScript | Mismo stack que otros proyectos estáticos; tipos para la lógica de audio |
| Build | Vite | Arranque rápido, build estático |
| Estilos | Tailwind CSS | UI rápida sin CSS a mano |
| Estado | Zustand | Estado global ligero (config, sesión, estadísticas) |
| Reproducción | Web Audio API (`OscillatorNode` + envolvente ADSR) | Sin dependencias; Tone.js o samples de piano como mejora posterior |
| Micrófono | `getUserMedia` + `AnalyserNode` | Nativo del navegador |
| Detección de pitch | [pitchy](https://github.com/ianprime0509/pitchy) (algoritmo McLeod) | Ligera, buena con voz, devuelve frecuencia y claridad |
| Persistencia | `localStorage` | Sin backend |
| Pruebas | Vitest | Unitarias para utilidades de música |

**Requisitos del navegador:** HTTPS o `localhost` (necesario para el micrófono). Probar en Chrome y Safari. En iOS, el `AudioContext` solo arranca después de un gesto del usuario.

## Funcionalidades del MVP

Cinco pantallas o componentes cubren el MVP. Todo cabe en una sola página con un panel de ajustes.

1. **Configuración de rango vocal**
   - Preset por tipo de voz (bajo, barítono, tenor, contralto, mezzo, soprano).
   - Calibración: el usuario canta su nota más grave y la más aguda cómodas; la app las detecta y las guarda.
   - Ajuste manual del rango con dos selectores de nota.
2. **Ejercicio de nota suelta**
   - Botón "Nueva nota": elige una nota aleatoria dentro del rango (sin repetir la anterior).
   - Botón "Repetir": vuelve a tocar la nota de referencia.
   - El micrófono se activa al terminar la referencia, para que no se capte a sí misma.
   - Acierto: mantener la nota dentro de ±25 cents durante 1 segundo continuo.
3. **Afinador en vivo**
   - Nombre de la nota detectada (ej. `La3`) y frecuencia en Hz.
   - Aguja o barra horizontal de -50 a +50 cents: verde dentro de tolerancia, amarillo cerca, rojo lejos.
   - Flecha "sube" o "baja" según la desviación.
   - Barra de progreso del segundo sostenido.
4. **Ajustes**
   - Tolerancia en cents (15 / 25 / 35).
   - Tiempo sostenido requerido (0.5 / 1 / 1.5 s).
   - Modo de octava: estricto o por nota.
   - Nomenclatura: latina (Do, Re, Mi) o anglosajona (C, D, E).
   - Volumen de la referencia.
5. **Estadísticas de sesión**
   - Aciertos, intentos y racha actual y máxima.
   - Precisión por nota (porcentaje de acierto y desviación promedio en cents), guardada en `localStorage`.

## Rango vocal y octavas

El preset por defecto es barítono (La2–La4). La calibración personal tiene prioridad sobre cualquier preset.

| Voz | Rango del preset | Frecuencias aprox. |
| --- | --- | --- |
| Bajo | Mi2 – Mi4 | 82 – 330 Hz |
| **Barítono** | **La2 – La4** | **110 – 440 Hz** |
| Tenor | Do3 – Do5 | 131 – 523 Hz |
| Contralto | Fa3 – Fa5 | 175 – 698 Hz |
| Mezzosoprano | La3 – La5 | 220 – 880 Hz |
| Soprano | Do4 – Do6 | 262 – 1047 Hz |

**Reglas:**

- La nota de referencia siempre suena en la octava del rango del usuario, nunca transpuesta.
- **Modo estricto:** la nota cantada debe coincidir en nota y octava (comparación por número MIDI).
- **Modo por nota:** basta con la misma clase de nota; los cents se calculan contra la octava más cercana a lo cantado. Es el modo por defecto para principiantes.
- La calibración toma la mediana de \~1.5 s de lectura estable para cada extremo. Después se recorta un semitono por lado para quedarse en la zona cómoda.
- Las frecuencias del preset son de referencia. El maestro de canto puede definir el rango exacto, y se ajusta a mano.

## Detalles técnicos de audio y detección de pitch

Todo el cálculo musical se hace en números MIDI (La4 = 69 = 440 Hz). Los nombres de nota son solo presentación.

**Fórmulas base**

Frecuencia a partir de una nota MIDI:

```latex
f = 440 \cdot 2^{(m - 69)/12}
```

Nota MIDI (continua) a partir de una frecuencia:

```latex
m = 69 + 12 \log_2(f / 440)
```

Desviación en cents respecto a la nota objetivo:

```latex
\text{cents} = 1200 \log_2(f_{\text{cantada}} / f_{\text{objetivo}})
```

**Nota de referencia**

- `OscillatorNode` tipo `triangle` (más cálido que `sine` y más fácil de imitar), con un `GainNode` como envolvente: ataque de 20 ms, sostenido y release de 150 ms. Duración total: 1.2 s.
- Crear el `AudioContext` una sola vez, en el primer clic del usuario. Reutilizarlo en toda la app.

**Captura del micrófono**

- `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`. Esos filtros del navegador distorsionan el pitch.
- `AnalyserNode` con `fftSize = 4096`. A 44.1 kHz son \~93 ms de ventana, suficiente para notas graves de barítono (\~100 Hz). Con 2048 o menos las notas bajas fallan.
- Leer con `getFloatTimeDomainData` en un ciclo de `requestAnimationFrame`.

**Detección y filtrado**

1. **Compuerta de volumen:** calcular el RMS del buffer e ignorar el frame si está por debajo del umbral (silencio o ruido de fondo).
2. **pitchy:** `PitchDetector.forFloat32Array(4096)` y luego `findPitch(buffer, sampleRate)`, que regresa `[frecuencia, claridad]`.
3. **Filtro de claridad:** descartar frames con claridad < 0.9.
4. **Filtro de rango:** descartar frecuencias fuera de 60–1200 Hz.
5. **Suavizado:** mediana de las últimas 5 lecturas válidas. La mediana elimina los saltos de octava aislados y suaviza el vibrato.
6. **Cents:** calcular contra la nota objetivo según el modo de octava.

**Lógica de acierto**

- Un acumulador de tiempo avanza mientras |cents| ≤ tolerancia y se reinicia en cuanto sale.
- Se toleran huecos de hasta 150 ms (frames inválidos) sin reiniciar, para no castigar respiraciones o consonantes.
- Al llegar al tiempo requerido: registrar acierto, sonido de confirmación y detener la escucha.
- Registrar la desviación promedio de cada intento para las estadísticas por nota.

**Problemas conocidos y mitigación**

| Problema | Mitigación |
| --- | --- |
| El mic capta la referencia | Escuchar solo después de que termine la nota; recomendar audífonos |
| Saltos de octava del detector | Mediana + umbral de claridad + filtro de rango |
| Vibrato | Mediana y tolerancia de ±25 cents |
| iOS bloquea el audio | Iniciar `AudioContext` con un gesto; llamar `resume()` si está en `suspended` |
| Latencia en Bluetooth | Avisar en ajustes que los audífonos Bluetooth agregan retraso |

## Estructura del proyecto

La lógica de audio y de música vive fuera de React, en módulos puros que se pueden probar sin navegador.

```
ear-trainer/
├── src/
│   ├── audio/
│   │   ├── audioContext.ts      # singleton del AudioContext + resume()
│   │   ├── referencePlayer.ts   # tocar nota con envolvente
│   │   └── micListener.ts       # getUserMedia + AnalyserNode + ciclo rAF
│   ├── music/
│   │   ├── notes.ts             # MIDI <-> Hz <-> nombre, cents
│   │   ├── voiceRanges.ts       # presets por tipo de voz
│   │   └── noteGenerator.ts     # nota aleatoria en rango, sin repetir
│   ├── pitch/
│   │   ├── detector.ts          # wrapper de pitchy + RMS + claridad
│   │   └── smoothing.ts         # mediana móvil
│   ├── exercise/
│   │   └── holdEvaluator.ts     # lógica de acierto sostenido
│   ├── store/
│   │   └── useAppStore.ts       # Zustand + persistencia en localStorage
│   ├── hooks/
│   │   └── usePitch.ts          # expone pitch suavizado a la UI
│   ├── components/
│   │   ├── TunerNeedle.tsx
│   │   ├── ExercisePanel.tsx
│   │   ├── RangeSetup.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── StatsPanel.tsx
│   ├── App.tsx
│   └── main.tsx
├── tests/                      # Vitest: notes, smoothing, holdEvaluator
├── CLAUDE.md                   # contexto y convenciones para Claude Code
└── package.json
```

## Plan de implementación por fases

Seis fases. Cada una termina en algo que se puede probar y es una buena unidad para pedirle a Claude Code, con commit al cerrarla.

1. **Base y utilidades musicales**
   - Scaffold con Vite + React + TS + Tailwind + Vitest.
   - `notes.ts`, `voiceRanges.ts` y `noteGenerator.ts` con pruebas.
   - Listo cuando: las pruebas de conversión MIDI/Hz/cents pasan.
2. **Reproducción de referencia**
   - `audioContext.ts` y `referencePlayer.ts`; botón de prueba que toca La3.
   - Listo cuando: suena sin clics y funciona en Safari.
3. **Micrófono y afinador libre**
   - `micListener.ts`, `detector.ts`, `smoothing.ts` y `usePitch.ts`.
   - `TunerNeedle` que muestra nota, Hz y cents de lo que canto, sin ejercicio.
   - Listo cuando: la lectura es estable al cantar notas graves (\~110 Hz).
4. **Ejercicio de nota suelta**
   - `holdEvaluator.ts` con pruebas y `ExercisePanel`.
   - Ciclo completo: nueva nota → referencia → escucha → acierto.
5. **Rango vocal y ajustes**
   - `RangeSetup` con presets y calibración; `SettingsPanel`; persistencia en `localStorage`.
6. **Estadísticas y pulido**
   - `StatsPanel` con racha y precisión por nota.
   - Manejo de permisos denegados, estados vacíos, diseño responsive y deploy.

## Criterios de aceptación y pruebas

El MVP está listo cuando se cumplen todos estos puntos.

**Pruebas unitarias (Vitest)**

- [ ] `notes.ts`: 440 Hz → MIDI 69 → `La4`; 110 Hz → `La2`; 445 Hz → \~+19.6 cents sobre La4.
- [ ] `noteGenerator.ts`: nunca sale del rango y nunca repite la nota anterior.
- [ ] `smoothing.ts`: un salto de octava aislado entre lecturas estables no cambia la mediana.
- [ ] `holdEvaluator.ts`: acierta al sostener 1 s; se reinicia al salir de tolerancia; tolera huecos de ≤150 ms.
- [ ] Modo por nota: cantar La3 contra un objetivo La2 da \~0 cents.

**Pruebas manuales**

- [ ] Cantar La2, Re3 y La3: el afinador muestra la nota correcta y sin parpadeo de octava.
- [ ] Un tono de referencia desde otra app (ej. un afinador del celular) coincide en ±5 cents.
- [ ] En silencio no se muestra ninguna nota.
- [ ] Funciona en Chrome desktop y Safari iOS.
- [ ] Si se niega el micrófono, aparece un mensaje claro con instrucciones.
- [ ] Ajustes y estadísticas sobreviven a recargar la página.

## Roadmap post-MVP

Ordenado por valor para la práctica de canto. Cada punto reutiliza el motor de pitch del MVP.

| Prioridad | Funcionalidad | Qué entrena |
| --- | --- | --- |
| 1 | Intervalos: suena una nota base y se canta el intervalo pedido (3a mayor, 5a justa, etc.) | Relación entre notas |
| 2 | Escalas y arpegios guiados, nota por nota | Afinación en secuencia |
| 3 | Gráfica de pitch en el tiempo (línea de lo cantado vs. la nota objetivo) | Estabilidad y vibrato |
| 4 | Sonido de piano con samples (Tone.js) | Referencia más natural |
| 5 | Frases cortas de 3–5 notas | Memoria melódica |
| 6 | Modo "solo oído": identificar la nota o el intervalo sin cantar | Oído relativo |
| 7 | Ejercicios que define el maestro (lista de notas importada en JSON) | Tarea de clase |
| 8 | PWA instalable y uso offline | Practicar desde el celular |

## Prompt inicial para Claude Code

Exporta este documento como Markdown, guárdalo en la raíz del repo como `docs/SPEC.md` y usa este prompt en la primera sesión.

```markdown
Vamos a construir una app web de entrenamiento de oído musical para practicar canto.
La especificación completa está en docs/SPEC.md: léela entera antes de empezar.

Primero:
1. Crea un CLAUDE.md con: resumen del proyecto, stack, estructura de carpetas,
   comandos (dev, build, test) y estas convenciones:
   - Lógica de audio y música en módulos TS puros fuera de React (src/audio, src/music, src/pitch, src/exercise).
   - Todo el cálculo musical en números MIDI; los nombres de nota son solo presentación.
   - Cada módulo puro lleva pruebas en Vitest.
   - Un solo AudioContext compartido, creado tras un gesto del usuario.
2. Implementa solo la Fase 1 del plan (scaffold + utilidades musicales con pruebas).
3. Corre las pruebas, muéstrame el resultado y detente para que yo revise antes de la Fase 2.

No avances a la siguiente fase sin mi confirmación. Si algo de la especificación es ambiguo, pregúntame.
```

Para las siguientes sesiones: "Lee CLAUDE.md y docs/SPEC.md. Implementa la Fase N, corre las pruebas y detente al terminar."
