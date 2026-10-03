// js/components/dialogPagination.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  var SWIPE_MIN = 40;

  /**
   * @param {Object} opciones
   * @param {Array} opciones.items lista de [clave, valor] (como Object.entries)
   * @param {number} opciones.itemsPerPage
   * @param {(item:*, index:*) => Node} opciones.renderItem
   * @param {string} opciones.pagination clave en currentPages ("players"|"cards"|"locations"|"cardGallery")
   * @returns {{el: HTMLElement, actualizar: Function, destruir: Function}}
   */
  function crear(opciones) {
    var contenedor = document.createElement("div");
    contenedor.className = "pagination-paginationContainer";

    var listaItems = document.createElement("div");
    listaItems.style.display = "contents";
    contenedor.appendChild(listaItems);

    var barra = document.createElement("div");
    barra.className = "pagination-pagination flex justify-between absolute bottom-0 left-0 w-full";
    var botonPrev = document.createElement("button");
    botonPrev.dataset.prev = "";
    botonPrev.className = "disabled:opacity-50";
    var botonNext = document.createElement("button");
    botonNext.dataset.next = "";
    botonNext.className = "disabled:opacity-50";
    barra.appendChild(botonPrev);
    barra.appendChild(botonNext);
    contenedor.appendChild(barra);

    function paginaActual() {
      return TT.state.get().currentPages[opciones.pagination] || 1;
    }

    function totalPaginas() {
      return Math.max(1, Math.ceil(opciones.items.length / opciones.itemsPerPage));
    }

    function irA(pagina, direccion) {
      TT.sounds.reproducirSonido("place", TT.state.get().isSoundEnabled);
      TT.state.dispatch({ type: "SET_SLIDE_DIRECTION", payload: [opciones.pagination, direccion] });

      var todasLasPaginas = Object.assign({}, TT.state.get().currentPages);
      todasLasPaginas[opciones.pagination] = pagina;
      TT.state.dispatch({ type: "SET_CURRENT_PAGES", payload: todasLasPaginas });

      window.setTimeout(function () {
        TT.state.dispatch({ type: "SET_SLIDE_DIRECTION", payload: null });
      }, 100);
    }

    function anterior() {
      var actual = paginaActual(), paginas = totalPaginas();
      irA((actual === 1) ? paginas : actual - 1, "prev");
    }

    function siguiente() {
      var actual = paginaActual(), paginas = totalPaginas();
      irA((actual === paginas) ? 1 : actual + 1, "next");
    }

    botonPrev.addEventListener("click", anterior);
    botonNext.addEventListener("click", siguiente);

    var toque = null;
    contenedor.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { toque = null; return; }
      toque = { x: e.touches[0].clientX, y: e.touches[0].clientY, en: Date.now() };
    }, { passive: true });

    contenedor.addEventListener("touchend", function (e) {
      var inicio = toque;
      toque = null;
      if (!inicio || totalPaginas() <= 1) return;
      var fin = e.changedTouches[0];
      if (!fin) return;
      var dx = fin.clientX - inicio.x, dy = fin.clientY - inicio.y;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (Date.now() - inicio.en > 800) return;
      if (dx < 0) siguiente(); else anterior();
    });

    contenedor.addEventListener("touchcancel", function () { toque = null; });

    // TT.state emite una vez por cada dispatch, y muchas de esas veces no
    // tienen nada que ver con esta lista (elegir un rival dispara 3
    // dispatch seguidos, por ejemplo). Sin esta comprobación, cada uno de
    // esos renders de sobra volvía a vaciar listaItems y reconstruir todas
    // las cartas/opciones — exactamente el parpadeo reportado. Solo se
    // reconstruye si la página, el contenido o la animación de
    // deslizamiento cambiaron de verdad.
    var ultimaFirma = null;

    function render() {
      var actual = paginaActual();
      var paginas = totalPaginas();
      var trozo = opciones.items.slice((actual - 1) * opciones.itemsPerPage, actual * opciones.itemsPerPage);

      var firma = actual + "|" + JSON.stringify(TT.state.get().slideDirection) + "|" + JSON.stringify(trozo);
      if (firma !== ultimaFirma) {
        ultimaFirma = firma;
        listaItems.innerHTML = "";
        trozo.forEach(function (entrada, i) {
          var indiceGlobal = (actual - 1) * opciones.itemsPerPage + i;
          var nodo = opciones.renderItem(entrada, indiceGlobal);
          if (nodo) listaItems.appendChild(nodo);
        });
      }

      barra.classList.toggle("hidden", paginas <= 1);
    }

    TT.paginationNav.register(opciones.pagination, { prev: anterior, next: siguiente });

    render();

    return {
      el: contenedor,
      actualizar: function (nuevosItems) {
        if (nuevosItems) opciones.items = nuevosItems;
        render();
      },
      destruir: function () {
        TT.paginationNav.unregister(opciones.pagination);
      },
    };
  }

  TT.components.dialogPagination = { crear: crear };
})();
