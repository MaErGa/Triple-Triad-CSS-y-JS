// js/cardPacks.js
// El sobre de cartas: qué contiene, qué probabilidad tiene cada carta y
// cuándo toca el siguiente. Equivale a src/app/utils/cardPacks.ts.
(function () {
  "use strict";

  window.TT = window.TT || {};

  var cartas = TT_DATA.cards;
  var jugadores = TT_DATA.players;

  /** Cuántas cartas trae un sobre. */
  var TAMANO_SOBRE = 5;

  /**
   * A partir de este nivel (incluido) un sobre nunca entrega una carta que
   * el jugador ya tiene, como regla, no como preferencia.
   */
  var SIN_DUPLICADOS_DESDE_NIVEL = 8;

  /**
   * Horas entre sobres. Con 6 horas son 4 sobres al día; completar el fondo
   * de 81 sobres necesarios lleva unas tres semanas.
   * No lo reduzcas a segundos para pruebas: readNextPackAt descarta
   * cualquier fecha guardada más lejana que el propio cooldown (para
   * protegerse de un reloj manipulado), así que con un cooldown minúsculo
   * cualquier nextPackAt escrito a mano se leería como "ya disponible".
   */
  var HORAS_COOLDOWN_SOBRE = 6;

  /** Cuánto tiempo pasa tras abrir un sobre hasta que toca el siguiente. */
  var MS_COOLDOWN_SOBRE = HORAS_COOLDOWN_SOBRE * 60 * 60 * 1000;

  /** Cuándo se desbloquea el próximo sobre (epoch ms). Sin valor = ya. */
  var CLAVE_ALMACENAMIENTO = "nextPackAt";

  /**
   * Las cartas que ya se pueden ganar jugando contra algún NPC no aparecen
   * en los sobres: el sentido de la colección es recorrer el mundo y
   * ganarle la carta a quien la lleva. Se excluyen todas las cartas que
   * lleva algún jugador en su mano o como carta rara (estén "activos" o
   * no: "active" indica si el rival está disponible ahora mismo, no si su
   * carta cuenta). El "rareCard": "Any" del CC Group no excluye nada: al
   * convertirlo con Number() da NaN y nunca se añade como carta rara.
   */
  var idsCartasRaras = jugadores
    .map(function (j) { return j.rareCard; })
    .filter(function (rc) { return typeof rc === "number"; });

  var obtenibleDeJugadores = new Set(
    jugadores.reduce(function (acc, j) { return acc.concat(j.cards); }, []).concat(idsCartasRaras)
  );

  /** El muro (nivel 0) tampoco entra: no es una carta coleccionable. */
  var poolSobres = cartas.filter(function (c) {
    return c.level > 0 && !obtenibleDeJugadores.has(c.id);
  });

  var PESOS_ESTANDAR = {
    1: 1800, 2: 1800, 3: 1700, 4: 1500, 5: 1300,
    6: 800, 7: 500, 8: 250, 9: 130, 10: 60,
  };

  var PESOS_DESTACADO = {
    6: 500, 7: 270, 8: 150, 9: 60, 10: 20,
  };

  function porNivel(nivel) {
    return poolSobres.filter(function (c) { return c.level === nivel; });
  }

  function tirarNivel(pesos) {
    var entradas = Object.entries(pesos);
    var total = entradas.reduce(function (s, e) { return s + e[1]; }, 0);
    var tirada = Math.random() * total;
    for (var i = 0; i < entradas.length; i++) {
      tirada -= entradas[i][1];
      if (tirada < 0) return Number(entradas[i][0]);
    }
    return Number(entradas[entradas.length - 1][0]);
  }

  function elegirUno(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
  }

  /**
   * Una carta de un nivel dado: algo nuevo si queda algo nuevo.
   * Por debajo del nivel 8 es preferencia (nuevo primero, repetida si no
   * queda nada nuevo en la banda). Desde el nivel 8 es absoluto: si todo lo
   * de esa banda ya se tiene, se baja de nivel y se reintenta, en vez de
   * entregar una copia.
   */
  function extraerDeNivel(nivel, usadas, poseidas) {
    for (var actual = nivel; actual >= 1; actual--) {
      var sinUsar = porNivel(actual).filter(function (c) { return !usadas.has(c.id); });
      if (!sinUsar.length) continue;

      var noPoseidas = sinUsar.filter(function (c) { return !poseidas[c.id]; });
      if (noPoseidas.length) return elegirUno(noPoseidas);

      if (actual >= SIN_DUPLICADOS_DESDE_NIVEL) continue;

      return elegirUno(sinUsar);
    }

    var sobrante = poolSobres.filter(function (c) {
      return !usadas.has(c.id) && c.level < SIN_DUPLICADOS_DESDE_NIVEL;
    });
    return sobrante.length ? elegirUno(sobrante) : poolSobres[0];
  }

  /**
   * Los cinco ids de carta que trae un sobre, en el orden en que se revelan
   * (después barajados, para que la carta buena no esté siempre en la
   * última posición).
   */
  function abrirSobre(poseidas) {
    poseidas = poseidas || {};
    var usadas = new Set();

    var sacadas = [];
    for (var slot = 0; slot < TAMANO_SOBRE; slot++) {
      var pesos = (slot === TAMANO_SOBRE - 1) ? PESOS_DESTACADO : PESOS_ESTANDAR;
      var carta = extraerDeNivel(tirarNivel(pesos), usadas, poseidas);
      usadas.add(carta.id);
      sacadas.push(carta.id);
    }

    for (var i = sacadas.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = sacadas[i]; sacadas[i] = sacadas[j]; sacadas[j] = tmp;
    }

    return sacadas;
  }

  /**
   * Cuándo toca el próximo sobre, o null si ya está disponible.
   * Una fecha guardada más allá del propio cooldown no se acepta.
   */
  function leerProximoSobreEn() {
    if (typeof window === "undefined") return null;
    var guardado = Number(localStorage.getItem(CLAVE_ALMACENAMIENTO));
    if (!guardado || Number.isNaN(guardado)) return null;
    if (guardado <= Date.now()) return null;
    if (guardado > Date.now() + MS_COOLDOWN_SOBRE) return null;
    return guardado;
  }

  function iniciarCooldownSobre() {
    if (typeof window === "undefined") return;
    localStorage.setItem(CLAVE_ALMACENAMIENTO, String(Date.now() + MS_COOLDOWN_SOBRE));
  }

  /** "03:04:59", en cuenta atrás. Todos los campos a dos dígitos. */
  function formatearCuentaAtras(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var horas = Math.floor(total / 3600);
    var minutos = Math.floor((total % 3600) / 60);
    var segundos = total % 60;
    return [horas, minutos, segundos].map(function (p) {
      return String(p).padStart(2, "0");
    }).join(":");
  }

  TT.cardPacks = {
    TAMANO_SOBRE: TAMANO_SOBRE,
    MS_COOLDOWN_SOBRE: MS_COOLDOWN_SOBRE,
    abrirSobre: abrirSobre,
    leerProximoSobreEn: leerProximoSobreEn,
    iniciarCooldownSobre: iniciarCooldownSobre,
    formatearCuentaAtras: formatearCuentaAtras,
  };
})();
