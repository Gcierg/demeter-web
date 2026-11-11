# Demeter Nanotechnologies · sitio web

Sitio de una sola página en español, inglés y portugués.

- `index.html`, `styles.css`, `app.js`: la página.
- `i18n.js`: todos los textos en los tres idiomas.
- `journey3d.js`: "El viaje de una espora", la secuencia 3D en voxel art que avanza con el scroll (three.js, en `vendor/`).
- `assets/`: logo, fotos de producto, videos, subtítulos (`.vtt` en ES, EN y PT) y fuentes.
- `FACTS.md`: la fuente de cada afirmación de la página.
- `HIGGSFIELD_PROMPTS.md`: prompts para reemplazar la secuencia 3D por tomas generadas, y `tools/seq.sh` para convertirlas.

Para verlo en tu computadora:

```bash
python3 -m http.server 8091
```

y abre http://localhost:8091.

No necesita compilación ni instalación: son archivos estáticos.
