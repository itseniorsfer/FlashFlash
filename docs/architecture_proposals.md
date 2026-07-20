# Documento de Arquitectura y Revisiones: FlashFlash ⚡

Este documento consolida la evaluación de arquitectura, pautas de accesibilidad y las propuestas de mejora técnica para la aplicación web **FlashFlash (Flashcards Rápidas de Alto Rendimiento - 10-Foot UI)**.

---

## 📌 1. Estado Actual de la Aplicación

Actualmente, la aplicación es una **Single Page Application (SPA)** autónoma construida en HTML5, JavaScript Vanilla y Tailwind CSS ([flashflash_high_performance_10_foot_ui_flashcards.html](../flashflash_high_performance_10_foot_ui_flashcards.html)).

### Puntos Fuertes Implementados
1. **Modos de Vista Separados (Estado A / Estado B)**:
   - **Estado A**: Panel de control y edición adaptado a interacción cercana (escritorio/móvil).
   - **Estado B**: Modo proyección cinemático con relación de contraste 16:1 (`#121212` / `#FFFFFF`).
2. **Prevención de Errores (Heurística #5 de Nielsen)**:
   - Saneamiento e higienización de entradas sucias (espacios múltiples, comas redundantes, saltos de línea inútiles).
   - Toasts y alertas semánticas cuando no hay conceptos válidos para proyectar.
3. **Pausa por Pérdida de Foco**:
   - Detección con la **Page Visibility API** para pausar la secuencia si se cambia de pestaña o el sistema entra en suspensión.
4. **HUD Interactivo con Ocultamiento Automático**:
   - Controles inferiores táctiles/remotos (`64px`) que se ocultan tras 3 segundos de inactividad de puntero.
5. **Navegación Multimodal**:
   - Control por teclado (`Space` para pausa, `Flechas` para avance/retroceso manual, `Esc` para salir).

---

## 🚀 2. Propuestas de Revisión de Arquitectura y Nuevas Características

Para elevar el estándar del producto de **MVP a Nivel Producción Premium**, se establecen las siguientes 4 iniciativas técnicas:

### Proposal 1: Screen Wake Lock API (Prevención de Reposo de Pantalla)
* **Objetivo**: Evitar que televisores inteligentes o pantallas móviles se apaguen o atenúen durante la proyección matutina.
* **Implementación**:
  ```javascript
  let wakeLock = null;

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Screen Wake Lock activo');
      }
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  }

  function releaseWakeLock() {
    if (wakeLock !== null) {
      wakeLock.release();
      wakeLock = null;
    }
  }
  ```

### Proposal 2: Tipografía Fluida Adaptativa (Dynamic Text Scaling)
* **Objetivo**: Prevenir desbordamientos visuales (*horizontal overflow*) en palabras largas o frases completas proyectadas a 3 metros de distancia.
* **Implementación**:
  - Uso de reglas CSS dinámicas basadas en la longitud del texto o `clamp()`:
  ```css
  .flash-text {
    font-size: clamp(2.5rem, 8vw, 7rem);
    word-break: break-word;
    hyphens: auto;
  }
  ```

### Proposal 3: Modo Bifold / Tarjetas Pregunta-Respuesta (Q&A Flip Card)
* **Objetivo**: Permitir no solo palabras clave individuales, sino también conceptos tipo "Pregunta : Respuesta" o "Término : Definición".
* **Estructura de Datos**:
  ```javascript
  interface Card {
    front: string; // Pregunta o Término
    back?: string; // Respuesta o Explicación (opcional)
  }
  ```
* **Comportamiento**: En el bucle de proyección, muestra primero la pregunta y luego revela la respuesta tras un intervalo configurado, o al pulsar una tecla.

### Proposal 4: Arquitectura Modular de Código (Desacoplamiento HTML/JS/CSS)
* **Objetivo**: Separar la aplicación monolítica en estructura limpia:
  - `index.html` (Entry point principal)
  - `css/styles.css` (Tokens de diseño y animaciones)
  - `js/app.js` (Lógica de estado y renderizado)
  - `js/sanitizer.js` (Higienizador de texto y parser)
  - `js/wakelock.js` (Módulo de gestión de energía)

---

## 📋 3. Matriz de Cumplimiento de Pautas UX/UI

| Estándar | Criterio Cumplido | Implementación |
| :--- | :--- | :--- |
| **Nielsen #1** | Visibilidad del estado | HUD inferior con tiempo de transición y estado de reproducción. |
| **Nielsen #3** | Control y libertad | Atajos de teclado completos (`Space`, `Arrows`, `Esc`). |
| **Nielsen #5** | Prevención de errores | Saneador regex y alertas para inputs vacíos. |
| **MOSIP Pauta #1** | Accesibilidad visual | Contraste 16:1 en fondo oscuro `#121212`. |
| **UX4G pág 31** | Tipografía accesible | Fuente Google Fonts 'Noto Sans' con excelente legibilidad Unicode. |
| **10-Foot UI** | Elementos interactivos | Hit-targets de `64px` aptos para control remoto de TV. |
