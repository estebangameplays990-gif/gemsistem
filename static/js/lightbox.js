/* =====================================================
   GEMSISTEM — Lightbox con Zoom & Pantalla Completa
   Incluye este archivo en tus templates de Flask
   ===================================================== */

(function () {
  /* ── 1. ESTILOS ── */
  const style = document.createElement('style');
  style.textContent = `
    /* Imágenes de producto — siempre se ven completas */
    .product-img,
    .product-image,
    img[data-lightbox],
    .product-gallery img,
    .product-card img,
    .card img {
      width: 100%;
      height: 220px;
      object-fit: contain !important;   /* completa, sin recorte */
      background: #f8f8f8;
      cursor: zoom-in;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      border-radius: 8px;
    }

    .product-img:hover,
    .product-image:hover,
    img[data-lightbox]:hover,
    .product-gallery img:hover,
    .product-card img:hover,
    .card img:hover {
      transform: scale(1.03);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    /* ── Overlay del lightbox ── */
    #gem-lightbox {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.93);
      flex-direction: column;
      align-items: center;
      justify-content: center;
      touch-action: none;
    }
    #gem-lightbox.active { display: flex; }

    /* Barra superior */
    #gem-lb-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      padding: 0 14px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
    }
    #gem-lb-bar button {
      background: rgba(255,255,255,0.13);
      border: none;
      color: #fff;
      width: 38px; height: 38px;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.18s;
    }
    #gem-lb-bar button:hover { background: rgba(255,255,255,0.28); }

    /* Contenedor de imagen con scroll zoom */
    #gem-lb-viewport {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 50px;
      box-sizing: border-box;
    }

    #gem-lb-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transform-origin: center center;
      transition: transform 0.2s ease;
      cursor: grab;
      user-select: none;
      border-radius: 4px;
    }
    #gem-lb-img.dragging { cursor: grabbing; transition: none; }

    /* Flechas navegación */
    .gem-lb-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.12);
      border: none;
      color: #fff;
      width: 46px; height: 46px;
      border-radius: 50%;
      font-size: 22px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.18s;
      z-index: 2;
    }
    .gem-lb-arrow:hover { background: rgba(255,255,255,0.28); }
    #gem-lb-prev { left: 10px; }
    #gem-lb-next { right: 10px; }

    /* Contador */
    #gem-lb-counter {
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255,255,255,0.7);
      font-size: 13px;
      font-family: sans-serif;
      letter-spacing: 1px;
    }

    /* Barra de zoom */
    #gem-lb-zoom-bar {
      position: absolute;
      bottom: 48px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0,0,0,0.5);
      padding: 6px 14px;
      border-radius: 30px;
    }
    #gem-lb-zoom-bar button {
      background: none;
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
      opacity: 0.85;
    }
    #gem-lb-zoom-bar button:hover { opacity: 1; }
    #gem-lb-zoom-label {
      color: #fff;
      font-size: 12px;
      font-family: sans-serif;
      min-width: 42px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);

  /* ── 2. HTML del lightbox ── */
  const lb = document.createElement('div');
  lb.id = 'gem-lightbox';
  lb.innerHTML = `
    <div id="gem-lb-bar">
      <button id="gem-lb-fullscreen" title="Pantalla completa">⛶</button>
      <button id="gem-lb-close" title="Cerrar">✕</button>
    </div>
    <div id="gem-lb-viewport">
      <img id="gem-lb-img" src="" alt="Imagen ampliada" draggable="false">
    </div>
    <button class="gem-lb-arrow" id="gem-lb-prev">‹</button>
    <button class="gem-lb-arrow" id="gem-lb-next">›</button>
    <div id="gem-lb-zoom-bar">
      <button id="gem-lb-zoom-out">−</button>
      <span id="gem-lb-zoom-label">100%</span>
      <button id="gem-lb-zoom-in">+</button>
      <button id="gem-lb-zoom-reset" title="Restablecer">⟳</button>
    </div>
    <div id="gem-lb-counter"></div>
  `;
  document.body.appendChild(lb);

  /* ── 3. ESTADO ── */
  let images = [];   // lista de srcs del conjunto actual
  let current = 0;
  let scale = 1;
  let translateX = 0, translateY = 0;
  let isDragging = false;
  let startX, startY, originX, originY;

  const img    = document.getElementById('gem-lb-img');
  const counter= document.getElementById('gem-lb-counter');
  const zoomLbl= document.getElementById('gem-lb-zoom-label');

  /* ── 4. ABRIR / CERRAR ── */
  function open(srcs, index) {
    images = srcs;
    current = index;
    resetZoom();
    showImage();
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('active');
    document.body.style.overflow = '';
    exitFullscreen();
  }

  function showImage() {
    img.src = images[current];
    counter.textContent = images.length > 1 ? `${current + 1} / ${images.length}` : '';
    document.getElementById('gem-lb-prev').style.display = images.length > 1 ? '' : 'none';
    document.getElementById('gem-lb-next').style.display = images.length > 1 ? '' : 'none';
    resetZoom();
  }

  /* ── 5. NAVEGACIÓN ── */
  document.getElementById('gem-lb-prev').addEventListener('click', () => {
    current = (current - 1 + images.length) % images.length;
    showImage();
  });
  document.getElementById('gem-lb-next').addEventListener('click', () => {
    current = (current + 1) % images.length;
    showImage();
  });

  /* ── 6. ZOOM ── */
  const MIN_SCALE = 1, MAX_SCALE = 5, STEP = 0.4;

  function applyTransform() {
    if (scale === 1) { translateX = 0; translateY = 0; }
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    img.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    zoomLbl.textContent = Math.round(scale * 100) + '%';
  }

  function zoomIn()  { scale = Math.min(scale + STEP, MAX_SCALE); applyTransform(); }
  function zoomOut() { scale = Math.max(scale - STEP, MIN_SCALE); applyTransform(); }
  function resetZoom() { scale = 1; translateX = 0; translateY = 0; applyTransform(); }

  document.getElementById('gem-lb-zoom-in').addEventListener('click', zoomIn);
  document.getElementById('gem-lb-zoom-out').addEventListener('click', zoomOut);
  document.getElementById('gem-lb-zoom-reset').addEventListener('click', resetZoom);

  /* Zoom con rueda del ratón */
  lb.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.deltaY < 0 ? zoomIn() : zoomOut();
  }, { passive: false });

  /* Doble clic: zoom rápido */
  img.addEventListener('dblclick', () => {
    scale === 1 ? (scale = 2.5, applyTransform()) : resetZoom();
  });

  /* ── 7. ARRASTRAR (pan) ── */
  img.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    isDragging = true;
    img.classList.add('dragging');
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    applyTransform();
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
    img.classList.remove('dragging');
  });

  /* Touch pan + pinch zoom */
  let lastDist = null;
  lb.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && scale > 1) {
      isDragging = true;
      startX = e.touches[0].clientX - translateX;
      startY = e.touches[0].clientY - translateY;
    }
    if (e.touches.length === 2) {
      lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });
  lb.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      translateX = e.touches[0].clientX - startX;
      translateY = e.touches[0].clientY - startY;
      applyTransform();
    }
    if (e.touches.length === 2 && lastDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * (dist / lastDist)));
      lastDist = dist;
      applyTransform();
    }
  }, { passive: true });
  lb.addEventListener('touchend', () => {
    isDragging = false;
    lastDist = null;
  });

  /* ── 8. PANTALLA COMPLETA ── */
  const fsBtn = document.getElementById('gem-lb-fullscreen');

  function enterFullscreen() {
    if (lb.requestFullscreen) lb.requestFullscreen();
    else if (lb.webkitRequestFullscreen) lb.webkitRequestFullscreen();
    fsBtn.textContent = '⛶'; // se actualiza en el evento
  }
  function exitFullscreen() {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }
  fsBtn.addEventListener('click', () => {
    document.fullscreenElement ? exitFullscreen() : enterFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = document.fullscreenElement ? '⊡' : '⛶';
    fsBtn.title = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
  });

  /* ── 9. CERRAR ── */
  document.getElementById('gem-lb-close').addEventListener('click', close);
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target.id === 'gem-lb-viewport') close();
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') { current = (current + 1) % images.length; showImage(); }
    if (e.key === 'ArrowLeft')  { current = (current - 1 + images.length) % images.length; showImage(); }
    if (e.key === '+') zoomIn();
    if (e.key === '-') zoomOut();
    if (e.key === '0') resetZoom();
  });

  /* ── 10. INICIALIZAR IMÁGENES DE LA PÁGINA ── */
  function initImages() {
    // Seleccionamos todas las imágenes de producto
    const selectors = [
      '.product-gallery img',
      '.product-img',
      '.product-image',
      '.card img',
      '.product-card img',
      'img[data-lightbox]',
    ];
    const allImgs = document.querySelectorAll(selectors.join(','));

    allImgs.forEach((el) => {
      // Forzar object-fit: contain
      el.style.objectFit = 'contain';
      el.style.cursor = 'zoom-in';

      el.addEventListener('click', () => {
        // Buscar el grupo al que pertenece (mismo contenedor padre)
        const container = el.closest(
          '.product-gallery, .product-images, .carousel, .swiper-wrapper, [data-gallery]'
        ) || el.parentElement;

        let group = Array.from(
          container.querySelectorAll(selectors.join(','))
        ).map(i => i.src).filter(Boolean);

        if (!group.length) group = [el.src];
        const idx = group.indexOf(el.src);

        open(group, idx >= 0 ? idx : 0);
      });
    });
  }

  // Ejecutar al cargar y también si hay contenido dinámico
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImages);
  } else {
    initImages();
  }

  // Exponer API global por si se necesita desde otro script
  window.GemLightbox = { open, close };
})();
