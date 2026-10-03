// js/components/installHint.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  var DISMISSED_KEY = "installHintDismissed";

  function sonidoActivo() { return TT.state.get().isSoundEnabled; }

  /**
   * @param {Object} [opciones] { onOpenChange }
   * @returns {{desmontar: Function}}
   */
  function montar(opciones) {
    opciones = opciones || {};

    var visible = false;
    try {
      visible = TT.platform.esIOS() && !TT.platform.esStandalone() && sessionStorage.getItem(DISMISSED_KEY) !== "true";
    } catch (e) { visible = false; }

    if (!visible) return { desmontar: function () {} };

    if (opciones.onOpenChange) opciones.onOpenChange(true);

    var raiz = document.createElement("div");
    raiz.className = "install-hint-installHint";
    raiz.dataset.appScaled = "";
    document.body.appendChild(raiz);

    var caja = TT.components.simpleDialog.crear({ dialog: "install" });
    raiz.appendChild(caja);

    var pHeading = document.createElement("p");
    pHeading.className = "install-hint-heading";
    pHeading.appendChild(TT.textoASprite("iOS Device Detected", "yellow", true));
    caja.appendChild(pHeading);

    var pBody1 = document.createElement("p");
    pBody1.className = "install-hint-body";
    pBody1.appendChild(TT.textoASprite("For the best mobile experience,", "white", true));
    caja.appendChild(pBody1);

    var pBody2 = document.createElement("p");
    pBody2.className = "install-hint-body";
    pBody2.appendChild(TT.textoASprite("tap 'Share', then 'Add to Home Screen'", "white", true));
    caja.appendChild(pBody2);

    var botonCerrar = document.createElement("button");
    botonCerrar.className = "relative";
    botonCerrar.dataset.focused = "true";
    botonCerrar.appendChild(TT.textoASprite("Close"));
    caja.appendChild(botonCerrar);

    function dismiss() {
      TT.sounds.reproducirSonido("back", sonidoActivo());
      try { sessionStorage.setItem(DISMISSED_KEY, "true"); } catch (e) { /* nada */ }
      if (opciones.onOpenChange) opciones.onOpenChange(false);
      desmontar();
    }
    botonCerrar.addEventListener("click", dismiss);

    var menu = TT.crearMenuCursor({
      layout: [["close"]], selected: "close",
      onSelect: function () {}, onConfirm: dismiss, onBack: dismiss, enabled: true,
    });

    function desmontar() {
      menu.destruir();
      raiz.remove();
    }

    return { desmontar: desmontar };
  }

  TT.components.installHint = { montar: montar };
})();
