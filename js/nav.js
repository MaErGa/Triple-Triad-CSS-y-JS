// js/nav.js
// Toda la maquinaria de navegación por teclado del juego: el registro que
// conecta el cursor del tablero con las manos (gameNav), el que conecta el
// cursor del menú con la barra de opciones siempre montada (optionsNav), el
// puente para pasar página con el teclado (paginationNav), y los dos
// controladores de cursor genéricos (cursorNav y menuCursor) que cada
// pantalla instancia para sí misma.
(function () {
  "use strict";

  window.TT = window.TT || {};

  // ------------------------------------------------------------------
  // gameNav — equivalente a hooks/gameNav.ts
  // ------------------------------------------------------------------
  (function () {
    var focoActual = null;
    var oyentes = new Set();
    var emitiendo = false;
    var reemitirPendiente = false;

    function emitir() {
      if (emitiendo) { reemitirPendiente = true; return; }
      emitiendo = true;
      do {
        reemitirPendiente = false;
        oyentes.forEach(function (o) { o(); });
      } while (reemitirPendiente);
      emitiendo = false;
    }

    TT.gameNav = {
      actions: {}, // actions.focusHand?: (index) => void

      getFocus: function () { return focoActual; },

      setFocus: function (foco) {
        if (foco === focoActual) return;
        if (foco && focoActual && foco.player === focoActual.player && foco.index === focoActual.index) return;
        focoActual = foco;
        emitir();
      },

      subscribe: function (oyente) {
        oyentes.add(oyente);
        return function () { oyentes.delete(oyente); };
      },
    };
  })();

  // ------------------------------------------------------------------
  // optionsNav — equivalente a hooks/optionsNav.ts
  // ------------------------------------------------------------------
  (function () {
    var indiceEnfocado = null;
    var oyentes = new Set();
    var emitiendo = false;
    var reemitirPendiente = false;

    function emitir() {
      if (emitiendo) { reemitirPendiente = true; return; }
      emitiendo = true;
      do {
        reemitirPendiente = false;
        oyentes.forEach(function (o) { o(); });
      } while (reemitirPendiente);
      emitiendo = false;
    }

    TT.optionsNav = {
      actions: {}, // toggleOptions, toggleCRT, toggleGallery, toggleSound, isOpen, focusOption

      getFocus: function () { return indiceEnfocado; },

      setFocus: function (indice) {
        if (indice === indiceEnfocado) return;
        indiceEnfocado = indice;
        emitir();
      },

      subscribe: function (oyente) {
        oyentes.add(oyente);
        return function () { oyentes.delete(oyente); };
      },
    };
  })();

  // ------------------------------------------------------------------
  // paginationNav — equivalente a hooks/paginationNav.ts
  // ------------------------------------------------------------------
  (function () {
    var registro = new Map();

    TT.paginationNav = {
      register: function (clave, handlers) { registro.set(clave, handlers); },
      unregister: function (clave) { registro.delete(clave); },
      flip: function (clave, direccion) {
        var handlers = registro.get(clave);
        if (!handlers) return false;
        handlers[direccion]();
        return true;
      },
    };
  })();

  // ------------------------------------------------------------------
  // cursorNav — equivalente a hooks/useCursorNav.ts
  //
  // Cursor genérico por "grupos" (listas cuyo tamaño y disposición cada
  // pantalla resuelve con resolveMove). Se usa en el tablero + manos y en
  // pantallas de selección de carta.
  // ------------------------------------------------------------------
  (function () {
    var MAPA_TECLAS = {
      ArrowUp: "up", Numpad8: "up",
      ArrowDown: "down", Numpad2: "down",
      ArrowLeft: "left", Numpad4: "left",
      ArrowRight: "right", Numpad6: "right",
      Enter: "confirm", NumpadEnter: "confirm",
      Space: "cancel", Numpad0: "cancel", Insert: "cancel", Escape: "cancel",
      Backspace: "cancel",
      PageUp: "pageUp", Numpad9: "pageUp",
      PageDown: "pageDown", Numpad3: "pageDown",
    };

    function envolver(indice, delta, tamano) {
      return (indice + delta + tamano) % tamano;
    }

    // Cuando la navegación la dispara el teclado, la superficie de destino
    // arranca con el primer elemento enfocado; con ratón arranca sin cursor.
    var intencionTecladoActiva = false;
    function marcarNavegacionTeclado() { intencionTecladoActiva = true; }
    function consumirIntencionTeclado() {
      var i = intencionTecladoActiva;
      intencionTecladoActiva = false;
      return i;
    }

    function esObjetivoEditable(target) {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable || target.tagName === "TEXTAREA") return true;
      return target instanceof HTMLInputElement && target.type !== "range";
    }

    /**
     * @param {Object} opciones - ver CursorNavOptions original (groups, initial,
     *   fallback, enabled, resolveMove, resolvePageJump, onFocus, onConfirm, onCancel)
     * @returns controlador { getPos, focus, setPosSilently, isFocused, actualizarOpciones, destruir }
     */
    function crearCursorNav(opciones) {
      var pos = consumirIntencionTeclado() ? (opciones.fallback || opciones.initial) : opciones.initial;
      var envioFocoInicialHecho = false;

      var estadoRef = { options: opciones, pos: pos };

      function moveTo(next, silencioso) {
        var opts = estadoRef.options, actual = estadoRef.pos;
        var grupo = null;
        for (var i = 0; i < opts.groups.length; i++) {
          if (opts.groups[i].id === next.group) { grupo = opts.groups[i]; break; }
        }
        if (!grupo || next.index < 0 || next.index >= grupo.size) return;
        if (grupo.isDisabled && grupo.isDisabled(next.index)) return;
        if (actual && actual.group === next.group && actual.index === next.index) return;

        pos = next;
        estadoRef.pos = next;
        if (!silencioso) TT.sounds.reproducirSonido("select", TT.state.get().isSoundEnabled);
        opts.onFocus(next);
      }

      function focus(next) { moveTo(next, false); }

      function setPosSilently(next) {
        pos = next;
        estadoRef.pos = next;
      }

      function isFocused(grupo, indice) {
        return !!pos && pos.group === grupo && pos.index === indice;
      }

      function actualizarOpciones(opcionesParciales) {
        // Fusiona en vez de sustituir: así una pantalla puede actualizar solo
        // "groups"/"enabled" en cada render sin tener que volver a pasar
        // resolveMove/onFocus/onConfirm/onCancel cada vez.
        estadoRef.options = Object.assign({}, estadoRef.options, opcionesParciales);
        // Recorta el cursor si el grupo actual ha encogido por debajo de él
        if (pos) {
          var grupo = null;
          for (var i = 0; i < estadoRef.options.groups.length; i++) {
            if (estadoRef.options.groups[i].id === pos.group) { grupo = estadoRef.options.groups[i]; break; }
          }
          if (grupo && grupo.size > 0 && pos.index >= grupo.size) {
            setPosSilently({ group: pos.group, index: grupo.size - 1 });
          }
        }
      }

      function onKeyDown(e) {
        var opts = estadoRef.options, actual = estadoRef.pos;
        if (!opts.enabled) return;
        if (esObjetivoEditable(e.target)) return;

        var accion = MAPA_TECLAS[e.code];
        if (!accion) return;
        if (e.metaKey || e.altKey || e.ctrlKey) return;

        e.preventDefault();
        if (e.repeat && (accion === "confirm" || accion === "cancel")) return;

        if (accion === "confirm") {
          if (actual) opts.onConfirm(actual);
          else if (opts.fallback) moveTo(opts.fallback, false);
          return;
        }

        if (accion === "cancel") {
          if (opts.onCancel) opts.onCancel();
          return;
        }

        if (!actual) {
          if (opts.fallback) moveTo(opts.fallback, false);
          return;
        }

        var siguiente;
        if (accion === "pageUp" || accion === "pageDown") {
          siguiente = opts.resolvePageJump ? (opts.resolvePageJump(actual, accion) || null) : null;
        } else {
          siguiente = opts.resolveMove(actual, accion, { wrap: envolver });
        }

        if (siguiente === "handled" || !siguiente) return;
        moveTo(siguiente, false);
      }

      window.addEventListener("keydown", onKeyDown);

      // Foco inicial: dispara onFocus una vez sin sonido de cursor.
      if (!envioFocoInicialHecho) {
        envioFocoInicialHecho = true;
        if (estadoRef.pos) estadoRef.options.onFocus(estadoRef.pos);
      }

      return {
        getPos: function () { return pos; },
        focus: focus,
        setPosSilently: setPosSilently,
        isFocused: isFocused,
        actualizarOpciones: actualizarOpciones,
        destruir: function () { window.removeEventListener("keydown", onKeyDown); },
      };
    }

    TT.crearCursorNav = crearCursorNav;
    TT.marcarNavegacionTeclado = marcarNavegacionTeclado;
    TT.consumirIntencionTeclado = consumirIntencionTeclado;
  })();

  // ------------------------------------------------------------------
  // menuCursor — equivalente a hooks/useMenuCursor.ts
  //
  // Flechas, Enter y una forma de volver, para diálogos que son una simple
  // rejilla de opciones. La selección la posee quien llama: este
  // controlador solo interpreta teclas contra el layout dado.
  // ------------------------------------------------------------------
  (function () {
    function buscar(layout, id) {
      for (var fila = 0; fila < layout.length; fila++) {
        var col = layout[fila].indexOf(id);
        if (col !== -1) return { row: fila, col: col };
      }
      return null;
    }

    function acotar(valor, max) {
      return Math.max(0, Math.min(valor, max));
    }

    /**
     * @param {Object} opciones - { layout, selected, onSelect, onConfirm, onBack, enabled, claimsBackspace }
     * @returns controlador { actualizar(nuevasOpciones), destruir() }
     */
    function crearMenuCursor(opciones) {
      var estado = opciones;
      var activo = opciones.enabled !== false;

      function onKey(event) {
        if (!activo) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        var grid = estado.layout, actual = estado.selected;
        if (!grid.length) return;

        var at = buscar(grid, actual) || { row: 0, col: 0 };
        function mover(fila, col) {
          var filaSig = acotar(fila, grid.length - 1);
          var colSig = acotar(col, grid[filaSig].length - 1);
          var id = grid[filaSig][colSig];
          if (id && id !== actual) estado.onSelect(id);
        }

        switch (event.key) {
          case "ArrowUp": event.preventDefault(); mover(at.row - 1, at.col); return;
          case "ArrowDown": event.preventDefault(); mover(at.row + 1, at.col); return;
          case "ArrowLeft": event.preventDefault(); mover(at.row, at.col - 1); return;
          case "ArrowRight": event.preventDefault(); mover(at.row, at.col + 1); return;
          case "Enter": event.preventDefault(); estado.onConfirm(actual); return;
          case "Escape": event.preventDefault(); if (estado.onBack) estado.onBack(); return;
          case "Backspace":
            if (estado.claimsBackspace && estado.claimsBackspace()) return;
            event.preventDefault();
            if (estado.onBack) estado.onBack();
            return;
        }
      }

      window.addEventListener("keydown", onKey);

      return {
        actualizar: function (nuevasOpciones) {
          estado = nuevasOpciones;
          activo = nuevasOpciones.enabled !== false;
        },
        destruir: function () { window.removeEventListener("keydown", onKey); },
      };
    }

    TT.crearMenuCursor = crearMenuCursor;
  })();
})();
