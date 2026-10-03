// js/main.js
// El punto de entrada de la aplicación. Sustituye a src/app/page.tsx: monta
// y desmonta cada pantalla según el estado, exactamente donde el JSX
// original las condicionaba con &&.
(function () {
  "use strict";
  window.TT = window.TT || {};

  document.addEventListener("DOMContentLoaded", function () {
    TT.state.inicializar();

    var bgm = TT.sounds.cargarSonido("bgm");
    var victorySound = TT.sounds.cargarSonido("victory");

    // --- estado local de interfaz (no vive en TT.state) ---
    var isOptionsOpen = false;
    var confirmingQuit = false;
    var installHintOpen = false;
    var linksOpen = false;
    var mode = null; // null | "single"
    var isPackOpen = false;

    function quitGame() {
      TT.state.dispatch({ type: "RESET_GAME" });
      TT.state.dispatch({ type: "SET_IS_GAME_ACTIVE", payload: false });
      TT.state.dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
      TT.state.dispatch({ type: "SET_IS_MENU_OPEN", payload: true });
      mode = null;
      renderApp();
    }

    // --- sonido ---
    function handleSoundToggle() {
      var estadoJuego = TT.state.get();
      TT.sounds.reproducirSonido("select", !estadoJuego.isSoundEnabled);
      var toggle = !estadoJuego.isSoundEnabled;

      if (!toggle) {
        TT.sounds.detenerSonidoCargado(bgm);
        TT.sounds.detenerSonidoCargado(victorySound);
      } else if (!estadoJuego.winState) {
        TT.sounds.reproducirSonidoCargado(bgm, estadoJuego.isSoundEnabled, true);
      }

      TT.state.dispatch({ type: "SET_IS_SOUND_ENABLED", payload: toggle });
    }

    function handleToggleCardGallery() {
      var estadoJuego = TT.state.get();
      TT.sounds.reproducirSonido("select", estadoJuego.isSoundEnabled);
      TT.state.dispatch({ type: "SET_PREVIEW_CARD_ID", payload: null });
      TT.state.dispatch({ type: "SET_IS_CARD_GALLERY_OPEN", payload: !estadoJuego.isCardGalleryOpen });
      var paginas = Object.assign({}, estadoJuego.currentPages, { cardGallery: 1 });
      TT.state.dispatch({ type: "SET_CURRENT_PAGES", payload: paginas });
    }

    function handleToggleOptions() {
      TT.sounds.reproducirSonido("select", TT.state.get().isSoundEnabled);
      isOptionsOpen = !isOptionsOpen;
      linksOpen = false;
      renderApp();
    }

    function handleToggleScanlines() {
      TT.state.dispatch({ type: "SET_IS_CRT_EFFECT_ACTIVE", payload: !TT.state.get().isCRTEffectActive });
    }

    // --- idioma ---
    function handleToggleLanguage() {
      var estadoJuego = TT.state.get();
      var nuevo = (estadoJuego.idioma === "es") ? "en" : "es";
      TT.sounds.reproducirSonido("select", estadoJuego.isSoundEnabled);
      TT.i18n.guardarIdioma(nuevo);
      TT.state.dispatch({ type: "SET_IDIOMA", payload: nuevo });
      // El idioma no vive en ningún dato que los render() de los
      // componentes ya activos vuelvan a leer por sí solos (a diferencia de
      // isCRTEffectActive o isSoundEnabled, que sí forman parte de lo que
      // cada render() recalcula) — así que los nodos de texto ya montados
      // necesitan que alguien los vuelva a escribir a mano.
      TT.i18n.retraducirTodaLaApp();
    }

    TT.optionsNav.actions.toggleOptions = handleToggleOptions;
    TT.optionsNav.actions.toggleCRT = handleToggleScanlines;
    TT.optionsNav.actions.toggleGallery = handleToggleCardGallery;
    TT.optionsNav.actions.toggleSound = handleSoundToggle;
    TT.optionsNav.actions.toggleLanguage = handleToggleLanguage;
    TT.optionsNav.actions.isOpen = function () { return isOptionsOpen; };

    // --- idioma: dataset en <html>, para el CSS que depende de él (base.css) ---
    TT.state.subscribe(function () {
      document.documentElement.dataset.idioma = TT.state.get().idioma;
    });
    document.documentElement.dataset.idioma = TT.state.get().idioma;

    // --- CRT ---
    TT.state.subscribe(function () {
      document.body.classList.toggle("crt-effect", TT.state.get().isCRTEffectActive);
    });
    document.body.classList.toggle("crt-effect", TT.state.get().isCRTEffectActive);

    // --- música de fondo / fanfarria de victoria ---
    var prevSoundDeps = null;
    var victoryEndedHandler = null;
    function efectoMusica() {
      var estadoJuego = TT.state.get();
      var deps = JSON.stringify([estadoJuego.isSoundEnabled, estadoJuego.isGameActive, estadoJuego.winState]);
      if (deps === prevSoundDeps) return;
      prevSoundDeps = deps;

      if (victoryEndedHandler) { victorySound.removeEventListener("ended", victoryEndedHandler); victoryEndedHandler = null; }
      if (estadoJuego.winState) return;

      if (estadoJuego.isGameActive) {
        TT.sounds.detenerSonidoCargado(victorySound);
        TT.sounds.reproducirSonidoCargado(bgm, estadoJuego.isSoundEnabled, true);
        return;
      }

      if (victorySound && !victorySound.paused) {
        victoryEndedHandler = function () { TT.sounds.reproducirSonidoCargado(bgm, TT.state.get().isSoundEnabled, true); };
        victorySound.addEventListener("ended", victoryEndedHandler, { once: true });
        return;
      }

      TT.sounds.reproducirSonidoCargado(bgm, estadoJuego.isSoundEnabled, true);
    }

    // ------------------------------------------------------------------
    // Escalado responsive (scaleApp) — definido aquí, pero no se ejecuta
    // hasta que #app y #modal existan (ver setupScaleApp() más abajo).
    // ------------------------------------------------------------------
    function setupScaleApp(app, modal) {
      var MOBILE_MAX_SHORT_SIDE = 500;
      var DESKTOP = [950, 750];
      var MOBILE = [900, 640];
      var MOBILE_PORTRAIT = [680, 900];

      function scaleApp() {
        var windowWidth = document.documentElement.clientWidth;
        var windowHeight = document.documentElement.clientHeight;

        var onPhone = Math.min(windowWidth, windowHeight) < MOBILE_MAX_SHORT_SIDE;
        var override = (typeof window.__canvas !== "undefined") ? window.__canvas : undefined;
        var portrait = windowHeight > windowWidth;
        var dimensiones = override || (onPhone ? (portrait ? MOBILE_PORTRAIT : MOBILE) : DESKTOP);
        var originalWidth = dimensiones[0], originalHeight = dimensiones[1];

        var scale = Math.min(windowWidth / originalWidth, windowHeight / originalHeight);
        app.style.zoom = String(scale);
        modal.style.zoom = String(scale);

        document.documentElement.style.setProperty("--app-scale", String(scale));
        document.documentElement.dataset.phone = onPhone ? "true" : "false";
        document.documentElement.dataset.stacked = (onPhone && portrait) ? "true" : "false";
      }

      function preventGesture(event) { event.preventDefault(); }
      function preventPinch(event) { if (event.touches.length > 1) event.preventDefault(); }

      window.addEventListener("load", scaleApp);
      window.addEventListener("resize", scaleApp);
      document.addEventListener("gesturestart", preventGesture);
      document.addEventListener("gesturechange", preventGesture);
      document.addEventListener("touchmove", preventPinch, { passive: false });
      scaleApp();
    }

    // ------------------------------------------------------------------
    // Montaje / desmontaje condicional de pantallas
    // ------------------------------------------------------------------
    var montados = {};
    function condicional(clave, condicion, montar) {
      var existente = montados[clave];
      if (condicion && !existente) {
        montados[clave] = montar();
      } else if (!condicion && existente) {
        if (existente.desmontar) existente.desmontar();
        delete montados[clave];
      }
    }

    var raizApp = document.getElementById("app-root");

    var app = document.createElement("div");
    app.id = "app";
    app.className = "max-w-4xl w-full h-full m-auto relative";
    raizApp.appendChild(app);

    var innerDiv = document.createElement("div");
    app.appendChild(innerDiv);

    var filaJuego = document.createElement("div");
    filaJuego.className = "flex h-full justify-center";
    app.appendChild(filaJuego);

    var handRoja = document.createElement("div");
    handRoja.className = "order-1 flex items-center justify-center w-[150px] flex-shrink-0";
    filaJuego.appendChild(handRoja);
    TT.components.hand.montar(handRoja, "red");

    var handAzul = document.createElement("div");
    handAzul.className = "order-3 flex items-center justify-center w-[150px] flex-shrink-0";
    filaJuego.appendChild(handAzul);
    TT.components.hand.montar(handAzul, "blue");

    var boardSlot = document.createElement("div");
    boardSlot.style.display = "contents";
    filaJuego.appendChild(boardSlot);
    TT.components.board.montar(boardSlot);

    var modal = document.createElement("div");
    modal.id = "modal";
    raizApp.appendChild(modal);

    setupScaleApp(app, modal);

    // Notice (montado una sola vez, siempre presente)
    TT.components.notice.montar(raizApp);

    // renderApp() puede llamarse tanto desde una suscripción a TT.state
    // (que ya se protege a sí misma contra reentradas — ver state.js) como
    // directamente desde un manejador de clic (p.ej. el botón del sobre).
    // En ese segundo caso, si el cuerpo de renderApp() monta un componente
    // cuyo propio constructor hace un primer dispatch(), ese dispatch
    // reentra en renderApp() ANTES de que la llamada exterior haya
    // terminado de montar nada — así que "montados.X" todavía no existe y
    // el componente se monta dos veces. Se aplana igual que en state.js.
    var renderizando = false;
    var reRenderPendiente = false;

    function renderApp() {
      if (renderizando) { reRenderPendiente = true; return; }
      renderizando = true;
      do {
        reRenderPendiente = false;
        renderAppInner();
      } while (reRenderPendiente);
      renderizando = false;
    }

    function renderAppInner() {
      var estadoJuego = TT.state.get();

      efectoMusica();

      app.dataset.screen = (estadoJuego.isMenuOpen && mode === null) ? "mode" : "";
      if (!app.dataset.screen) delete app.dataset.screen;

      condicional("cardGallery", estadoJuego.isCardGalleryOpen, function () {
        var slot = document.createElement("div");
        slot.id = "gallery-slot";
        app.insertBefore(slot, app.firstChild);
        var comp = TT.components.cardGallery.montar(slot);
        return { desmontar: function () { comp.desmontar(); slot.remove(); } };
      });

      condicional("modeDialog", estadoJuego.isMenuOpen && mode === null, function () {
        return TT.components.modeDialog.montar(innerDiv, {
          onSingle: function () { mode = "single"; renderApp(); },
          cursorEnabled: !installHintOpen,
          linksOpen: linksOpen,
          onLinksToggle: function () { linksOpen = !linksOpen; isOptionsOpen = false; renderApp(); },
        });
      });
      if (montados.modeDialog && montados.modeDialog.actualizar) {
        montados.modeDialog.actualizar({ cursorEnabled: !installHintOpen, linksOpen: linksOpen });
      }

      condicional("menuDialog", estadoJuego.isMenuOpen && mode === "single", function () {
        return TT.components.menuDialog.montar(innerDiv, { onQuit: function () { mode = null; renderApp(); } });
      });

      condicional("cardSelection", estadoJuego.isCardSelectionOpen, function () {
        return TT.components.cardSelectionDialog.montar(innerDiv, {});
      });

      condicional("winDialog", !!estadoJuego.winState && !estadoJuego.isRewardSelectionOpen, function () {
        return TT.components.winDialog.montar(app, { victorySound: victorySound, bgm: bgm });
      });

      condicional("rewardSelection", estadoJuego.isRewardSelectionOpen, function () {
        return TT.components.rewardSelectionDialog.montar(app, { victorySound: victorySound, bgm: bgm });
      });

      condicional("packDialog", isPackOpen, function () {
        return TT.components.packDialog.montar(app, { onClose: function () { isPackOpen = false; renderApp(); } });
      });

      // --- Furniture: botón de sobre ---
      condicional("packButton", estadoJuego.isMenuOpen && !estadoJuego.isCardSelectionOpen &&
        !estadoJuego.isCardGalleryOpen && !estadoJuego.isGameActive && !isPackOpen, function () {
          var f = TT.crearFurniture("fixed left-[var(--furniture-gap)] top-[var(--furniture-gap)] text-3xl z-10");
          var comp = TT.components.packButton.montar(f, { onOpen: function () { isPackOpen = true; renderApp(); } });
          return { desmontar: function () { comp.desmontar(); f.remove(); } };
        });

      // --- InstallHint (solo pantalla de título) ---
      condicional("installHint", estadoJuego.isMenuOpen && mode === null, function () {
        return TT.components.installHint.montar({ onOpenChange: function (open) { installHintOpen = open; renderApp(); } });
      });

      // --- Furniture: caja Quit + confirmación ---
      condicional("quitBox", estadoJuego.isGameActive && !estadoJuego.isRewardSelectionOpen, function () {
        var f = TT.crearFurniture("fixed left-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-10");
        var caja = TT.components.simpleDialog.crear({ metaTitle: null, dialog: "quit" });
        var boton = document.createElement("button");
        boton.appendChild(TT.textoASprite("Quit"));
        boton.addEventListener("click", function () {
          TT.sounds.reproducirSonido("select", TT.state.get().isSoundEnabled);
          confirmingQuit = true;
          renderApp();
        });
        caja.appendChild(boton);
        f.appendChild(caja);
        return { desmontar: function () { f.remove(); } };
      });
      condicional("confirmQuit", confirmingQuit && estadoJuego.isGameActive && !estadoJuego.isRewardSelectionOpen, function () {
        return TT.components.confirmationDialog.montar({
          onConfirm: function () { confirmingQuit = false; quitGame(); },
          onDeny: function () { TT.sounds.reproducirSonido("back", TT.state.get().isSoundEnabled); confirmingQuit = false; renderApp(); },
        });
      });

      // --- Furniture: Home (menú de un jugador) ---
      condicional("homeSingle", estadoJuego.isMenuOpen && mode === "single" && !estadoJuego.isCardSelectionOpen && !estadoJuego.isGameActive, function () {
        var f = TT.crearFurniture("fixed left-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-10");
        var caja = TT.components.simpleDialog.crear({ metaTitle: null, dialog: "quit" });
        var boton = document.createElement("button");
        boton.appendChild(TT.textoASprite("Home"));
        boton.addEventListener("click", function () {
          TT.sounds.reproducirSonido("back", TT.state.get().isSoundEnabled);
          mode = null; renderApp();
        });
        caja.appendChild(boton);
        f.appendChild(caja);
        return { desmontar: function () { f.remove(); } };
      });

      renderOptionsBar();
    }

    // --- Furniture: barra de opciones (siempre montada) ---
    var optionsFurniture = TT.crearFurniture("fixed right-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-[11] flex items-center");
    var optionsBox = TT.components.simpleDialog.crear({ metaTitle: null, dialog: "options" });
    optionsFurniture.appendChild(optionsBox);
    var optionsInner = document.createElement("div");
    optionsInner.className = "flex items-center h-full";
    optionsBox.appendChild(optionsInner);

    function iconoOpcion(src, onClick, indice) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = "Card Icon";
      img.width = 27; img.height = 27;
      img.className = "my-0 mx-1 h-full";
      img.addEventListener("click", onClick);
      img.addEventListener("mouseenter", function () { if (TT.optionsNav.actions.focusOption) TT.optionsNav.actions.focusOption(indice); });
      return img;
    }

    var imgExpand = iconoOpcion("./assets/menu-expand.png", handleToggleOptions, 0);
    optionsInner.appendChild(imgExpand);
    var imgScreen = iconoOpcion("./assets/screenicon.png", handleToggleScanlines, 1);
    optionsInner.appendChild(imgScreen);
    var imgCard = iconoOpcion("./assets/cardicon.png", handleToggleCardGallery, 2);
    optionsInner.appendChild(imgCard);

    var soundDiv = document.createElement("div");
    soundDiv.className = "flex items-center m-0 h-full";
    soundDiv.addEventListener("click", handleSoundToggle);
    soundDiv.addEventListener("mouseenter", function () { if (TT.optionsNav.actions.focusOption) TT.optionsNav.actions.focusOption(3); });
    var spanSound = document.createElement("span");
    spanSound.className = "ml-3 mr-3";
    spanSound.appendChild(TT.textoASprite("Sound"));
    soundDiv.appendChild(spanSound);
    var estadoSoundDiv = document.createElement("div");
    estadoSoundDiv.className = "flex items-center";
    var spanOn = document.createElement("span");
    spanOn.className = "mr-3";
    spanOn.appendChild(TT.textoASprite("ON"));
    var spanOff = document.createElement("span");
    spanOff.className = "mr-1";
    spanOff.appendChild(TT.textoASprite("OFF"));
    estadoSoundDiv.appendChild(spanOn);
    estadoSoundDiv.appendChild(spanOff);
    soundDiv.appendChild(estadoSoundDiv);
    optionsInner.appendChild(soundDiv);

    var langDiv = document.createElement("div");
    langDiv.className = "flex items-center m-0 h-full";
    langDiv.addEventListener("click", handleToggleLanguage);
    langDiv.addEventListener("mouseenter", function () { if (TT.optionsNav.actions.focusOption) TT.optionsNav.actions.focusOption(4); });
    var estadoLangDiv = document.createElement("div");
    estadoLangDiv.className = "flex items-center";
    var spanEs = document.createElement("span");
    spanEs.className = "mr-3";
    spanEs.appendChild(TT.textoASprite("ES"));
    var spanEn = document.createElement("span");
    spanEn.className = "mr-1";
    spanEn.appendChild(TT.textoASprite("EN"));
    estadoLangDiv.appendChild(spanEs);
    estadoLangDiv.appendChild(spanEn);
    langDiv.appendChild(estadoLangDiv);
    optionsInner.appendChild(langDiv);

    function renderOptionsBar() {
      var estadoJuego = TT.state.get();
      var foco = TT.optionsNav.getFocus();
      optionsBox.dataset.expanded = String(isOptionsOpen);
      imgExpand.dataset.focused = String(foco === 0);
      imgScreen.dataset.focused = String(foco === 1);
      imgScreen.dataset.selected = String(estadoJuego.isCardGalleryOpen);
      imgCard.dataset.focused = String(foco === 2);
      imgCard.dataset.selected = String(estadoJuego.isCardGalleryOpen);
      soundDiv.dataset.focused = String(foco === 3);
      spanOn.className = (!estadoJuego.isSoundEnabled ? "opacity-50 " : "") + "mr-3";
      spanOff.className = (estadoJuego.isSoundEnabled ? "opacity-50 " : "") + "mr-1";
      langDiv.dataset.focused = String(foco === 4);
      spanEs.className = (estadoJuego.idioma !== "es" ? "opacity-50 " : "") + "mr-3";
      spanEn.className = (estadoJuego.idioma !== "en" ? "opacity-50 " : "") + "mr-1";
    }

    TT.optionsNav.subscribe(renderOptionsBar);

    TT.state.subscribe(renderApp);
    renderApp();
  });
})();
