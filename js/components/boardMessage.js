// js/components/boardMessage.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /** @param {"same"|"plus"|"combo"} mensaje */
  function crear(mensaje) {
    var img = document.createElement("img");
    img.src = "./assets/plusSame.png";
    img.alt = "message";
    img.width = 500;
    img.height = 84;
    img.className = "board-message-boardMessage board-message-" + mensaje;
    return img;
  }

  TT.components.boardMessage = { crear: crear };
})();
