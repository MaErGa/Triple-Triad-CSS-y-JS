// js/state.js
// El almacén central del estado de la partida: mismas claves y mismo
// reducer que el original (GameReducer.tsx), con un patrón de
// publicación/suscripción en vez de useReducer/Context, y los mismos
// efectos secundarios que vivían en GameContext.tsx (cargar playerCards y
// lostCards de localStorage, activar sonido en la app instalada, sortear
// quién empieza, recalcular currentPlayerCards).
(function () {
  "use strict";

  window.TT = window.TT || {};

  var cartasIniciales = { "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1 };
  var cartaPlaceholder = {
    cardId: 1, uniqueId: null, currentOwner: "red", initialOwner: "red", action: "",
  };
  var manosPlaceholder = new Array(5).fill(cartaPlaceholder);

  function tableroVacio() {
    return [0, 1, 2].map(function () { return [null, null, null]; });
  }

  var initialState = {
    playerCards: cartasIniciales,
    currentPlayerCards: {},
    previewCardId: null,
    playerHand: [],
    currentPlayerHand: [],
    enemyId: 1,
    enemyHand: manosPlaceholder,
    currentEnemyHand: manosPlaceholder,
    lostCards: {},
    winState: null,
    turn: null,
    turnNumber: 1,
    turnState: null,
    score: [5, 5],
    board: tableroVacio(),
    selectedCardId: null,
    selectedRewards: [],
    isMenuOpen: true,
    isCardSelectionOpen: false,
    isCardGalleryOpen: false,
    isRewardSelectionOpen: false,
    isGameActive: false,
    isSoundEnabled: false,
    slideDirection: null,
    currentPages: { players: 1, cards: 1, locations: 1, cardGallery: 1 },
    rules: ["open"],
    tradeRule: "one",
    elements: null,
    isCRTEffectActive: true,
    idioma: "en",
  };

  var estado = Object.assign({}, initialState);
  var oyentes = new Set();

  // Un dispatch disparado DESDE un renderizado que ya está reaccionando a un
  // dispatch anterior (por ejemplo: un componente que al montarse comprueba
  // el estado actual y despacha una corrección) no debe volver a entrar en
  // emitir() mientras el bucle anterior sigue en la pila — eso es una
  // recursión real, no solo trabajo de más. Se aplana en un bucle: si
  // emitir() se llama mientras ya se está emitiendo, se marca una nueva
  // pasada pendiente y se procesa después de que la actual termine.
  var emitiendo = false;
  var reemitirPendiente = false;

  function emitir() {
    if (emitiendo) { reemitirPendiente = true; return; }
    emitiendo = true;
    do {
      reemitirPendiente = false;
      oyentes.forEach(function (o) { o(estado); });
    } while (reemitirPendiente);
    emitiendo = false;
  }

  function reducir(state, action) {
    switch (action.type) {
      case "SET_PLAYER_CARDS": return Object.assign({}, state, { playerCards: action.payload });
      case "SET_CURRENT_PLAYER_CARDS": return Object.assign({}, state, { currentPlayerCards: action.payload });
      case "SET_PLAYER_HAND": return Object.assign({}, state, { playerHand: action.payload });
      case "SET_CURRENT_PLAYER_HAND": return Object.assign({}, state, { currentPlayerHand: action.payload });
      case "SET_PREVIEW_CARD_ID": return Object.assign({}, state, { previewCardId: action.payload });
      case "SET_ENEMY_ID": return Object.assign({}, state, { enemyId: action.payload });
      case "SET_ENEMY_HAND": return Object.assign({}, state, { enemyHand: action.payload });
      case "SET_CURRENT_ENEMY_HAND": return Object.assign({}, state, { currentEnemyHand: action.payload });
      case "SET_LOST_CARDS": return Object.assign({}, state, { lostCards: action.payload });
      case "SET_WIN_STATE": return Object.assign({}, state, { winState: action.payload });
      case "SET_TURN": return Object.assign({}, state, { turn: action.payload });
      case "INCREMENT_TURN": return Object.assign({}, state, { turnNumber: state.turnNumber + 1 });
      case "RESET_TURN": return Object.assign({}, state, { turnNumber: 1 });
      case "SET_TURN_STATE": return Object.assign({}, state, { turnState: action.payload });
      // Un único dispatch atómico para "fin de turno": en React, marcar
      // TURN_END, cambiar el turno e incrementar turnNumber son tres
      // dispatch() del mismo manejador de clic que React agrupa en un solo
      // commit — el efecto de puntuación/victoria (deps: [board,
      // isGameActive]) siempre los ve ya aplicados juntos. Aquí cada
      // dispatch notifica al momento, así que agruparlos en una sola acción
      // es lo que reproduce ese mismo "todo o nada".
      case "END_TURN":
        return Object.assign({}, state, {
          turnState: "TURN_END",
          turn: (state.turn === "red") ? "blue" : "red",
          turnNumber: state.turnNumber + 1,
        });
      case "SET_SCORE": return Object.assign({}, state, { score: action.payload });
      case "SET_BOARD": return Object.assign({}, state, { board: action.payload });
      case "SET_SELECTED_CARD_ID": return Object.assign({}, state, { selectedCardId: action.payload });
      case "SET_SELECTED_REWARDS": return Object.assign({}, state, { selectedRewards: action.payload });
      case "SET_IS_MENU_OPEN": return Object.assign({}, state, { isMenuOpen: action.payload });
      case "SET_IS_CARD_SELECTION_OPEN": return Object.assign({}, state, { isCardSelectionOpen: action.payload });
      case "SET_IS_CARD_GALLERY_OPEN": return Object.assign({}, state, { isCardGalleryOpen: action.payload });
      case "SET_IS_REWARD_SELECTION_OPEN": return Object.assign({}, state, { isRewardSelectionOpen: action.payload });
      case "SET_IS_GAME_ACTIVE": return Object.assign({}, state, { isGameActive: action.payload });
      case "SET_IS_SOUND_ENABLED": return Object.assign({}, state, { isSoundEnabled: action.payload });
      case "SET_CURRENT_PAGES": return Object.assign({}, state, { currentPages: action.payload });
      case "SET_SLIDE_DIRECTION": return Object.assign({}, state, { slideDirection: action.payload });
      case "SET_RULES": {
        var rules = action.payload;
        var fuerzaSinIntercambio = !!(rules && rules.indexOf("allCards") !== -1);
        return Object.assign({}, state, { rules: rules, tradeRule: fuerzaSinIntercambio ? "none" : state.tradeRule });
      }
      case "SET_TRADE_RULE": {
        var esTodasLasCartas = !!(state.rules && state.rules.indexOf("allCards") !== -1);
        return Object.assign({}, state, { tradeRule: esTodasLasCartas ? "none" : action.payload });
      }
      case "SET_ELEMENTS": return Object.assign({}, state, { elements: action.payload });
      case "SET_IS_CRT_EFFECT_ACTIVE": return Object.assign({}, state, { isCRTEffectActive: action.payload });
      case "SET_IDIOMA": return Object.assign({}, state, { idioma: action.payload });
      // isSoundEnabled e idioma son preferencias del dispositivo, no de la
      // partida: una nueva partida no debe silenciar el sonido ni cambiar
      // el idioma que el jugador ya había elegido.
      case "RESET_GAME": return Object.assign({}, initialState, { isSoundEnabled: state.isSoundEnabled, idioma: state.idioma });
      default: return state;
    }
  }

  function dispatch(action) {
    var anterior = estado;
    estado = reducir(estado, action);
    if (estado !== anterior) {
      emitir();
      ejecutarEfectos(action, anterior);
    }
  }

  /**
   * Efectos secundarios que en la versión React vivían en useEffect dentro
   * de GameContext.tsx. Se ejecutan tras cada dispatch que cambie el estado.
   */
  function ejecutarEfectos(action, previo) {
    // currentPlayerCards se recalcula cuando cambian playerCards o se
    // abre/cierra la selección de cartas (filtra las cantidades a 0).
    if (action.type === "SET_PLAYER_CARDS" || action.type === "SET_IS_CARD_SELECTION_OPEN") {
      var filtradas = {};
      Object.keys(estado.playerCards).forEach(function (id) {
        if (estado.playerCards[id] !== 0) filtradas[id] = estado.playerCards[id];
      });
      if (JSON.stringify(filtradas) !== JSON.stringify(estado.currentPlayerCards)) {
        estado = Object.assign({}, estado, { currentPlayerCards: filtradas });
        emitir();
      }
    }

    // Contra la IA (sin sesión multijugador), en cuanto la partida se activa
    // y no hay turno decidido, se sortea quién empieza.
    if (estado.isGameActive && estado.turn === null && !(TT.multiplayer && TT.multiplayer.get().session)) {
      estado = Object.assign({}, estado, { turn: Math.random() < 0.5 ? "red" : "blue" });
      emitir();
    }
  }

  function get() { return estado; }

  function subscribe(oyente) {
    oyentes.add(oyente);
    return function () { oyentes.delete(oyente); };
  }

  /** Arranque: localStorage → estado inicial. Equivale al primer useEffect de GameContext.tsx. */
  function inicializar() {
    try {
      var cartasGuardadasJSON = localStorage.getItem("playerCards");
      if (cartasGuardadasJSON) {
        dispatch({ type: "SET_PLAYER_CARDS", payload: JSON.parse(cartasGuardadasJSON) });
      }
    } catch (e) {
      console.error("No se pudieron leer las cartas guardadas de localStorage", e);
    }

    try {
      var perdidasJSON = localStorage.getItem("lostCards");
      if (perdidasJSON) {
        dispatch({ type: "SET_LOST_CARDS", payload: JSON.parse(perdidasJSON) });
      }
    } catch (e) {
      console.error("No se pudieron leer las cartas perdidas de localStorage", e);
    }

    // El sonido arranca activado en la app instalada, apagado en el navegador.
    if (TT.platform.esStandalone()) {
      dispatch({ type: "SET_IS_SOUND_ENABLED", payload: true });
    }

    dispatch({ type: "SET_IDIOMA", payload: TT.i18n.leerIdiomaGuardado() });
  }

  TT.state = {
    initialState: initialState,
    get: get,
    dispatch: dispatch,
    subscribe: subscribe,
    inicializar: inicializar,
  };
})();
