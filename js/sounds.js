// js/sounds.js
// Audio del juego.
//
// Dos caminos, porque los archivos se dividen en dos grupos muy distintos.
//
// Los efectos cortos pasan por la Web Audio API. Decodificar cada clip una
// sola vez y disparar un buffer source por reproducción evita que el click
// y el sonido se desincronicen en iOS, evita que Safari descarte sonidos
// lanzados fuera de un gesto del usuario, y evita que dos reproducciones
// del mismo efecto se pisen.
//
// La música y el sonido de victoria se quedan en un <audio>: son 4.5MB y
// 2.2MB, y decodificarlos a un AudioBuffer costaría decenas de MB de
// memoria retenidos toda la sesión. Un <audio> los va transmitiendo, y la
// música de fondo no necesita precisión de muestra.
// Equivale a src/app/utils/sounds.ts.
(function () {
  "use strict";

  window.TT = window.TT || {};

  var SRC = "./assets/audio/";

  var ARCHIVOS = {
    select: "select.mp3",
    flip: "flip.mp3",
    place: "place.mp3",
    error: "error.mp3",
    spin: "spin.mp3",
    back: "back.mp3",
    success: "success.mp3",
    victory: "victory.mp3",
    bgm: "bgm.mp3",
  };

  /** Los suficientemente pequeños para merecer la pena tenerlos decodificados en memoria. */
  var EFECTOS = ["select", "flip", "place", "error", "spin", "back", "success"];
  function esEfecto(nombre) { return EFECTOS.indexOf(nombre) !== -1; }

  var VOLUMEN = 0.2;

  /** Colapsa en una sola reproducción el mismo clip disparado dos veces por una interacción. */
  var DEDUPE_MS = 20;

  var contexto = null;
  var contextoNoDisponible = false;

  /**
   * Si ya ha ocurrido un gesto del usuario. Hasta que ocurra uno, un sonido
   * iniciado contra un contexto suspendido no se descarta: queda programado,
   * y toda la cola se dispara de golpe cuando el contexto se reanuda.
   */
  var gestoVisto = false;

  var buffers = new Map();
  var cargando = new Map();
  var ultimaReproduccion = new Map();

  /** Elementos cuyo play() fue rechazado por la política de autoplay, a la espera de un gesto. */
  var bloqueados = new Map();

  /**
   * Las pistas largas que el juego pretende tener sonando ahora mismo, y las
   * que están en pausa porque la app pasó a segundo plano.
   */
  var sonando = new Set();
  var pausadoPorFondo = new Map();

  /** El origen (src) de cada elemento liberado, para restaurarlo al volver. */
  var srcLiberado = new WeakMap();

  /**
   * Suelta el hardware de audio en vez de solo pausar. En iOS un elemento en
   * pausa sigue siendo el "medio actual" en la pantalla de bloqueo. Vaciar el
   * src y recargar es lo que realmente lo libera.
   */
  function liberar(audio) {
    var src = audio.currentSrc || audio.src;
    if (src) srcLiberado.set(audio, src);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  function restaurar(audio) {
    var src = srcLiberado.get(audio);
    if (!src || audio.getAttribute("src")) return;
    audio.src = src;
    audio.load();
  }

  /**
   * Elementos que el juego detuvo a propósito. pause() rechaza la promesa de
   * play() que estuviera en curso, y ese rechazo llega después de registrar la
   * parada, así que sin esta marca una pista detenida a propósito se
   * reencolaría y volvería a sonar más tarde encima de lo que suene entonces.
   */
  var detenidos = new WeakSet();

  function obtenerContexto() {
    if (contexto || contextoNoDisponible) return contexto;
    if (typeof window === "undefined") return null;

    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      contextoNoDisponible = true;
      return null;
    }

    contexto = new Ctor();
    precargar();
    return contexto;
  }

  /**
   * Bajo file:// (doble clic en index.html) el navegador bloquea fetch()
   * para el esquema "file", así que la descarga de abajo fallaba en
   * silencio y ningún efecto corto llegaba a decodificarse. data/sfx.js
   * embebe esos mismos 7 clips en base64 (window.TT_SFX); esto los
   * convierte en el ArrayBuffer que decodeAudioData espera.
   */
  function base64ABuffer(base64) {
    var binario = atob(base64);
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes.buffer;
  }

  function cargar(nombre) {
    var existente = cargando.get(nombre);
    if (existente) return existente;

    var peticion = (function () {
      var ctx = obtenerContexto();
      if (!ctx) return Promise.resolve();

      var embebido = window.TT_SFX && window.TT_SFX[nombre];
      var obtenerArrayBuffer = embebido
        ? Promise.resolve(base64ABuffer(embebido))
        : fetch(SRC + ARCHIVOS[nombre]).then(function (resp) { return resp.arrayBuffer(); });

      return obtenerArrayBuffer
        .then(function (encoded) {
          return new Promise(function (resolve, reject) {
            ctx.decodeAudioData(encoded, resolve, reject);
          });
        })
        .then(function (decoded) {
          buffers.set(nombre, decoded);
        });
    })().catch(function () {
      // Un clip que no decodifica debe costar silencio, no un error.
      cargando.delete(nombre);
    });

    cargando.set(nombre, peticion);
    return peticion;
  }

  /** Decodifica los efectos por adelantado, para que ninguna reproducción concreta pague la carga. */
  function precargar() {
    EFECTOS.forEach(cargar);
  }

  function iniciarEfecto(nombre, esBucle) {
    var ctx = obtenerContexto();
    var buffer = ctx && buffers.get(nombre);
    if (!ctx || !buffer) return;

    var source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = esBucle;

    var gain = ctx.createGain();
    gain.gain.value = VOLUMEN;

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);

    source.onended = function () {
      source.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Arranca un elemento y solo lo recuerda si fue la política de autoplay la
   * que lo rechazó (NotAllowedError). Un AbortError significa que nuestro
   * propio pause() interrumpió esta reproducción, y no debe reintentarse.
   */
  function iniciarElemento(audio, esBucle) {
    detenidos.delete(audio);
    sonando.add(audio);

    audio.loop = esBucle;
    audio.preload = "auto";
    audio.volume = VOLUMEN;

    if (!audio.paused) return;

    // Antes del primer gesto, ni se pregunta: el autoplay con sonido se
    // rechaza siempre. Se difiere para que el elemento no avance nada antes
    // de poder oírse; unlock() lo arranca desde el principio.
    if (!gestoVisto) {
      audio.currentTime = 0;
      bloqueados.set(audio, esBucle);
      return;
    }

    audio.play().then(
      function () { bloqueados.delete(audio); },
      function (error) {
        var nombre = error && error.name;
        if (nombre === "NotAllowedError" && !detenidos.has(audio)) bloqueados.set(audio, esBucle);
      }
    );
  }

  /**
   * Safari arranca el contexto suspendido y solo lo reanuda dentro de un
   * gesto del usuario. La fuente silenciosa de un frame es lo que convence a
   * iOS antiguo de que el contexto está realmente respaldado por un gesto.
   */
  function desbloquear() {
    gestoVisto = true;

    var ctx = obtenerContexto();
    if (!ctx) {
      if (dejarDeEscuchar) dejarDeEscuchar();
    } else if (ctx.state === "running") {
      if (dejarDeEscuchar) dejarDeEscuchar();
    } else {
      ctx.resume().then(function () {
        if (ctx.state === "running" && dejarDeEscuchar) dejarDeEscuchar();
      });
    }

    if (ctx) {
      var source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      source.connect(ctx.destination);
      source.start(0);
    }

    var esperando = Array.from(bloqueados.entries());
    bloqueados.clear();
    esperando.forEach(function (entrada) {
      var audio = entrada[0], esBucle = entrada[1];
      if (audio.paused && !detenidos.has(audio)) iniciarElemento(audio, esBucle);
    });
  }

  /** Solo estos cuentan como gesto de activación (un hover no lo es). */
  var GESTOS = ["pointerdown", "touchend", "keydown"];

  /**
   * Retira los listeners de gesto cuando el contexto queda "running", no
   * cuando llega el primer gesto: si uno solo no basta, otro lo reintenta.
   */
  var dejarDeEscuchar = null;

  function armarDesbloqueo() {
    if (dejarDeEscuchar) return;

    var onGesto = function () { desbloquear(); };
    GESTOS.forEach(function (tipo) {
      window.addEventListener(tipo, onGesto, { passive: true });
    });

    dejarDeEscuchar = function () {
      GESTOS.forEach(function (tipo) { window.removeEventListener(tipo, onGesto); });
      dejarDeEscuchar = null;
    };
  }

  if (typeof window !== "undefined") {
    armarDesbloqueo();

    // iOS suspende el audio al pasar a segundo plano (o con una llamada
    // entrante). Volver necesita un gesto nuevo, así que los listeners se
    // vuelven a armar en vez de ser cosa de una sola vez.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") {
        sonando.forEach(function (audio) {
          if (!audio.paused) {
            pausadoPorFondo.set(audio, audio.loop);
            liberar(audio);
          }
        });
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
        return;
      }

      var reanudando = Array.from(pausadoPorFondo.entries());
      pausadoPorFondo.clear();
      reanudando.forEach(function (entrada) {
        var audio = entrada[0], esBucle = entrada[1];
        if (detenidos.has(audio)) return;
        restaurar(audio);
        iniciarElemento(audio, esBucle);
      });

      if (contexto && contexto.state !== "running") {
        gestoVisto = false;
        armarDesbloqueo();
      }
    });
  }

  /** Construye el elemento para una pista larga. Uno por llamador, guardado en una referencia. */
  function cargarSonido(sonido) {
    if (typeof window === "undefined") return;
    return new Audio(SRC + ARCHIVOS[sonido]);
  }

  function reproducirSonidoCargado(audio, sonidoActivado, esBucle) {
    if (!sonidoActivado || !audio) return;
    iniciarElemento(audio, !!esBucle);
  }

  function detenerSonidoCargado(audio) {
    if (!audio) return;
    detenidos.add(audio);
    bloqueados.delete(audio);
    sonando.delete(audio);
    pausadoPorFondo.delete(audio);
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
  }

  /** Reproduce un efecto corto (o, si no lo es, una pista larga vía cargarSonido). */
  function reproducirSonido(nombreSonido, sonidoActivado, esBucle) {
    esBucle = !!esBucle;
    if (!sonidoActivado) return;

    if (!esEfecto(nombreSonido)) {
      var audio = cargarSonido(nombreSonido);
      if (audio) iniciarElemento(audio, esBucle);
      return;
    }

    // No construir el contexto antes de un gesto: se crea dentro del
    // handler de desbloqueo, el único punto garantizado por un gesto.
    if (!gestoVisto && !contexto) return;

    var ctx = obtenerContexto();
    if (!ctx) return;

    if (ctx.state !== "running" && !gestoVisto) return;

    var ahora = performance.now();
    var anterior = ultimaReproduccion.has(nombreSonido) ? ultimaReproduccion.get(nombreSonido) : -Infinity;
    if (ahora - anterior < DEDUPE_MS) return;
    ultimaReproduccion.set(nombreSonido, ahora);

    var reproducir = function () {
      if (buffers.has(nombreSonido)) {
        iniciarEfecto(nombreSonido, esBucle);
        return;
      }
      cargar(nombreSonido).then(function () { iniciarEfecto(nombreSonido, esBucle); });
    };

    if (ctx.state === "running") {
      reproducir();
      return;
    }

    ctx.resume().then(function () {
      if (ctx.state === "running") reproducir();
    });
  }

  TT.sounds = {
    cargarSonido: cargarSonido,
    reproducirSonidoCargado: reproducirSonidoCargado,
    detenerSonidoCargado: detenerSonidoCargado,
    reproducirSonido: reproducirSonido,
  };
})();
