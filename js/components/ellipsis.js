// js/components/ellipsis.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /** @returns {HTMLSpanElement} un <span> con su propio temporizador interno */
  function crear() {
    var raiz = document.createElement("span");
    raiz.className = "ellipsis-ellipsis";

    var puntos = [1, 2, 3].map(function (paso) {
      var span = document.createElement("span");
      span.dataset.shown = "true";
      span.appendChild(TT.textoASprite("."));
      raiz.appendChild(span);
      return span;
    });

    var contador = 3;
    var intervalo = setInterval(function () {
      contador = (contador % 3) + 1;
      puntos.forEach(function (span, i) {
        span.dataset.shown = (i + 1 <= contador) ? "true" : "false";
      });
    }, 500);

    raiz._destruirEllipsis = function () { clearInterval(intervalo); };
    return raiz;
  }

  function destruir(el) {
    if (el && el._destruirEllipsis) el._destruirEllipsis();
  }

  TT.components.ellipsis = { crear: crear, destruir: destruir };
})();
