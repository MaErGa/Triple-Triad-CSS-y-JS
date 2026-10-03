// js/components/packButton.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  function sonidoActivo() { return TT.state.get().isSoundEnabled; }

  /**
   * @param {HTMLElement} contenedor
   * @param {Object} opciones { onOpen }
   */
  function montar(contenedor, opciones) {
    var nextPackAt = TT.cardPacks.leerProximoSobreEn();
    var isHovered = false;
    var isFocused = false;
    var now = Date.now();

    var wrap = document.createElement("div");
    wrap.className = "pack-button-wrap";
    contenedor.appendChild(wrap);

    var caja = TT.components.simpleDialog.crear({ metaTitle: null, dialog: "pack" });
    wrap.appendChild(caja);

    var boton = document.createElement("button");
    boton.type = "button";
    boton.className = "pack-button-packButton";
    caja.appendChild(boton);

    var icono = document.createElement("img");
    icono.src = "./assets/cardback.png";
    icono.alt = "";
    icono.width = 27; icono.height = 27;
    icono.className = "pack-button-icon";
    boton.appendChild(icono);

    var timerSpan = document.createElement("span");
    timerSpan.className = "pack-button-timer";
    timerSpan.setAttribute("aria-hidden", "true");
    var chargeSpan = document.createElement("span");
    chargeSpan.className = "pack-button-charge";
    var clockSpan = document.createElement("span");
    clockSpan.className = "pack-button-clock";
    timerSpan.appendChild(chargeSpan);
    timerSpan.appendChild(clockSpan);
    boton.appendChild(timerSpan);

    var readyTimer = null;
    var tickInterval = null;

    function programarListo() {
      window.clearTimeout(readyTimer);
      if (!nextPackAt) return;
      readyTimer = window.setTimeout(function () {
        nextPackAt = null;
        render();
      }, Math.max(0, nextPackAt - Date.now()));
    }

    function programarTick() {
      window.clearInterval(tickInterval);
      var abierto = isHovered || isFocused;
      if (!abierto || !nextPackAt) return;
      now = Date.now();
      tickInterval = window.setInterval(function () { now = Date.now(); render(); }, 1000);
    }

    function handleClick() {
      var isReady = nextPackAt === null;
      if (isReady) {
        TT.sounds.reproducirSonido("select", sonidoActivo());
        opciones.onOpen();
        return;
      }
      TT.sounds.reproducirSonido("error", sonidoActivo());
      boton.focus();
    }

    boton.addEventListener("click", handleClick);
    boton.addEventListener("mouseenter", function () { isHovered = true; render(); programarTick(); });
    boton.addEventListener("mouseleave", function () { isHovered = false; render(); programarTick(); });
    boton.addEventListener("focus", function () { isFocused = true; render(); programarTick(); });
    boton.addEventListener("blur", function () { isFocused = false; render(); programarTick(); });

    function render() {
      var isReady = nextPackAt === null;
      var isOpen = isHovered || isFocused;

      wrap.dataset.ready = String(isReady);
      wrap.dataset.open = String(isOpen);
      caja.dataset.expanded = String(!isReady && isOpen);
      boton.dataset.ready = String(isReady);
      boton.setAttribute("aria-label", isReady ? "Open the card pack" : ("The next card pack is ready in " + TT.cardPacks.formatearCuentaAtras(nextPackAt - now)));

      timerSpan.style.display = isReady ? "none" : "";
      if (!isReady && nextPackAt) {
        var elapsed = TT.cardPacks.MS_COOLDOWN_SOBRE - (nextPackAt - Date.now());
        chargeSpan.style.animationDuration = TT.cardPacks.MS_COOLDOWN_SOBRE + "ms";
        chargeSpan.style.animationDelay = (-elapsed) + "ms";
        clockSpan.innerHTML = "";
        clockSpan.appendChild(TT.textoASprite(TT.cardPacks.formatearCuentaAtras(nextPackAt - now)));
      }
    }

    programarListo();
    render();

    return {
      desmontar: function () {
        window.clearTimeout(readyTimer);
        window.clearInterval(tickInterval);
        wrap.remove();
      },
    };
  }

  TT.components.packButton = { montar: montar };
})();
