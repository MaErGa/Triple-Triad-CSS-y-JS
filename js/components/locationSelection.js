// js/components/locationSelection.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /** @param {HTMLElement} contenedor */
  function montar(contenedor) {
    var raiz = document.createElement("div");
    raiz.className = "location-select-locationSelectionDialog top-[80%]";
    contenedor.appendChild(raiz);

    var meta = document.createElement("h4");
    meta.className = "location-select-meta";
    meta.dataset.sprite = "location";
    TT.i18n.aplicarTexto(meta, "Location");
    raiz.appendChild(meta);

    function contenidoLocalizacion(entrada) {
      var item = entrada[1];
      var estadoJuego = TT.state.get();
      var div = document.createElement("div");
      var slide = estadoJuego.slideDirection;
      if (slide && slide[0] === "locations") div.dataset.slideDirection = slide[1];

      var p = document.createElement("p");
      p.appendChild(TT.textoASprite(item.location, "white", true));
      div.appendChild(p);
      return div;
    }

    var paginacion = TT.components.dialogPagination.crear({
      items: TT_DATA.locations.map(function (l) { return [String(l.id), l]; }),
      itemsPerPage: 1,
      renderItem: contenidoLocalizacion,
      pagination: "locations",
    });
    raiz.appendChild(paginacion.el);

    var ultimaLocationId = null;

    function render() {
      var estadoJuego = TT.state.get();
      raiz.classList.toggle("hidden", !estadoJuego.isMenuOpen);
      paginacion.actualizar();

      // Cambiar de localización reinicia la página de enemigos a la primera.
      var locationId = estadoJuego.currentPages.locations;
      if (locationId && locationId !== ultimaLocationId) {
        ultimaLocationId = locationId;
        var todasLasPaginas = Object.assign({}, estadoJuego.currentPages);
        if (todasLasPaginas.players !== 1) {
          todasLasPaginas.players = 1;
          TT.state.dispatch({ type: "SET_CURRENT_PAGES", payload: todasLasPaginas });
        }
      }
    }

    var cancelar = TT.state.subscribe(render);
    render();

    return {
      el: raiz,
      setFocused: function (focused) { raiz.dataset.focused = String(!!focused); },
      desmontar: function () {
        cancelar();
        paginacion.destruir();
        raiz.remove();
      },
    };
  }

  TT.components.locationSelection = { montar: montar };
})();
