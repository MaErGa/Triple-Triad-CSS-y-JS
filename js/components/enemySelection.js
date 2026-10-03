// js/components/enemySelection.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /** @param {HTMLElement} contenedor */
  function montar(contenedor) {
    var raiz = document.createElement("div");
    raiz.className = "enemy-select-enemySelectionDialog top-[80%]";
    contenedor.appendChild(raiz);

    var meta = document.createElement("h4");
    meta.className = "enemy-select-meta";
    meta.dataset.sprite = "players";
    TT.i18n.aplicarTexto(meta, "Players");
    raiz.appendChild(meta);

    var paginacion = null;
    var ultimaClaveJugadores = null;
    var ultimaClaveSeleccion = null;
    var mapaCartasPerdidas = {};

    // Como en el original: se calcula una sola vez al montar.
    try {
      var perdidasJSON = localStorage.getItem("lostCards");
      var actuales = perdidasJSON ? JSON.parse(perdidasJSON) : TT.state.get().lostCards;
      Object.keys(actuales || {}).forEach(function (idJugador) {
        if (actuales[idJugador] && actuales[idJugador].length) mapaCartasPerdidas[idJugador] = true;
      });
    } catch (e) { /* nada que hacer */ }

    function jugadoresFiltrados() {
      var estadoJuego = TT.state.get();
      var idLocalizacion = estadoJuego.currentPages.locations;
      var localizacion = TT_DATA.locations[idLocalizacion - 1];
      if (!localizacion) return [];
      return TT_DATA.players.filter(function (p) {
        return p.location === localizacion.location && p.active;
      });
    }

    function contenidoJugador(entrada) {
      var item = entrada[1];
      var estadoJuego = TT.state.get();
      var color;

      if (mapaCartasPerdidas[item.id]) {
        color = "yellow";
      } else if (item.rareCard && (Object.keys(estadoJuego.playerCards).indexOf(String(item.rareCard)) === -1 || estadoJuego.playerCards[item.rareCard] === 0)) {
        color = "blue";
      }

      var div = document.createElement("div");
      var slide = estadoJuego.slideDirection;
      if (slide && (slide[0] === "players" || slide[0] === "locations")) div.dataset.slideDirection = slide[1];

      var pNombre = document.createElement("p");
      pNombre.appendChild(TT.textoASprite(item.player, color, true));
      div.appendChild(pNombre);

      var pDesc = document.createElement("p");
      pDesc.className = "opacity-50";
      pDesc.appendChild(TT.textoASprite(item.additionalDesc, "white", true));
      div.appendChild(pDesc);

      return div;
    }

    function montarPaginacion() {
      if (paginacion) { paginacion.destruir(); paginacion.el.remove(); }
      paginacion = TT.components.dialogPagination.crear({
        items: jugadoresFiltrados().map(function (p) { return [String(p.id), p]; }),
        itemsPerPage: 1,
        renderItem: contenidoJugador,
        pagination: "players",
      });
      raiz.appendChild(paginacion.el);
    }

    montarPaginacion();

    function aplicarSeleccionActual() {
      var estadoJuego = TT.state.get();
      var lista = jugadoresFiltrados();
      var enemigo = lista[estadoJuego.currentPages.players - 1];
      if (!enemigo) return;

      var clave = estadoJuego.currentPages.locations + ":" + estadoJuego.currentPages.players;
      if (clave === ultimaClaveSeleccion) return;
      ultimaClaveSeleccion = clave;

      TT.state.dispatch({ type: "SET_ENEMY_ID", payload: enemigo.id });

      if (enemigo.rules in TT_DATA.ruleSets) {
        TT.state.dispatch({ type: "SET_RULES", payload: TT_DATA.ruleSets[enemigo.rules] || [] });

        var clavesIntercambio = Object.keys(TT_DATA.rules.tradeRules).filter(function (r) { return r !== "none"; });
        var elegida = clavesIntercambio[Math.floor(Math.random() * clavesIntercambio.length)];
        TT.state.dispatch({ type: "SET_TRADE_RULE", payload: elegida });
      }
    }

    function render() {
      var estadoJuego = TT.state.get();
      raiz.classList.toggle("hidden", !estadoJuego.isMenuOpen);

      var claveJugadores = estadoJuego.currentPages.locations;
      if (claveJugadores !== ultimaClaveJugadores) {
        ultimaClaveJugadores = claveJugadores;
        montarPaginacion();
      } else {
        paginacion.actualizar();
      }

      aplicarSeleccionActual();
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

  TT.components.enemySelection = { montar: montar };
})();
