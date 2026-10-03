// js/components/cardGallery.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  function sonidoActivo() { return TT.state.get().isSoundEnabled; }

  function montar(contenedor) {
    var raiz = document.createElement("div");
    raiz.className = "card-gallery-cardGalleryContainer flex flex-col items-center justify-center top-0 z-10 w-screen h-screen";
    contenedor.appendChild(raiz);

    function handleDismissGallery() {
      TT.state.dispatch({ type: "SET_PREVIEW_CARD_ID", payload: null });
      TT.state.dispatch({ type: "SET_IS_CARD_GALLERY_OPEN", payload: false });
    }
    raiz.addEventListener("click", handleDismissGallery);

    var envoltorio = document.createElement("div");
    envoltorio.className = "m-20 relative h-full flex flex-col justify-center";
    envoltorio.addEventListener("click", function (e) { /* deja pasar solo el click del fondo */ });
    raiz.appendChild(envoltorio);

    // --- fila de títulos ---
    var filaTitulos = document.createElement("div");
    filaTitulos.className = "flex w-full gap-1 p-1";
    filaTitulos.addEventListener("click", function (e) { e.stopPropagation(); });
    envoltorio.appendChild(filaTitulos);

    var pTitulo = document.createElement("p");
    var cajaTitulo = TT.components.simpleDialog.crear({
      className: "card-gallery-currentPageTitle", metaTitle: "help", children: pTitulo,
    });
    filaTitulos.appendChild(cajaTitulo);

    var pCard = document.createElement("p");
    pCard.className = "flex";
    var estrella = document.createElement("span");
    estrella.textContent = "⭐️";
    pCard.appendChild(TT.textoASprite("Card"));
    pCard.appendChild(estrella);
    var cajaCard = TT.components.simpleDialog.crear({
      className: "card-gallery-galleryTitle", metaTitle: null, children: pCard,
    });
    filaTitulos.appendChild(cajaCard);

    // --- fila principal: lista + detalles ---
    var filaPrincipal = document.createElement("div");
    filaPrincipal.className = "flex justify-between gap-1 my-1";
    filaPrincipal.addEventListener("click", function (e) { e.stopPropagation(); });
    envoltorio.appendChild(filaPrincipal);

    var columnaLista = document.createElement("div");
    columnaLista.className = "w-1/2 ml-4";
    filaPrincipal.appendChild(columnaLista);

    var listaCartas = TT.components.cardSelectionDialog.montar(columnaLista, {
      showPreview: false, showMissingCards: true, modifier: "card-gallery", pagination: "cardGallery",
      onCancel: function () { TT.sounds.reproducirSonido("back", sonidoActivo()); handleDismissGallery(); },
    });

    var columnaDetalles = document.createElement("div");
    columnaDetalles.className = "w-1/2 mr-4 flex flex-col gap-1";
    filaPrincipal.appendChild(columnaDetalles);

    var cajaDetalles = TT.components.simpleDialog.crear({ className: "card-gallery-cardDetails flex justify-between", metaTitle: null });
    columnaDetalles.appendChild(cajaDetalles);
    var izquierdaDetalles = document.createElement("div");
    izquierdaDetalles.className = "flex flex-col justify-between";
    cajaDetalles.appendChild(izquierdaDetalles);
    var valoresSlot = document.createElement("div");
    izquierdaDetalles.appendChild(valoresSlot);
    var elementalDiv = document.createElement("div");
    var pElemental1 = document.createElement("p");
    var pElemental2 = document.createElement("p");
    pElemental2.className = "ml-2 mt-2";
    elementalDiv.appendChild(pElemental1);
    elementalDiv.appendChild(pElemental2);
    izquierdaDetalles.appendChild(elementalDiv);
    var imagenSlot = document.createElement("div");
    cajaDetalles.appendChild(imagenSlot);

    var cajaEstadisticas = TT.components.simpleDialog.crear({ className: "card-gallery-cardStatistics flex flex-col justify-between", metaTitle: null });
    columnaDetalles.appendChild(cajaEstadisticas);

    function filaEstadistica(etiqueta) {
      var p = document.createElement("p");
      p.className = "flex justify-between";
      var span1 = document.createElement("span");
      span1.appendChild(TT.textoASprite(etiqueta));
      var span2 = document.createElement("span");
      p.appendChild(span1);
      p.appendChild(span2);
      cajaEstadisticas.appendChild(p);
      return span2;
    }
    var spanMonster = filaEstadistica("MONSTER");
    var spanBoss = filaEstadistica("BOSS");
    var spanGf = filaEstadistica("GF");
    var spanPlayer = filaEstadistica("PLAYER");
    var spanTotal = filaEstadistica("TOTAL");

    // --- fila inferior: área / nombre ---
    var filaInferior = document.createElement("div");
    filaInferior.className = "flex w-full p-1";
    filaInferior.addEventListener("click", function (e) { e.stopPropagation(); });
    envoltorio.appendChild(filaInferior);

    var cajaMeta = TT.components.simpleDialog.crear({ className: "card-gallery-selectedCardMeta", metaTitle: null });
    filaInferior.appendChild(cajaMeta);
    var filaMeta = document.createElement("div");
    filaMeta.className = "flex justify-between";
    cajaMeta.appendChild(filaMeta);
    var pAreaLabel = document.createElement("p");
    var pAreaValor = document.createElement("p");
    filaMeta.appendChild(pAreaLabel);
    filaMeta.appendChild(pAreaValor);

    function render() {
      var estadoJuego = TT.state.get();
      var previewCardData = TT_DATA.cards.find(function (c) { return c.id === estadoJuego.previewCardId; });
      var previewCardLocation = null;

      if (estadoJuego.previewCardId &&
          !(estadoJuego.previewCardId in estadoJuego.currentPlayerCards) &&
          (estadoJuego.previewCardId > 78 || estadoJuego.previewCardId === 48)) {
        var idJugadorPerdido = Object.keys(estadoJuego.lostCards).find(function (idJ) {
          return (estadoJuego.lostCards[idJ] || []).indexOf(estadoJuego.previewCardId) !== -1;
        });
        var jugadorPerdido = TT_DATA.players.find(function (p) { return p.id === Number(idJugadorPerdido); });
        var jugadorRaro = TT_DATA.players.find(function (p) { return p.rareCard === estadoJuego.previewCardId; });

        if (idJugadorPerdido && jugadorPerdido) previewCardLocation = TT.textoASprite(jugadorPerdido.location, "yellow");
        else if (jugadorRaro) previewCardLocation = TT.textoASprite(jugadorRaro.location, "blue");
      }

      var totalMonster = Object.keys(estadoJuego.playerCards).filter(function (id) { return Number(id) <= 55; }).length;
      var totalBoss = Object.keys(estadoJuego.playerCards).filter(function (id) { return Number(id) >= 56 && Number(id) <= 77; }).length;
      var totalGf = Object.keys(estadoJuego.playerCards).filter(function (id) { return Number(id) >= 78 && Number(id) <= 99; }).length;
      var totalPlayer = Object.keys(estadoJuego.playerCards).filter(function (id) { return Number(id) >= 100; }).length;
      var totalTotal = Object.keys(estadoJuego.playerCards).length;

      var idPaginaGaleria = estadoJuego.currentPages.cardGallery;
      var titleType = (idPaginaGaleria < 6) ? "Monster" : (idPaginaGaleria < 8) ? "Boss" : (idPaginaGaleria < 10) ? "GF" : "Player";

      pTitulo.innerHTML = "";
      pTitulo.appendChild(TT.textoASprite(TT.i18n.tituloGaleria(idPaginaGaleria, titleType)));

      estrella.classList.toggle("hidden", totalTotal !== 110);

      valoresSlot.innerHTML = "";
      if (estadoJuego.previewCardId) valoresSlot.appendChild(TT.components.cardValues.crear(estadoJuego.previewCardId, true));
      izquierdaDetalles.className = (previewCardData ? "" : "invisible") + " flex flex-col justify-between";

      pElemental1.innerHTML = "";
      pElemental1.appendChild(TT.textoASprite("Elemental"));
      pElemental2.innerHTML = "";
      var textoElemental = (previewCardData && previewCardData.element)
        ? previewCardData.element.charAt(0).toUpperCase() + previewCardData.element.slice(1)
        : "N/A";
      pElemental2.appendChild(TT.textoASprite(textoElemental));

      imagenSlot.innerHTML = "";
      if (previewCardData) {
        imagenSlot.appendChild(TT.components.card.crear({ id: previewCardData.id, player: "blue", displayValues: false }));
      } else {
        var back = document.createElement("img");
        back.src = "./assets/cardback.png";
        back.alt = "Card Back";
        back.height = 163; back.width = 128;
        imagenSlot.appendChild(back);
      }

      spanMonster.innerHTML = ""; spanMonster.appendChild(TT.textoASprite(String(totalMonster)));
      spanBoss.innerHTML = ""; spanBoss.appendChild(TT.textoASprite(String(totalBoss)));
      spanGf.innerHTML = ""; spanGf.appendChild(TT.textoASprite(String(totalGf)));
      spanPlayer.innerHTML = ""; spanPlayer.appendChild(TT.textoASprite(String(totalPlayer)));
      spanTotal.innerHTML = ""; spanTotal.appendChild(TT.textoASprite(String(totalTotal)));

      pAreaLabel.innerHTML = "";
      pAreaLabel.appendChild(TT.textoASprite((previewCardData && previewCardLocation) ? "AREA" : TT.i18n.t(titleType).toUpperCase()));
      pAreaValor.innerHTML = "";
      if (previewCardData && previewCardLocation) {
        pAreaValor.appendChild(previewCardLocation);
      } else {
        pAreaValor.appendChild(TT.textoASprite(previewCardData ? previewCardData.name : ""));
      }
    }

    var cancelar = TT.state.subscribe(render);
    render();

    return {
      desmontar: function () {
        cancelar();
        listaCartas.desmontar();
        raiz.remove();
      },
    };
  }

  TT.components.cardGallery = { montar: montar };
})();
