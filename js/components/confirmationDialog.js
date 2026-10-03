// js/components/confirmationDialog.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /**
   * Monta el diálogo "¿Seguro?" dentro de #modal.
   * @param {Object} opciones
   * @param {Function} opciones.onConfirm
   * @param {Function} opciones.onDeny
   */
  function montar(opciones) {
    var modal = document.getElementById("modal");
    if (!modal) return { desmontar: function () {} };

    var capa = document.createElement("div");
    capa.className = "w-full h-full absolute left-0 top-0 z-10";

    var caja = document.createElement("div");
    caja.className = "confirm-dialog-confirmationDialog absolute";
    caja.dataset.dialog = "confirmation";
    capa.appendChild(caja);

    var meta = document.createElement("h4");
    meta.className = "confirm-dialog-meta";
    meta.dataset.sprite = "choice";
    TT.i18n.aplicarTexto(meta, "Choice");
    caja.appendChild(meta);

    var titulo = document.createElement("h3");
    titulo.className = "text-center";
    titulo.appendChild(TT.textoASprite("Are you sure?"));
    caja.appendChild(titulo);

    var opcionesDiv = document.createElement("div");
    opcionesDiv.className = "flex flex-col items-center";
    caja.appendChild(opcionesDiv);

    var botonSi = document.createElement("button");
    botonSi.className = "relative";
    botonSi.appendChild(TT.textoASprite("Yes"));
    opcionesDiv.appendChild(botonSi);

    var botonNo = document.createElement("button");
    botonNo.className = "relative";
    botonNo.appendChild(TT.textoASprite("No"));
    opcionesDiv.appendChild(botonNo);

    modal.appendChild(capa);

    var nav = TT.crearCursorNav({
      groups: [{ id: "choice", size: 2 }],
      initial: { group: "choice", index: 0 },
      fallback: { group: "choice", index: 0 },
      enabled: !TT.state.get().isCardGalleryOpen,
      resolveMove: function (current, dir, helpers) {
        if (dir === "up" || dir === "down") {
          return { group: "choice", index: helpers.wrap(current.index, (dir === "down") ? 1 : -1, 2) };
        }
        return null;
      },
      onFocus: function (current) {
        botonSi.dataset.focused = String(current.group === "choice" && current.index === 0);
        botonNo.dataset.focused = String(current.group === "choice" && current.index === 1);
      },
      onConfirm: function (current) {
        if (current.index === 0) {
          TT.marcarNavegacionTeclado();
          opciones.onConfirm();
        } else {
          opciones.onDeny();
        }
      },
      onCancel: function () { opciones.onDeny(); },
    });

    botonSi.addEventListener("click", opciones.onConfirm);
    botonSi.addEventListener("mouseenter", function () { nav.focus({ group: "choice", index: 0 }); });
    botonSi.addEventListener("pointerdown", function () { nav.focus({ group: "choice", index: 0 }); });

    botonNo.addEventListener("click", opciones.onDeny);
    botonNo.addEventListener("mouseenter", function () { nav.focus({ group: "choice", index: 1 }); });
    botonNo.addEventListener("pointerdown", function () { nav.focus({ group: "choice", index: 1 }); });

    return {
      desmontar: function () {
        nav.destruir();
        capa.remove();
      },
    };
  }

  TT.components.confirmationDialog = { montar: montar };
})();
