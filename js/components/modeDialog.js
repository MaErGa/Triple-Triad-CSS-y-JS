// js/components/modeDialog.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  var LINKS = [
    { id: "github", label: "Github", href: "https://github.com/MaErGa" },
    { id: "site", label: "maerga.github.io", href: "https://maerga.github.io" },
  ];

  /**
   * @param {HTMLElement} contenedor
   * @param {Object} opciones { onSingle, cursorEnabled, linksOpen, onLinksToggle }
   */
  function montar(contenedor, opciones) {
    var seleccionado = "single";
    var cursorEnabled = opciones.cursorEnabled !== false;
    var linksOpen = !!opciones.linksOpen;

    function sonidoActivo() { return TT.state.get().isSoundEnabled; }

    var caja = TT.components.simpleDialog.crear({ metaTitle: undefined, className: "mode-dialog-modeDialog" });
    caja.dataset.dialog = "simple";
    contenedor.appendChild(caja);

    var pregunta = document.createElement("p");
    pregunta.className = "mode-dialog-question";
    pregunta.appendChild(TT.textoASprite("Want to play a game of cards?"));
    caja.appendChild(pregunta);

    var opcionesDiv = document.createElement("div");
    opcionesDiv.className = "mode-dialog-options";
    caja.appendChild(opcionesDiv);

    function moverCursor(id) {
      if (seleccionado !== id) TT.sounds.reproducirSonido("select", sonidoActivo());
      seleccionado = id;
      actualizarFoco();
      // crearMenuCursor guarda su propia copia de "selected" (para saber
      // qué confirmar si llega un Enter); sin este resync, el ratón podía
      // mover el cursor visualmente mientras el teclado seguía confirmando
      // la opción anterior.
      if (menu) menu.actualizar({ layout: [["single"]], selected: seleccionado, onSelect: moverCursor, onConfirm: confirmar, enabled: cursorEnabled });
    }

    function confirmar() {
      TT.sounds.reproducirSonido("select", sonidoActivo());
      opciones.onSingle();
    }

    var botonSingle = document.createElement("button");
    botonSingle.className = "relative";
    botonSingle.appendChild(TT.textoASprite("Play"));
    botonSingle.addEventListener("mouseenter", function () { moverCursor("single"); });
    botonSingle.addEventListener("pointerdown", function () { moverCursor("single"); });
    botonSingle.addEventListener("click", function () { confirmar("single"); });
    opcionesDiv.appendChild(botonSingle);

    function actualizarFoco() {
      botonSingle.dataset.focused = String(cursorEnabled && seleccionado === "single");
    }
    actualizarFoco();

    var menu = TT.crearMenuCursor({
      layout: [["single"]],
      selected: seleccionado,
      onSelect: moverCursor,
      onConfirm: confirmar,
      enabled: cursorEnabled,
    });

    // --- Barra de enlaces (Furniture, fuera de #app) ---
    var furniture = TT.crearFurniture(
      "fixed left-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-10 mode-dialog-links"
    );

    var barra = TT.components.simpleDialog.crear({
      metaTitle: null, dialog: "quit", className: "mode-dialog-linkBar",
    });
    barra.dataset.expanded = String(linksOpen);
    furniture.appendChild(barra);

    var botonToggle = document.createElement("button");
    botonToggle.className = "mode-dialog-link mode-dialog-toggle";
    botonToggle.appendChild(TT.textoASprite("Links"));
    botonToggle.addEventListener("click", function () {
      TT.sounds.reproducirSonido("select", sonidoActivo());
      if (opciones.onLinksToggle) opciones.onLinksToggle();
    });
    barra.appendChild(botonToggle);

    var itemsDiv = document.createElement("div");
    itemsDiv.className = "mode-dialog-linkItems";
    barra.appendChild(itemsDiv);

    LINKS.forEach(function (link) {
      var a = document.createElement("a");
      a.className = "mode-dialog-link";
      a.href = link.href;
      a.target = "_blank";
      a.rel = "noreferrer noopener";
      if (!linksOpen) a.tabIndex = -1;
      a.addEventListener("click", function () { TT.sounds.reproducirSonido("select", sonidoActivo()); });
      a.appendChild(TT.textoASprite(link.label));
      itemsDiv.appendChild(a);
    });

    return {
      actualizar: function (nuevasOpciones) {
        opciones = Object.assign({}, opciones, nuevasOpciones);
        cursorEnabled = opciones.cursorEnabled !== false;
        linksOpen = !!opciones.linksOpen;
        barra.dataset.expanded = String(linksOpen);
        Array.prototype.forEach.call(itemsDiv.querySelectorAll("a"), function (a) {
          if (linksOpen) a.removeAttribute("tabindex"); else a.tabIndex = -1;
        });
        menu.actualizar({ layout: [["single"]], selected: seleccionado, onSelect: moverCursor, onConfirm: confirmar, enabled: cursorEnabled });
        actualizarFoco();
      },
      desmontar: function () {
        menu.destruir();
        caja.remove();
        furniture.remove();
      },
    };
  }

  TT.components.modeDialog = { montar: montar };
})();
