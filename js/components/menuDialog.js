// js/components/menuDialog.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  var OPTIONS_SIZE = 5;

  // Cadena vertical del cursor: Play, Quit, fila de localización, fila de
  // rival, panel de opciones.
  var CADENA = [
    { group: "buttons", index: 0 },
    { group: "buttons", index: 1 },
    { group: "location", index: 0 },
    { group: "enemy", index: 0 },
    { group: "options", index: 0 },
  ];

  function indiceEnCadena(pos) {
    if (pos.group === "buttons") return pos.index;
    if (pos.group === "location") return 2;
    if (pos.group === "enemy") return 3;
    return 4;
  }

  /**
   * @param {HTMLElement} contenedor
   * @param {Object} opciones { onQuit }
   */
  function montar(contenedor, opciones) {
    var raiz = document.createElement("div");
    raiz.className = "menu-dialog-menuDialog";
    contenedor.appendChild(raiz);

    var meta = document.createElement("h4");
    meta.className = "menu-dialog-meta";
    meta.dataset.sprite = "info.";
    TT.i18n.aplicarTexto(meta, "Info.");
    raiz.appendChild(meta);

    var pReglas = document.createElement("p");
    raiz.appendChild(pReglas);

    var listaReglas = document.createElement("ul");
    raiz.appendChild(listaReglas);

    var pIntercambio = document.createElement("p");
    raiz.appendChild(pIntercambio);

    var botonesDiv = document.createElement("div");
    botonesDiv.className = "flex flex-col items-center";
    raiz.appendChild(botonesDiv);

    var botonPlay = document.createElement("button");
    botonPlay.className = "relative";
    botonPlay.appendChild(TT.textoASprite("Play"));
    botonesDiv.appendChild(botonPlay);

    var botonQuit = document.createElement("button");
    botonQuit.className = "relative";
    botonQuit.appendChild(TT.textoASprite("Quit"));
    botonesDiv.appendChild(botonQuit);

    var location = TT.components.locationSelection.montar(contenedor);
    var enemy = TT.components.enemySelection.montar(contenedor);

    function handlePlayClick() {
      TT.state.dispatch({ type: "SET_IS_MENU_OPEN", payload: false });
      TT.state.dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: true });
      TT.sounds.reproducirSonido("select", TT.state.get().isSoundEnabled);
    }

    function handleQuitClick() {
      TT.sounds.reproducirSonido("back", TT.state.get().isSoundEnabled);
      opciones.onQuit();
    }

    function opcionHabilitada(indice) {
      return indice === 0 || !!(TT.optionsNav.actions.isOpen && TT.optionsNav.actions.isOpen());
    }

    function resolverMovimiento(current, dir) {
      if (dir === "left" || dir === "right") {
        if (current.group === "location") {
          TT.paginationNav.flip("locations", (dir === "left") ? "prev" : "next");
          return "handled";
        }
        if (current.group === "enemy") {
          TT.paginationNav.flip("players", (dir === "left") ? "prev" : "next");
          return "handled";
        }
        if (current.group === "options") {
          for (var paso = 1; paso < OPTIONS_SIZE; paso++) {
            var indice = (current.index + ((dir === "right") ? paso : -paso) + OPTIONS_SIZE * 4) % OPTIONS_SIZE;
            if (opcionHabilitada(indice)) return { group: "options", index: indice };
          }
          return null;
        }
        return null;
      }
      var delta = (dir === "down") ? 1 : -1;
      return CADENA[(indiceEnCadena(current) + delta + CADENA.length) % CADENA.length];
    }

    function gruposActuales() {
      return [
        { id: "buttons", size: 2 },
        { id: "location", size: 1 },
        { id: "enemy", size: 1 },
        { id: "options", size: OPTIONS_SIZE, isDisabled: function (i) { return !opcionHabilitada(i); } },
      ];
    }

    var nav = TT.crearCursorNav({
      groups: gruposActuales(),
      initial: null,
      fallback: { group: "buttons", index: 0 },
      enabled: TT.state.get().isMenuOpen && !TT.state.get().isCardGalleryOpen,
      resolveMove: resolverMovimiento,
      onFocus: function (current) {
        TT.optionsNav.setFocus(current.group === "options" ? current.index : null);
        botonPlay.dataset.focused = String(current.group === "buttons" && current.index === 0);
        botonQuit.dataset.focused = String(current.group === "buttons" && current.index === 1);
        location.setFocused(current.group === "location" && current.index === 0);
        enemy.setFocused(current.group === "enemy" && current.index === 0);
      },
      onConfirm: function (current) {
        if (current.group === "buttons") {
          if (current.index === 0) { TT.marcarNavegacionTeclado(); handlePlayClick(); }
          else handleQuitClick();
          return;
        }
        if (current.group === "location") { TT.paginationNav.flip("locations", "next"); return; }
        if (current.group === "enemy") { TT.paginationNav.flip("players", "next"); return; }
        if (!opcionHabilitada(current.index)) return;
        if (current.index === 0) { if (TT.optionsNav.actions.toggleOptions) TT.optionsNav.actions.toggleOptions(); }
        else if (current.index === 1) { if (TT.optionsNav.actions.toggleCRT) TT.optionsNav.actions.toggleCRT(); }
        else if (current.index === 2) { TT.marcarNavegacionTeclado(); if (TT.optionsNav.actions.toggleGallery) TT.optionsNav.actions.toggleGallery(); }
        else if (current.index === 3) { if (TT.optionsNav.actions.toggleSound) TT.optionsNav.actions.toggleSound(); }
        else { if (TT.optionsNav.actions.toggleLanguage) TT.optionsNav.actions.toggleLanguage(); }
      },
      onCancel: handleQuitClick,
    });

    TT.optionsNav.actions.focusOption = function (indice) { nav.focus({ group: "options", index: indice }); };

    botonPlay.addEventListener("click", handlePlayClick);
    botonPlay.addEventListener("mouseenter", function () { nav.focus({ group: "buttons", index: 0 }); });
    botonQuit.addEventListener("click", handleQuitClick);
    botonQuit.addEventListener("mouseenter", function () { nav.focus({ group: "buttons", index: 1 }); });

    function render() {
      var estadoJuego = TT.state.get();
      raiz.classList.toggle("hidden", !estadoJuego.isMenuOpen);
      nav.actualizarOpciones({
        groups: gruposActuales(),
        initial: null,
        fallback: { group: "buttons", index: 0 },
        enabled: estadoJuego.isMenuOpen && !estadoJuego.isCardGalleryOpen,
        resolveMove: resolverMovimiento,
      });

      pReglas.innerHTML = "";
      pReglas.appendChild(TT.textoASprite("Rules:"));

      listaReglas.innerHTML = "";
      (estadoJuego.rules || []).forEach(function (regla) {
        var li = document.createElement("li");
        var span = document.createElement("span");
        span.appendChild(TT.textoASprite("• " + TT.i18n.t(TT_DATA.rules.rules[regla] || regla)));
        li.appendChild(span);
        listaReglas.appendChild(li);
      });

      pIntercambio.innerHTML = "";
      var nombreIntercambio = estadoJuego.tradeRule ? (TT_DATA.rules.tradeRules[estadoJuego.tradeRule] || estadoJuego.tradeRule) : "None";
      var textoIntercambio = "• " + TT.i18n.t("Trade Rule: ") + TT.i18n.t(nombreIntercambio);
      pIntercambio.appendChild(TT.textoASprite(textoIntercambio));
    }

    var cancelar = TT.state.subscribe(render);
    render();

    return {
      desmontar: function () {
        cancelar();
        nav.destruir();
        TT.optionsNav.actions.focusOption = undefined;
        TT.optionsNav.setFocus(null);
        location.desmontar();
        enemy.desmontar();
        raiz.remove();
      },
    };
  }

  TT.components.menuDialog = { montar: montar };
})();
