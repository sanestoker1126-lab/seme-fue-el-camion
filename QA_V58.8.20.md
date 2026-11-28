# V58.8.20 RC — Fase de estabilidad y accesibilidad
Base V58.8.19 MUNDOS HD. SHA-256: 9748298cf3271b94e0c807c851641af40236caf25bf3a8e1036dc2d6df51b98f.

- Selector: cinco mundos y 21 tramos accesibles, sin falsificar victorias; la práctica es opcional.
- Apertura escolar: reutiliza el aula secreta existente como fondo provisional, conserva el prólogo anterior. El suelo se alinea con la franja de contacto de la imagen; la composición definitiva de referencia no está reconstruida.
- Cinemáticas: encuadre de contacto recalculado después de aplicar layout y crear actores, con margen horizontal. No se verificó visualmente en navegador: Chromium devolvió ERR_BLOCKED_BY_ADMINISTRATOR al acceder al servidor local.
- Enemigos: se retiran repetidos de la ruta principal (cada segundo en fácil, cada tercero en normal), sin cambiar geometría, jefes, guardianes ni especies. Difícil y modo relajado conservan la población de origen; al reducirla en relajado la ruta automatizada de Guadalajara dejó de finalizar. No se afirma que la nueva distribución sea óptima ni que la campaña normal completa se haya recorrido.
- Población total de cada mundo en normal, semilla 821, antes/después: Escuela 43/33; Guadalajara 293/226; Submarino 27/20; Espacio 37/27; Parafalls 9/9.
- Render: presupuesto de 1 millón de píxeles para pantalla táctil de memoria <=4GB, menor escala adaptativa (0.55), recuperación gradual, y reinicio de acumuladores tras cinemática o suspensión. Conserva resolución original de los assets. FPS sostenidos y memoria Android pendientes.
- Atlas recuperados de Sofía, Luna y Morita: PNG y JSON coinciden exactamente por SHA-256 con los existentes; no se duplican. El paquete de cinemática de transformación no se reintegra: se conserva la implementación previa; pendiente comparación fotograma a fotograma.
- Pruebas Node: 120/120 (incluye geometría, población, selector DOM simulado y apertura escolar). No equivale a pruebas táctiles reales, visuales, PWA en navegador real ni QA en Android físico.
- Pendiente: nuevas secuencias anatómicas de Sofía, rediseño exacto del salón según referencias, revisión visual de cada cinemática, ajustes de plataformas y enemigos con partida manual, medición en Android físico.
