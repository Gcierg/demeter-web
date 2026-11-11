# Secuencia "El viaje de una espora" · prompts para Higgsfield (Seedance 2.5)

Siete tomas de 5 s, una por etapa de la sección que avanza con el scroll. Se encadenan: el último fotograma de cada toma es la imagen inicial de la siguiente, para que se vea como un solo viaje continuo.

**Ajustes de todas las tomas:** modelo `seedance_2_5` · 5 s · 1080p · 16:9 · sin audio. La toma 1 va en modo `t2v`; de la 2 a la 7, en `omni_reference` con `--start-image` = último fotograma de la toma anterior.

**Estilo común (va al final de cada prompt):**
> Photorealistic scientific macro cinematography, shallow depth of field, soft volumetric light, deep emerald green and teal palette with violet accents, smooth continuous camera move, subject kept in the centre of the frame, no text, no letters, no logos, no labels, no people unless described.

## Prompt original (resumen)
"Una espora o varias rotando, con moléculas de gel transparentes cubriéndolas; la pantalla se llena de gel con moléculas verdes y moradas en una solución estable; entra agua con fuerza; la cámara sale a una vista aérea de un agricultor mezclando el producto; entra de nuevo y se ven las esporas mezclándose con el agua y multiplicándose; sale a presión hacia la plantación de arroz y se ve cómo se multiplican en el campo."

## Qué se mejoró
- Una sola acción y un solo movimiento de cámara por toma: los modelos de video fallan cuando se les piden varias cosas a la vez.
- Cada toma termina donde empieza la siguiente (encadenadas por fotograma).
- Se nombra la luz, la lente y la paleta de marca en todas, para que parezcan la misma película.
- Sujeto siempre al centro, porque en el celular la página recorta los lados.
- "Sin texto ni logos", porque los modelos inventan letras.
- Riego con luz suave de amanecer, sin sol directo, que es como se recomienda aplicar.

## Las tomas

**1 · Una espora, protegida**
> Extreme macro shot of a single round fungal spore with a finely textured green surface, slowly rotating in dark fluid. Tiny transparent glassy gel molecules drift in from all sides and attach to it one by one until they wrap it in a clear protective shell. Slow orbit around the spore.

**2 · Un gel estable**
> The camera pulls back smoothly from the gel-coated spore to reveal hundreds of identical coated spores suspended evenly in a clear, glassy gel that fills the whole frame. Small green and violet molecules float between them, perfectly still and evenly spaced, a calm stable suspension. Slow backward dolly.

**3 · Entra el agua**
> A powerful jet of clear water bursts into the gel from the left side. The gel ripples and begins to dissolve, the coated spores are swept into swirling turbulence with streams of bubbles. The camera is carried backward by the current and rises fast toward the bright water surface.

**4 · El agricultor mezcla**
> The camera breaks out of the water surface and rises into a high aerial top-down drone view: a Latin American farmer wearing a straw hat, long sleeves and gloves stirs a large blue mixing tank of water with a paddle beside a green rice paddy at early morning with soft overcast light. Slow descending drone move toward the centre of the tank.

**5 · Esporas en movimiento**
> The camera dives through the water surface back into the tank. Underwater macro view: thousands of tiny green and violet spores disperse and swirl through clear water in spiralling currents, growing denser and brighter as they spread through the whole frame. Slow forward push through the swirl.

**6 · Hacia el arrozal**
> The swirling spores are pulled into a dark hose and rush forward at high speed, then burst out of a spray nozzle under pressure as a fine glittering mist that fans out over rows of young green rice plants in soft early morning light. Fast forward tracking shot following the mist.

**7 · En el campo, se multiplican**
> The mist settles on rice leaves and wet soil. Macro view: glowing green and violet spores land on a rice leaf and multiply, spreading across the leaf surface. The camera then rises smoothly into a wide aerial view of lush green rice paddies stretching to the horizon, faint glowing particles drifting over the whole field.

## Cómo pasan a la página
Con las siete tomas descargadas, un solo comando las convierte en fotogramas y la página los usa sola:

```bash
sh tools/seq.sh toma1.mp4 toma2.mp4 toma3.mp4 toma4.mp4 toma5.mp4 toma6.mp4 toma7.mp4
```

Mientras no existan, la página muestra la secuencia en 3D voxel art hecha en código (`journey3d.js`), con las mismas siete etapas. Si se generan las tomas, reemplazan a la secuencia 3D automáticamente.
