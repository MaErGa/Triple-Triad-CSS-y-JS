// js/platform.js
// Qué es la app en la que se está ejecutando y en qué dispositivo.
// Equivale a src/app/utils/platform.ts del proyecto original.
(function () {
  "use strict";

  window.TT = window.TT || {};

  /**
   * Indica si la app se está ejecutando instalada (PWA) en vez de en una
   * pestaña normal del navegador. Dos comprobaciones porque cubren dos
   * épocas distintas: "display-mode: standalone" es el estándar actual
   * (Android y iOS 16.4+); "navigator.standalone" es la propiedad propia
   * de Apple para versiones antiguas de iOS.
   */
  function esStandalone() {
    if (typeof window === "undefined") return false;
    var legado = window.navigator.standalone === true;
    return legado || window.matchMedia("(display-mode: standalone)").matches;
  }

  /**
   * Indica si el dispositivo es un iPhone o iPad.
   * Desde iPadOS 13 un iPad se identifica como "MacIntel" y es
   * indistinguible de un Mac de escritorio solo por user agent, así que
   * también se comprueba maxTouchPoints (un Mac no tiene puntos táctiles;
   * un iPad tiene cinco).
   */
  function esIOS() {
    if (typeof window === "undefined") return false;
    var ua = window.navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  }

  TT.platform = {
    esStandalone: esStandalone,
    esIOS: esIOS,
  };
})();
