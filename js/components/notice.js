// js/components/notice.js
// Se monta una sola vez en el arranque de la app y se muestra/oculta solo
// según TT.multiplayer.get().notice.
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  var LINGER_MS = 4000;

  /**
   * @param {HTMLElement} contenedor donde montar el aviso (normalmente #app o body)
   */
  function montar(contenedor) {
    var raiz = document.createElement("div");
    raiz.className = "notice-notice";
    raiz.style.display = "none";
    contenedor.appendChild(raiz);

    var timer = null;
    var noticeAnterior = null;

    function actualizar() {
      var notice = TT.multiplayer.get().notice;
      if (notice === noticeAnterior) return;
      noticeAnterior = notice;

      raiz.innerHTML = "";
      window.clearTimeout(timer);

      if (!notice) {
        raiz.style.display = "none";
        return;
      }

      raiz.style.display = "";
      raiz.appendChild(TT.components.simpleDialog.crear({ children: TT.textoASprite(notice) }));

      timer = window.setTimeout(function () { TT.multiplayer.clearNotice(); }, LINGER_MS);
    }

    var cancelar = TT.multiplayer.subscribe(actualizar);
    actualizar();

    return {
      desmontar: function () {
        cancelar();
        window.clearTimeout(timer);
        raiz.remove();
      },
    };
  }

  TT.components.notice = { montar: montar };
})();
