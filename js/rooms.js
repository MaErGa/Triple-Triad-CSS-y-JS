// js/rooms.js
// Comunicación con game.php.
//
// Cada llamada es un pequeño POST o GET que devuelve JSON. Este módulo no
// conoce las reglas del Triple Triad: solo mueve mensajes; el juego decide
// qué significan. Lo único que guarda es el "asiento" (código de sala, token
// secreto y de qué lado estás) en localStorage, para que un refresco de
// página te reincorpore a la partida en la que ya estabas.
//
// IMPORTANTE: game.php necesita un servidor con PHP para funcionar
// (Apache/Nginx+PHP-FPM, o `php -S 127.0.0.1:8100` en desarrollo). Abriendo
// index.html con doble clic (file://) el resto del juego funciona con
// normalidad, pero el multijugador no podrá contactar con el servidor.
// Equivale a src/app/utils/rooms.ts.
(function () {
  "use strict";

  window.TT = window.TT || {};

  var ENDPOINT = "./game.php";
  var CLAVE_ALMACENAMIENTO = "multiplayerSession";

  function ErrorSala(message, status) {
    var error = new Error(message);
    error.name = "RoomError";
    error.status = status;
    Object.setPrototypeOf(error, ErrorSala.prototype);
    return error;
  }
  ErrorSala.prototype = Object.create(Error.prototype);

  function salaDesaparecida(problema) {
    return !!problema && problema.name === "RoomError" && problema.status === 404;
  }

  function llamar(action, body, query) {
    body = body || {};
    query = query || "";

    return fetch(ENDPOINT + "?action=" + action + query, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(function () {
      throw ErrorSala("No se pudo contactar con el servidor de la partida.", 0);
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (payload) {
        if (!response.ok || !payload || !payload.ok) {
          var fallback = (response.status === 502 || response.status === 504)
            ? "El servidor de la partida no responde. En desarrollo, comprueba que game.php se está sirviendo con PHP."
            : "No se pudo contactar con el servidor de la partida.";
          throw ErrorSala((payload && payload.error) || fallback, response.status);
        }
        return payload;
      });
    });
  }

  function crearSala(rules) {
    return llamar("create", { rules: rules });
  }

  function unirseASala(code, token) {
    return llamar("join", { code: code, token: token });
  }

  function aceptarReglas(code, token, rulesHash) {
    return llamar("accept", { code: code, token: token, rulesHash: rulesHash });
  }

  function enviarMano(code, token, hand) {
    return llamar("hand", { code: code, token: token, hand: hand });
  }

  function enviarMovimiento(code, token, move) {
    return llamar("move", { code: code, token: token, move: move });
  }

  function iniciarMuerteSubita(code, token) {
    return llamar("sudden", { code: code, token: token });
  }

  function reportarResultado(code, token, winner, score) {
    return llamar("result", { code: code, token: token, winner: winner, score: score });
  }

  function enviarPremios(code, token, picks) {
    return llamar("rewards", { code: code, token: token, picks: picks });
  }

  function pedirRevancha(code, token) {
    return llamar("rematch", { code: code, token: token });
  }

  function abandonarSala(code, token) {
    return llamar("leave", { code: code, token: token });
  }

  /** El sondeo (polling). "since" es cuánto se ha aplicado ya. */
  function consultarEstado(code, token, since) {
    return llamar("state", {}, "&code=" + code + "&token=" + token + "&since=" + since);
  }

  function guardarSesion(session) {
    try {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(session));
    } catch (e) {
      // Un navegador en modo privado que rechace el almacenamiento debe
      // costar una partida reanudable, no la posibilidad de jugar.
    }
  }

  function cargarSesion() {
    try {
      var raw = localStorage.getItem(CLAVE_ALMACENAMIENTO);
      if (!raw) return null;
      var session = JSON.parse(raw);
      return (session && session.code && session.token && session.seat) ? session : null;
    } catch (e) {
      return null;
    }
  }

  function limpiarSesion() {
    try {
      localStorage.removeItem(CLAVE_ALMACENAMIENTO);
    } catch (e) { /* nada que hacer */ }
  }

  /** El código de sala que viaja en un enlace compartido, ej. ...?g=9V7P6 */
  function codigoDesdeUrl() {
    if (typeof window === "undefined") return null;
    var code = new URLSearchParams(window.location.search).get("g");
    return code ? code.toUpperCase() : null;
  }

  function enlaceParaCodigo(code) {
    if (typeof window === "undefined") return "";
    var url = new URL(window.location.href);
    url.search = "?g=" + code;
    url.hash = "";
    return url.toString();
  }

  /** Quita el código de la barra de direcciones una vez usado. */
  function limpiarCodigoUrl() {
    if (typeof window === "undefined") return;
    var url = new URL(window.location.href);
    if (!url.searchParams.has("g")) return;
    url.searchParams.delete("g");
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  TT.rooms = {
    salaDesaparecida: salaDesaparecida,
    crearSala: crearSala,
    unirseASala: unirseASala,
    aceptarReglas: aceptarReglas,
    enviarMano: enviarMano,
    enviarMovimiento: enviarMovimiento,
    iniciarMuerteSubita: iniciarMuerteSubita,
    reportarResultado: reportarResultado,
    enviarPremios: enviarPremios,
    pedirRevancha: pedirRevancha,
    abandonarSala: abandonarSala,
    consultarEstado: consultarEstado,
    guardarSesion: guardarSesion,
    cargarSesion: cargarSesion,
    limpiarSesion: limpiarSesion,
    codigoDesdeUrl: codigoDesdeUrl,
    enlaceParaCodigo: enlaceParaCodigo,
    limpiarCodigoUrl: limpiarCodigoUrl,
  };
})();
