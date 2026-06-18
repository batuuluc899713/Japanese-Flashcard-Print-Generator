const STORAGE_KEY = "flashcardLearningPrototype.v1";
    const ACTIVE_COUNT = 8;
    const MINI_CHAPTER_SIZE = 5;
    const RECENT_WRONG_BONUS = 5;
    const RECENT_WRONG_WINDOW_MS = 10 * 60 * 1000;
    const SAVE_APP_NAME = "Yellow Flashcards";
    const SAVE_VERSION = 1;
    const DEFAULT_AUDIO_SETTINGS = {
      enabled: true,
      volume: 70
    };
    const SAMPLE_CARDS = [
      ["た", "ta"],
      ["ち", "chi"],
      ["つ", "tsu"],
      ["て", "te"],
      ["と", "to"],
      ["な", "na"],
      ["に", "ni"],
      ["ぬ", "nu"],
      ["ね", "ne"],
      ["の", "no"]
    ];

    let data = migrateData(loadData());
    let selectedDeckIds = normalizeSelectedDeckIds(data.selectedDeckIds || data.selectedDeckId);
    if (!selectedDeckIds.length && data.decks[0]) selectedDeckIds = [data.decks[0].id];
    let session = null;
    let editingCardId = null;
    let comboAnimationTimer = null;
    let comboTimerId = null;
    let comboTimerStartedAt = 0;
    let comboTimerDuration = 0;
    let pendingImportedSaveData = null;

    const el = {
      homeScreen: document.getElementById("homeScreen"),
      studyScreen: document.getElementById("studyScreen"),
      statsScreen: document.getElementById("statsScreen"),
      deckList: document.getElementById("deckList"),
      selectedDeckBox: document.getElementById("selectedDeckBox"),
      deckNameInput: document.getElementById("deckNameInput"),
      renameDeckInput: document.getElementById("renameDeckInput"),
      createDeckBtn: document.getElementById("createDeckBtn"),
      renameDeckBtn: document.getElementById("renameDeckBtn"),
      startLearningBtn: document.getElementById("startLearningBtn"),
      startRandomBtn: document.getElementById("startRandomBtn"),
      deleteDeckBtn: document.getElementById("deleteDeckBtn"),
      deckMessage: document.getElementById("deckMessage"),
      questionInput: document.getElementById("questionInput"),
      answerInput: document.getElementById("answerInput"),
      addCardBtn: document.getElementById("addCardBtn"),
      resetSampleDataBtn: document.getElementById("resetSampleDataBtn"),
      enableSoundsCheckbox: document.getElementById("enableSoundsCheckbox"),
      volumeSlider: document.getElementById("volumeSlider"),
      volumeValue: document.getElementById("volumeValue"),
      exportSaveBtn: document.getElementById("exportSaveBtn"),
      importSaveBtn: document.getElementById("importSaveBtn"),
      importSaveInput: document.getElementById("importSaveInput"),
      saveDataMessage: document.getElementById("saveDataMessage"),
      cardMessage: document.getElementById("cardMessage"),
      fileInput: document.getElementById("fileInput"),
      importMessage: document.getElementById("importMessage"),
      cardList: document.getElementById("cardList"),
      statsBtn: document.getElementById("statsBtn"),
      backToDecksBtn: document.getElementById("backToDecksBtn"),
      modeIndicator: document.getElementById("modeIndicator"),
      questionText: document.getElementById("questionText"),
      answerForm: document.getElementById("answerForm"),
      studyAnswerInput: document.getElementById("studyAnswerInput"),
      feedbackText: document.getElementById("feedbackText"),
      restartLearningBtn: document.getElementById("restartLearningBtn"),
      currentStars: document.getElementById("currentStars"),
      comboArea: document.getElementById("comboArea"),
      comboBadge: document.getElementById("comboBadge"),
      comboTimerFill: document.getElementById("comboTimerFill"),
      fireLayer: document.getElementById("fireLayer"),
      completedCount: document.getElementById("completedCount"),
      remainingCount: document.getElementById("remainingCount"),
      introducedCount: document.getElementById("introducedCount"),
      batchMasteredRow: document.getElementById("batchMasteredRow"),
      batchMasteredLabel: document.getElementById("batchMasteredLabel"),
      batchMasteredCount: document.getElementById("batchMasteredCount"),
      overallBar: document.getElementById("overallBar"),
      activeCardList: document.getElementById("activeCardList"),
      statsSummary: document.getElementById("statsSummary"),
      funStatsSummary: document.getElementById("funStatsSummary"),
      lowestSuccessList: document.getElementById("lowestSuccessList"),
      mostWrongList: document.getElementById("mostWrongList"),
      confusedList: document.getElementById("confusedList"),
      clearStatsBtn: document.getElementById("clearStatsBtn"),
      clearStatsModal: document.getElementById("clearStatsModal"),
      resetStarsCheckbox: document.getElementById("resetStarsCheckbox"),
      clearFunStatsCheckbox: document.getElementById("clearFunStatsCheckbox"),
      cancelClearStatsBtn: document.getElementById("cancelClearStatsBtn"),
      confirmClearStatsBtn: document.getElementById("confirmClearStatsBtn"),
      importSaveModal: document.getElementById("importSaveModal"),
      cancelImportSaveBtn: document.getElementById("cancelImportSaveBtn"),
      confirmImportSaveBtn: document.getElementById("confirmImportSaveBtn")
    };

    const audioManager = createAudioManager();

    saveData();
    renderSoundSettings();
    renderHome();

    el.createDeckBtn.addEventListener("click", createDeck);
    el.renameDeckBtn.addEventListener("click", renameSelectedDeck);
    el.deckNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") createDeck();
    });
    el.renameDeckInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") renameSelectedDeck();
    });
    el.deleteDeckBtn.addEventListener("click", deleteSelectedDeck);
    el.startLearningBtn.addEventListener("click", () => startStudySession("learning"));
    el.startRandomBtn.addEventListener("click", () => startStudySession("random"));
    el.addCardBtn.addEventListener("click", addManualCard);
    el.resetSampleDataBtn.addEventListener("click", resetSampleData);
    el.enableSoundsCheckbox.addEventListener("change", updateSoundSettings);
    el.volumeSlider.addEventListener("input", updateSoundSettings);
    el.exportSaveBtn.addEventListener("click", exportSaveData);
    el.importSaveBtn.addEventListener("click", () => el.importSaveInput.click());
    el.importSaveInput.addEventListener("change", readImportSaveFile);
    el.fileInput.addEventListener("change", importTxtFile);
    el.backToDecksBtn.addEventListener("click", showHome);
    el.statsBtn.addEventListener("click", showStats);
    el.answerForm.addEventListener("submit", submitAnswer);
    el.restartLearningBtn.addEventListener("click", restartLearning);
    el.clearStatsBtn.addEventListener("click", openClearStatsModal);
    el.cancelClearStatsBtn.addEventListener("click", closeClearStatsModal);
    el.confirmClearStatsBtn.addEventListener("click", clearStatistics);
    el.cancelImportSaveBtn.addEventListener("click", closeImportSaveModal);
    el.confirmImportSaveBtn.addEventListener("click", confirmImportSaveData);

    function loadData() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.decks)) return parsed;
        } catch (error) {
          console.warn("Saved flashcard data could not be parsed.", error);
        }
      }

      return {
        selectedDeckId: "sample",
        selectedDeckIds: ["sample"],
        audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
        decks: [
          {
            id: "sample",
            name: "Sample Kana Deck",
            cards: SAMPLE_CARDS.map(([question, answer]) => makeCard(question, answer))
          }
        ]
      };
    }

    function migrateData(source) {
      const migrated = {
        selectedDeckId: source.selectedDeckId || null,
        selectedDeckIds: Array.isArray(source.selectedDeckIds) ? source.selectedDeckIds : source.selectedDeckId ? [source.selectedDeckId] : [],
        audioSettings: normalizeAudioSettings(source.audioSettings),
        decks: Array.isArray(source.decks) ? source.decks : [],
        funStats: normalizeFunStats(source.funStats)
      };

      migrated.decks.forEach((deck) => {
        if (!deck.id) deck.id = makeId("deck");
        deck.name = repairMojibake(deck.name || "Untitled Deck");
        if (!Array.isArray(deck.cards)) deck.cards = [];
        deck.cards = deck.cards.map((card) => normalizeCard(card));
      });

      if (!migrated.decks.length) {
        migrated.selectedDeckId = "sample";
        migrated.selectedDeckIds = ["sample"];
        migrated.decks.push({
          id: "sample",
          name: "Sample Kana Deck",
          cards: SAMPLE_CARDS.map(([question, answer]) => makeCard(question, answer))
        });
      }

      migrated.selectedDeckIds = migrated.selectedDeckIds.filter((id) => migrated.decks.some((deck) => deck.id === id));
      if (!migrated.selectedDeckIds.length) migrated.selectedDeckIds = [migrated.decks[0].id];
      migrated.selectedDeckId = migrated.selectedDeckIds[0] || null;
      return migrated;
    }

    function normalizeSelectedDeckIds(value) {
      const ids = Array.isArray(value) ? value : value ? [value] : [];
      const existing = ids.filter((id) => data.decks.some((deck) => deck.id === id));
      return Array.from(new Set(existing));
    }

    function normalizeFunStats(funStats) {
      return {
        currentCombo: Number(funStats?.currentCombo) || 0,
        maxCombo: Number(funStats?.maxCombo) || 0,
        totalCorrectAnswers: Number(funStats?.totalCorrectAnswers) || 0,
        totalWrongAnswers: Number(funStats?.totalWrongAnswers) || 0
      };
    }

    function normalizeAudioSettings(settings) {
      const volume = Number(settings?.volume);
      return {
        enabled: typeof settings?.enabled === "boolean" ? settings.enabled : DEFAULT_AUDIO_SETTINGS.enabled,
        volume: Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : DEFAULT_AUDIO_SETTINGS.volume
      };
    }

    function normalizeCard(card) {
      const now = new Date().toISOString();
      const stars = clampStars(card.stars ?? card.currentStars ?? card.stats?.currentStars ?? 0);
      const baseStats = defaultStats(now, stars);
      const stats = { ...baseStats, ...(card.stats || {}) };
      stats.currentStars = stars;
      stats.confusedWithAnswers = Array.isArray(stats.confusedWithAnswers) ? stats.confusedWithAnswers : [];
      return {
        id: card.id || makeId("card"),
        question: repairMojibake(card.question || "").trim(),
        answer: repairMojibake(card.answer || "").trim(),
        stars,
        stats,
        srsLevel: Number.isFinite(card.srsLevel) ? card.srsLevel : 0,
        nextReviewAt: card.nextReviewAt || null,
        reviewIntervalDays: Number.isFinite(card.reviewIntervalDays) ? card.reviewIntervalDays : 0
      };
    }

    function repairMojibake(value) {
      const text = String(value || "");
      if (!/[ÃÂâã]/.test(text)) return text;

      try {
        const bytes = Uint8Array.from(Array.from(text, (character) => character.charCodeAt(0) & 255));
        return new TextDecoder("UTF-8", { fatal: false }).decode(bytes);
      } catch (error) {
        return text;
      }
    }

    function saveData() {
      selectedDeckIds = normalizeSelectedDeckIds(selectedDeckIds);
      data.selectedDeckIds = selectedDeckIds;
      data.selectedDeckId = selectedDeckIds[0] || null;
      data.funStats = normalizeFunStats(data.funStats);
      data.audioSettings = normalizeAudioSettings(data.audioSettings);
      data.decks.forEach((deck) => deck.cards.forEach(syncCardStats));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function createAudioManager() {
      const sounds = {
        correctSound: new Audio("assets/audio/bong_001.ogg"),
        wrongSound: new Audio("assets/audio/error_007.ogg"),
        masterSound: new Audio("assets/audio/confirmation_002.ogg"),
        future: {
          combo: null,
          achievement: null,
          buttonClick: null
        }
      };

      Object.values(sounds).forEach((sound) => {
        if (sound instanceof Audio) {
          sound.preload = "auto";
        }
      });

      function volume() {
        return normalizeAudioSettings(data.audioSettings).volume / 100;
      }

      function canPlay() {
        return normalizeAudioSettings(data.audioSettings).enabled;
      }

      function play(sound, playbackRate) {
        if (!sound || !canPlay()) return;
        sound.pause();
        sound.currentTime = 0;
        sound.volume = volume();
        sound.playbackRate = playbackRate || 1;
        sound.play().catch(() => {});
      }

      return {
        playCorrectSound(combo) {
          const rate = Math.max(1, Math.min(1.5, 1 + combo * 0.05));
          play(sounds.correctSound, rate);
        },
        playWrongSound() {
          play(sounds.wrongSound, 1);
        },
        playMasterSound() {
          play(sounds.masterSound, 1);
        },
        preload() {
          Object.values(sounds).forEach((sound) => {
            if (sound instanceof Audio) sound.load();
          });
        }
      };
    }

    function renderSoundSettings() {
      const settings = normalizeAudioSettings(data.audioSettings);
      el.enableSoundsCheckbox.checked = settings.enabled;
      el.volumeSlider.value = settings.volume;
      el.volumeValue.textContent = `${settings.volume}%`;
    }

    function updateSoundSettings() {
      data.audioSettings = {
        enabled: el.enableSoundsCheckbox.checked,
        volume: Number(el.volumeSlider.value)
      };
      renderSoundSettings();
      saveData();
      audioManager.preload();
    }

    function exportSaveData() {
      saveData();
      const payload = {
        app: SAVE_APP_NAME,
        saveVersion: SAVE_VERSION,
        exportedAt: new Date().toISOString(),
        data
      };
      const date = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `yellow-flashcards-save-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(el.saveDataMessage, "Save data exported.", "good");
    }

    function readImportSaveFile(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          const importedData = validateImportedSave(parsed);
          if (!importedData) {
            pendingImportedSaveData = null;
            setMessage(el.saveDataMessage, "Invalid save file.", "bad");
            return;
          }
          pendingImportedSaveData = importedData;
          openImportSaveModal();
        } catch (error) {
          pendingImportedSaveData = null;
          setMessage(el.saveDataMessage, "Invalid save file.", "bad");
        } finally {
          el.importSaveInput.value = "";
        }
      };
      reader.readAsText(file, "UTF-8");
    }

    function validateImportedSave(payload) {
      if (!payload || payload.app !== SAVE_APP_NAME || payload.saveVersion !== SAVE_VERSION || !payload.data) {
        return null;
      }
      if (!Array.isArray(payload.data.decks)) return null;
      const hasInvalidDeck = payload.data.decks.some((deck) => {
        return !deck || typeof deck.name !== "string" || !Array.isArray(deck.cards);
      });
      if (hasInvalidDeck) return null;

      const hasInvalidCard = payload.data.decks.some((deck) => {
        return deck.cards.some((card) => !card || typeof card.question !== "string" || typeof card.answer !== "string");
      });
      if (hasInvalidCard) return null;
      return payload.data;
    }

    function openImportSaveModal() {
      el.importSaveModal.hidden = false;
      el.cancelImportSaveBtn.focus();
    }

    function closeImportSaveModal() {
      pendingImportedSaveData = null;
      el.importSaveModal.hidden = true;
    }

    function confirmImportSaveData() {
      if (!pendingImportedSaveData) {
        closeImportSaveModal();
        setMessage(el.saveDataMessage, "Invalid save file.", "bad");
        return;
      }

      data = migrateData(pendingImportedSaveData);
      selectedDeckIds = normalizeSelectedDeckIds(data.selectedDeckIds || data.selectedDeckId);
      if (!selectedDeckIds.length && data.decks[0]) selectedDeckIds = [data.decks[0].id];
      session = null;
      editingCardId = null;
      pendingImportedSaveData = null;
      saveData();
      renderSoundSettings();
      showScreen("home");
      renderHome();
      el.importSaveModal.hidden = true;
      setMessage(el.saveDataMessage, "Save data imported.", "good");
    }

    function makeId(prefix) {
      return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function defaultStats(createdAt, stars) {
      return {
        totalAttempts: 0,
        correctAttempts: 0,
        wrongAttempts: 0,
        currentStars: stars || 0,
        timesMastered: 0,
        lastAnsweredAt: null,
        lastWrongAt: null,
        createdAt: createdAt || new Date().toISOString(),
        firstSeenAt: null,
        confusionCount: 0,
        confusedWithAnswers: []
      };
    }

    function makeCard(question, answer) {
      const now = new Date().toISOString();
      return {
        id: makeId("card"),
        question,
        answer,
        stars: 0,
        stats: defaultStats(now, 0),
        srsLevel: 0,
        nextReviewAt: null,
        reviewIntervalDays: 0
      };
    }

    function syncCardStats(card) {
      card.stars = clampStars(card.stars);
      card.stats = { ...defaultStats(new Date().toISOString(), card.stars), ...(card.stats || {}) };
      card.stats.currentStars = card.stars;
      card.stats.confusedWithAnswers = Array.isArray(card.stats.confusedWithAnswers) ? card.stats.confusedWithAnswers : [];
      if (!Number.isFinite(card.srsLevel)) card.srsLevel = 0;
      if (!Number.isFinite(card.reviewIntervalDays)) card.reviewIntervalDays = 0;
      if (!("nextReviewAt" in card)) card.nextReviewAt = null;
    }

    function getSelectedDecks() {
      return selectedDeckIds
        .map((deckId) => data.decks.find((deck) => deck.id === deckId))
        .filter(Boolean);
    }

    function getSelectedDeck() {
      const decks = getSelectedDecks();
      return decks.length === 1 ? decks[0] : null;
    }

    function getSelectedCards() {
      return getSelectedDecks().flatMap((deck) => deck.cards);
    }

    function getSessionDecks() {
      if (!session) return getSelectedDecks();
      return session.deckIds
        .map((deckId) => data.decks.find((deck) => deck.id === deckId))
        .filter(Boolean);
    }

    function getSessionCards() {
      return getSessionDecks().flatMap((deck) => deck.cards);
    }

    function toggleDeckSelection(deckId, checked) {
      if (checked) {
        selectedDeckIds = Array.from(new Set([...selectedDeckIds, deckId]));
      } else {
        selectedDeckIds = selectedDeckIds.filter((id) => id !== deckId);
      }
      editingCardId = null;
      saveData();
      renderHome();
    }

    function createDeck() {
      const name = el.deckNameInput.value.trim();
      if (!name) {
        setMessage(el.deckMessage, "Enter a deck name first.", "bad");
        return;
      }

      const deck = { id: makeId("deck"), name, cards: [] };
      data.decks.push(deck);
      selectedDeckIds = [deck.id];
      el.deckNameInput.value = "";
      saveData();
      setMessage(el.deckMessage, `Created "${name}".`, "good");
      renderHome();
    }

    function renameSelectedDeck() {
      const deck = getSelectedDeck();
      const name = el.renameDeckInput.value.trim();
      if (!deck) return;
      if (!name) {
        setMessage(el.deckMessage, "Enter a new deck name.", "bad");
        return;
      }

      deck.name = name;
      el.renameDeckInput.value = "";
      saveData();
      setMessage(el.deckMessage, "Deck renamed.", "good");
      renderHome();
    }

    function deleteSelectedDeck() {
      const decks = getSelectedDecks();
      if (!decks.length) {
        setMessage(el.deckMessage, "Select at least one deck.", "bad");
        return;
      }
      const names = decks.map((deck) => deck.name).join(", ");
      if (!confirm(`Delete ${decks.length} selected deck(s)?\n\n${names}`)) return;

      const idsToDelete = new Set(decks.map((deck) => deck.id));
      data.decks = data.decks.filter((item) => !idsToDelete.has(item.id));
      selectedDeckIds = data.decks[0] ? [data.decks[0].id] : [];
      editingCardId = null;
      saveData();
      renderHome();
    }

    function addManualCard() {
      const deck = getSelectedDeck();
      const question = el.questionInput.value.trim();
      const answer = el.answerInput.value.trim();

      if (!deck) {
        setMessage(el.cardMessage, "Select exactly one deck to edit.", "bad");
        return;
      }
      if (!question || !answer) {
        setMessage(el.cardMessage, "Question and answer are both required.", "bad");
        return;
      }
      if (hasDuplicateQuestion(deck, question)) {
        setMessage(el.cardMessage, "Duplicate question skipped.", "bad");
        return;
      }

      deck.cards.push(makeCard(question, answer));
      el.questionInput.value = "";
      el.answerInput.value = "";
      saveData();
      setMessage(el.cardMessage, "Card added.", "good");
      renderHome();
    }

    function editCard(cardId) {
      editingCardId = cardId;
      renderHome();
    }

    function saveCardEdit(cardId) {
      const deck = getSelectedDeck();
      const card = deck && findCard(deck.cards, cardId);
      if (!deck || !card) return;

      const question = document.getElementById(`edit-question-${cardId}`).value.trim();
      const answer = document.getElementById(`edit-answer-${cardId}`).value.trim();
      if (!question || !answer) {
        setMessage(el.cardMessage, "Edited cards need both question and answer.", "bad");
        return;
      }

      const duplicate = deck.cards.some((item) => item.id !== cardId && normalize(item.question) === normalize(question));
      if (duplicate) {
        setMessage(el.cardMessage, "Another card already uses that question.", "bad");
        return;
      }

      card.question = question;
      card.answer = answer;
      editingCardId = null;
      saveData();
      setMessage(el.cardMessage, "Card updated.", "good");
      renderHome();
    }

    function deleteCard(cardId) {
      const deck = getSelectedDeck();
      if (!deck) return;
      deck.cards = deck.cards.filter((card) => card.id !== cardId);
      editingCardId = null;
      saveData();
      renderHome();
    }

    function resetSampleData() {
      const sampleDeck = {
        id: "sample",
        name: "Sample Kana Deck",
        cards: SAMPLE_CARDS.map(([question, answer]) => makeCard(question, answer))
      };
      const existingIndex = data.decks.findIndex((deck) => deck.id === "sample" || deck.name === "Sample Kana Deck");

      if (existingIndex >= 0) {
        data.decks[existingIndex] = sampleDeck;
      } else {
        data.decks.unshift(sampleDeck);
      }

      selectedDeckIds = [sampleDeck.id];
      editingCardId = null;
      saveData();
      setMessage(el.deckMessage, "Sample data reset with proper UTF-8 text.", "good");
      renderHome();
    }

    function importTxtFile(event) {
      const deck = getSelectedDeck();
      const file = event.target.files[0];
      if (!deck) {
        setMessage(el.importMessage, "Select exactly one deck to import cards.", "bad");
        el.fileInput.value = "";
        return;
      }
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = parseImportedCards(String(reader.result || ""));
        let added = 0;
        let duplicates = 0;

        result.cards.forEach((card) => {
          if (hasDuplicateQuestion(deck, card.question)) {
            duplicates += 1;
            return;
          }
          deck.cards.push(makeCard(card.question, card.answer));
          added += 1;
        });

        saveData();
        renderHome();
        const invalidText = result.invalid ? ` ${result.invalid} invalid line(s) ignored.` : "";
        const duplicateText = duplicates ? ` ${duplicates} duplicate question(s) skipped.` : "";
        setMessage(el.importMessage, `Imported ${added} card(s).${duplicateText}${invalidText}`, duplicates ? "bad" : "good");
        el.fileInput.value = "";
      };
      reader.readAsText(file, "UTF-8");
    }

    function parseImportedCards(text) {
      const cards = [];
      let invalid = 0;

      text.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        const separator = line.includes("=") ? "=" : line.includes("\t") ? "\t" : line.includes(",") ? "," : null;
        if (!separator) {
          invalid += 1;
          return;
        }

        const [question, ...answerParts] = line.split(separator);
        const answer = answerParts.join(separator);
        if (!question.trim() || !answer.trim()) {
          invalid += 1;
          return;
        }
        cards.push({ question: question.trim(), answer: answer.trim() });
      });

      return { cards, invalid };
    }

    function hasDuplicateQuestion(deck, question) {
      return deck.cards.some((card) => normalize(card.question) === normalize(question));
    }

    function startStudySession(mode) {
      const decks = getSelectedDecks();
      const cards = getSelectedCards();
      if (!decks.length) {
        setMessage(el.deckMessage, "Select at least one deck.", "bad");
        return;
      }
      if (!cards.length) {
        setMessage(el.deckMessage, "Selected decks have no cards.", "bad");
        return;
      }

      resetCombo(false);
      session = createSession(decks, cards, mode);
      saveData();
      showStudy();
      askNextCard();
    }

    function createSession(decks, cards, mode) {
      const learningCards = cards.filter((card) => card.stars < 10);
      const activeCards = mode === "random" ? [] : learningCards.slice(0, ACTIVE_COUNT);
      return {
        deckIds: decks.map((deck) => deck.id),
        mode,
        activeIds: activeCards.map((card) => card.id),
        introducedIds: new Set(activeCards.map((card) => card.id)),
        batchMasteredIds: new Set(),
        currentCardId: null,
        lastAskedId: null,
        nextForcedCardId: null,
        feedback: ""
      };
    }

    function askNextCard() {
      const cards = getSessionCards();
      if (!cards.length || !session) return;

      const card = chooseNextCard(cards);
      if (!card) {
        session.feedback = "This deck is mastered. Use Start Random to keep reviewing.";
        session.masteredBlocked = true;
        renderStudy();
        return;
      }

      session.feedback = "";
      session.masteredBlocked = false;
      session.currentCardId = card.id;
      session.lastAskedId = card.id;
      if (!card.stats.firstSeenAt) card.stats.firstSeenAt = new Date().toISOString();
      renderStudy();

      el.studyAnswerInput.value = card.stars === 0 ? card.answer : "";
      saveData();
      el.studyAnswerInput.focus();
      el.studyAnswerInput.select();
    }

    function chooseNextCard(cards) {
      const forced = consumeForcedCard(cards);
      if (forced) return forced;

      if (session.mode === "random") {
        return weightedRandomCard(avoidImmediateRepeat(cards));
      }

      const activeCards = session.activeIds
        .map((id) => findCard(cards, id))
        .filter((card) => card && !session.batchMasteredIds.has(card.id));
      return weightedRandomCard(avoidImmediateRepeat(activeCards));
    }

    function consumeForcedCard(cards) {
      if (!session.nextForcedCardId) return null;
      const forced = findCard(cards, session.nextForcedCardId);
      session.nextForcedCardId = null;
      if (!forced) return null;

      const candidates = session.mode === "random"
        ? cards
        : session.activeIds.map((id) => findCard(cards, id)).filter(Boolean);
      if (candidates.length > 1 && forced.id === session.lastAskedId) return null;
      return forced;
    }

    function avoidImmediateRepeat(cards) {
      if (cards.length <= 1) return cards;
      const filtered = cards.filter((card) => card.id !== session.lastAskedId);
      return filtered.length ? filtered : cards;
    }

    function weightedRandomCard(cards) {
      if (!cards.length) return null;
      const weighted = cards.map((card) => ({
        card,
        weight: Math.max(1, (11 - card.stars) + recentWrongBonus(card))
      }));
      const total = weighted.reduce((sum, item) => sum + item.weight, 0);
      let roll = Math.random() * total;
      for (const item of weighted) {
        roll -= item.weight;
        if (roll <= 0) return item.card;
      }
      return weighted[weighted.length - 1].card;
    }

    function recentWrongBonus(card) {
      if (!card.stats.lastWrongAt) return 0;
      const lastWrong = new Date(card.stats.lastWrongAt).getTime();
      return Date.now() - lastWrong <= RECENT_WRONG_WINDOW_MS ? RECENT_WRONG_BONUS : 0;
    }

    function submitAnswer(event) {
      event.preventDefault();
      const cards = getSessionCards();
      if (!cards.length || !session || !session.currentCardId) return;

      const card = findCard(cards, session.currentCardId);
      if (!card) return;

      const submittedRaw = el.studyAnswerInput.value.trim();
      const submitted = normalize(submittedRaw);
      const expected = normalize(card.answer);
      const correct = submitted === expected;
      const wasMastered = card.stars >= 10;
      const now = new Date().toISOString();

      card.stats.totalAttempts += 1;
      card.stats.lastAnsweredAt = now;

      if (correct) {
        card.stats.correctAttempts += 1;
        card.stars = clampStars(card.stars + 1);
        session.feedback = "Correct";
        updateFunStats(true);
        audioManager.playCorrectSound(data.funStats.currentCombo);
        if (!wasMastered && card.stars >= 10) {
          markCardMastered(cards, card);
        }
      } else {
        card.stats.wrongAttempts += 1;
        card.stats.lastWrongAt = now;
        card.stars = clampStars(card.stars - 1);
        session.feedback = `Incorrect. Answer: ${card.answer}`;
        updateFunStats(false);
        audioManager.playWrongSound();
        trackConfusion(cards, card, submittedRaw);
      }

      syncCardStats(card);
      saveData();
      renderStudy(correct ? "good" : "bad");
      animateAnswerFeedback(correct);
      window.setTimeout(askNextCard, 450);
    }

    function restartLearning() {
      const decks = getSessionDecks();
      const cards = getSessionCards();
      if (!decks.length || !cards.length) return;

      resetCombo(false);
      cards.forEach((card) => {
        card.stars = 0;
        syncCardStats(card);
      });

      session = createSession(decks, cards, "learning");
      saveData();
      showStudy();
      askNextCard();
    }

    function updateFunStats(correct) {
      data.funStats = normalizeFunStats(data.funStats);
      if (correct) {
        data.funStats.totalCorrectAnswers += 1;
        data.funStats.currentCombo += 1;
        data.funStats.maxCombo = Math.max(data.funStats.maxCombo, data.funStats.currentCombo);
        animateCombo();
        startComboTimer();
        spawnFireEmojis();
      } else {
        data.funStats.totalWrongAnswers += 1;
        resetCombo(false);
      }
    }

    function resetCombo(saveNow) {
      data.funStats = normalizeFunStats(data.funStats);
      data.funStats.currentCombo = 0;
      stopComboTimer();
      updateComboDisplay(0);
      if (saveNow) saveData();
    }

    function stopComboTimer() {
      if (comboTimerId) {
        window.clearInterval(comboTimerId);
        comboTimerId = null;
      }
      comboTimerStartedAt = 0;
      comboTimerDuration = 0;
    }

    function startComboTimer() {
      stopComboTimer();
      const combo = data.funStats.currentCombo;
      comboTimerDuration = Math.max(2500, 8000 - combo * 450);
      comboTimerStartedAt = Date.now();
      updateComboDisplay(100);

      comboTimerId = window.setInterval(() => {
        const elapsed = Date.now() - comboTimerStartedAt;
        const percent = Math.max(0, 100 - (elapsed / comboTimerDuration) * 100);
        updateComboDisplay(percent);

        if (percent <= 0) {
          resetCombo(true);
        }
      }, 50);
    }

    function updateComboDisplay(percent) {
      if (el.comboBadge) {
        el.comboBadge.textContent = `Combo x${data.funStats.currentCombo}`;
      }
      if (!el.comboTimerFill) return;
      const bounded = Math.max(0, Math.min(100, Number(percent) || 0));
      el.comboTimerFill.style.width = `${bounded}%`;
      if (bounded >= 60) {
        el.comboTimerFill.style.background = "var(--good)";
      } else if (bounded >= 30) {
        el.comboTimerFill.style.background = "var(--gold)";
      } else {
        el.comboTimerFill.style.background = "var(--bad)";
      }
    }

    function animateAnswerFeedback(correct) {
      el.questionText.classList.remove("question-correct", "question-wrong");
      void el.questionText.offsetWidth;
      el.questionText.classList.add(correct ? "question-correct" : "question-wrong");
      window.setTimeout(() => {
        el.questionText.classList.remove("question-correct", "question-wrong");
      }, 380);
    }

    function animateCombo() {
      if (!el.comboBadge) return;
      el.comboBadge.classList.remove("combo-pop");
      void el.comboBadge.offsetWidth;
      el.comboBadge.classList.add("combo-pop");
      window.clearTimeout(comboAnimationTimer);
      comboAnimationTimer = window.setTimeout(() => {
        el.comboBadge.classList.remove("combo-pop");
      }, 360);
    }

    function spawnFireEmojis() {
      if (!el.fireLayer) return;
      const combo = data.funStats.currentCombo;
      const count = combo >= 13 ? 5 : combo >= 8 ? 3 : combo >= 4 ? 2 : 1;

      for (let index = 0; index < count; index += 1) {
        const fire = document.createElement("span");
        fire.className = "fire-float";
        fire.textContent = "\u{1F525}";
        fire.style.left = `${42 + Math.random() * 16}%`;
        fire.style.setProperty("--fire-x", `${Math.round((Math.random() - 0.5) * 70)}px`);
        fire.style.setProperty("--fire-r", `${Math.round((Math.random() - 0.5) * 28)}deg`);
        fire.style.animationDelay = `${index * 70}ms`;
        el.fireLayer.appendChild(fire);
        window.setTimeout(() => fire.remove(), 1100 + index * 70);
      }
    }

    function markCardMastered(cards, card) {
      card.stats.timesMastered += 1;
      card.srsLevel = Math.max(card.srsLevel || 0, 1);
      audioManager.playMasterSound();
      if (session.mode !== "learning") return;

      session.batchMasteredIds.add(card.id);
      if (session.batchMasteredIds.size >= MINI_CHAPTER_SIZE) {
        const masteredNow = Array.from(session.batchMasteredIds);
        session.activeIds = session.activeIds.filter((id) => !masteredNow.includes(id));
        session.batchMasteredIds.clear();
        introduceNextCards(cards, MINI_CHAPTER_SIZE);
      }
    }

    function introduceNextCards(cards, count) {
      let added = 0;
      for (const card of cards) {
        if (added >= count) break;
        if (card.stars >= 10 || session.introducedIds.has(card.id)) continue;
        session.activeIds.push(card.id);
        session.introducedIds.add(card.id);
        added += 1;
      }
    }

    function trackConfusion(cards, card, submittedRaw) {
      const submitted = normalize(submittedRaw);
      const confusedCard = cards.find((item) => item.id !== card.id && normalize(item.answer) === submitted);
      if (!confusedCard) return;

      card.stats.confusionCount += 1;
      card.stats.confusedWithAnswers.push({
        answer: confusedCard.answer,
        question: confusedCard.question,
        cardId: confusedCard.id,
        at: new Date().toISOString()
      });
      session.nextForcedCardId = confusedCard.id;
    }

    function findCard(cards, cardId) {
      return cards.find((card) => card.id === cardId);
    }

    function normalize(value) {
      return String(value).trim().toLowerCase();
    }

    function clampStars(value) {
      return Math.max(0, Math.min(10, Number(value) || 0));
    }

    function showHome() {
      resetCombo(true);
      session = null;
      showScreen("home");
      renderHome();
    }

    function showStudy() {
      showScreen("study");
    }

    function showStats() {
      resetCombo(true);
      session = null;
      showScreen("stats");
      renderStats();
    }

    function openClearStatsModal() {
      el.resetStarsCheckbox.checked = false;
      el.clearFunStatsCheckbox.checked = false;
      el.clearStatsModal.hidden = false;
      el.cancelClearStatsBtn.focus();
    }

    function closeClearStatsModal() {
      el.clearStatsModal.hidden = true;
    }

    function clearStatistics() {
      const resetStars = el.resetStarsCheckbox.checked;
      const clearFunStats = el.clearFunStatsCheckbox.checked;

      if (clearFunStats) {
        data.funStats = {
          currentCombo: 0,
          maxCombo: 0,
          totalCorrectAnswers: 0,
          totalWrongAnswers: 0
        };
      }

      data.decks.forEach((deck) => {
        deck.cards.forEach((card) => resetCardStatistics(card, resetStars));
      });

      saveData();
      closeClearStatsModal();
      renderStats();
      renderHome();
    }

    function resetCardStatistics(card, resetStars) {
      const createdAt = card.stats?.createdAt || new Date().toISOString();
      if (resetStars) card.stars = 0;
      card.stats = {
        ...defaultStats(createdAt, card.stars),
        createdAt
      };
    }

    function showScreen(name) {
      el.homeScreen.classList.toggle("active", name === "home");
      el.studyScreen.classList.toggle("active", name === "study");
      el.statsScreen.classList.toggle("active", name === "stats");
      el.backToDecksBtn.hidden = name === "home";
      el.statsBtn.hidden = name === "stats";
    }

    function renderHome() {
      const deck = getSelectedDeck();
      const selectedDecks = getSelectedDecks();
      const selectedCards = getSelectedCards();
      el.deckList.innerHTML = "";

      if (data.decks.length === 0) {
        el.deckList.innerHTML = `<div class="empty-state">No decks yet. Create one to begin.</div>`;
      } else {
        data.decks.forEach((item) => {
          const mastered = item.cards.filter((card) => card.stars >= 10).length;
          const checked = selectedDeckIds.includes(item.id);
          const label = document.createElement("label");
          label.className = `deck-item${checked ? " selected" : ""}`;
          label.innerHTML = `
            <input type="checkbox" ${checked ? "checked" : ""} data-deck-id="${item.id}">
            <span><strong>${escapeHtml(item.name)}</strong><span>${item.cards.length} cards &middot; ${mastered} mastered</span></span>
          `;
          label.querySelector("input").addEventListener("change", (event) => {
            toggleDeckSelection(item.id, event.target.checked);
          });
          el.deckList.appendChild(label);
        });
      }

      if (selectedDecks.length === 1 && deck) {
        const totalStars = deck.cards.reduce((sum, card) => sum + card.stars, 0);
        const maxStars = deck.cards.length * 10 || 1;
        el.selectedDeckBox.innerHTML = `
          <div>
            <strong>${escapeHtml(deck.name)}</strong>
            <span class="muted">${deck.cards.length} cards &middot; ${Math.round((totalStars / maxStars) * 100)}% star progress</span>
          </div>
          <span class="stars">${renderStars(Math.round((totalStars / maxStars) * 10))}</span>
        `;
        el.renameDeckInput.placeholder = `Rename "${deck.name}"`;
      } else if (selectedDecks.length > 1) {
        const mastered = selectedCards.filter((card) => card.stars >= 10).length;
        const totalStars = selectedCards.reduce((sum, card) => sum + card.stars, 0);
        const maxStars = selectedCards.length * 10 || 1;
        const progress = Math.round((totalStars / maxStars) * 100);
        el.selectedDeckBox.innerHTML = `
          <div>
            <strong>Selected Decks: ${selectedDecks.length}</strong>
            <span class="muted">Total Cards: ${selectedCards.length} &middot; Mastered: ${mastered} &middot; Average Progress: ${progress}%</span>
          </div>
          <span class="stars">${renderStars(Math.round((totalStars / maxStars) * 10))}</span>
        `;
        el.renameDeckInput.placeholder = "Select exactly one deck to edit";
      } else {
        el.selectedDeckBox.innerHTML = `<span class="muted">No deck selected.</span>`;
        el.renameDeckInput.placeholder = "Select exactly one deck to edit";
      }

      const hasSelection = selectedDecks.length > 0;
      const canEditOne = selectedDecks.length === 1;
      el.startLearningBtn.disabled = !hasSelection;
      el.startRandomBtn.disabled = !hasSelection;
      el.deleteDeckBtn.disabled = !hasSelection;
      el.renameDeckBtn.disabled = !canEditOne;
      el.addCardBtn.disabled = !canEditOne;
      el.fileInput.disabled = !canEditOne;
      renderCardList(deck);
    }

    function renderCardList(deck) {
      el.cardList.innerHTML = "";
      if (!deck) {
        el.cardList.innerHTML = `<div class="empty-state">Select exactly one deck to edit cards.</div>`;
        return;
      }
      if (deck.cards.length === 0) {
        el.cardList.innerHTML = `<div class="empty-state">No cards in this deck yet.</div>`;
        return;
      }

      deck.cards.forEach((card) => {
        const line = document.createElement("div");
        line.className = `card-line${editingCardId === card.id ? " editing" : ""}`;

        if (editingCardId === card.id) {
          line.innerHTML = `
            <div class="two">
              <input id="edit-question-${card.id}" type="text" value="${escapeHtml(card.question)}">
              <input id="edit-answer-${card.id}" type="text" value="${escapeHtml(card.answer)}">
            </div>
            <div class="row">
              <button class="small" type="button" data-action="save" data-id="${card.id}">Save</button>
              <button class="small secondary" type="button" data-action="cancel" data-id="${card.id}">Cancel</button>
              <button class="small danger" type="button" data-action="delete" data-id="${card.id}">Delete</button>
            </div>
          `;
        } else {
          line.innerHTML = `
            <div>
              <b>${escapeHtml(card.question)}</b> <span class="muted">&rarr; ${escapeHtml(card.answer)}</span><br>
              <span class="muted">${card.stats.totalAttempts} attempts &middot; ${card.stats.wrongAttempts} wrong &middot; mastered ${card.stats.timesMastered}x</span>
            </div>
            <div class="row">
              <span class="stars">${renderStars(card.stars)}</span>
              <button class="small secondary" type="button" data-action="edit" data-id="${card.id}">Edit</button>
              <button class="small danger" type="button" data-action="delete" data-id="${card.id}">Delete</button>
            </div>
          `;
        }

        line.addEventListener("click", (event) => {
          const action = event.target.dataset.action;
          const id = event.target.dataset.id;
          if (!action || !id) return;
          if (action === "edit") editCard(id);
          if (action === "save") saveCardEdit(id);
          if (action === "cancel") {
            editingCardId = null;
            renderHome();
          }
          if (action === "delete") deleteCard(id);
        });
        el.cardList.appendChild(line);
      });
    }

    function renderStudy(feedbackClass) {
      const cards = getSessionCards();
      if (!cards.length || !session) return;
      const currentCard = findCard(cards, session.currentCardId);
      const mastered = cards.filter((card) => card.stars >= 10).length;
      const remaining = cards.length - mastered;
      const introduced = session.mode === "random" ? cards.length : session.introducedIds.size;

      el.modeIndicator.textContent = session.mode === "random" ? "Random Review Mode" : "Learning Mode";
      el.modeIndicator.classList.toggle("review", session.mode === "random");
      el.questionText.textContent = currentCard ? currentCard.question : "";
      el.questionText.classList.remove("question-correct", "question-wrong");
      el.currentStars.innerHTML = currentCard ? renderStars(currentCard.stars) : renderStars(0);
      el.comboBadge.textContent = `Combo x${data.funStats.currentCombo}`;
      el.comboBadge.hidden = false;
      el.feedbackText.textContent = session.feedback || "";
      el.feedbackText.className = `feedback ${feedbackClass || ""}`;
      el.restartLearningBtn.hidden = !(session.mode === "learning" && session.masteredBlocked);
      el.completedCount.textContent = mastered;
      el.remainingCount.textContent = remaining;
      el.introducedCount.textContent = `${introduced}/${cards.length}`;
      el.batchMasteredRow.hidden = false;
      if (session.mode === "random") {
        el.batchMasteredLabel.textContent = "Mode";
        el.batchMasteredCount.textContent = "Random Review";
      } else {
        el.batchMasteredLabel.textContent = "Batch mastered";
        el.batchMasteredCount.textContent = `${session.batchMasteredIds.size}/${MINI_CHAPTER_SIZE}`;
      }
      el.overallBar.style.width = `${cards.length ? (mastered / cards.length) * 100 : 0}%`;

      renderActiveCards(cards);
    }

    function renderActiveCards(cards) {
      el.activeCardList.innerHTML = "";
      const activeCards = session.mode === "random"
        ? cards
        : session.activeIds.map((id) => findCard(cards, id)).filter(Boolean);

      if (activeCards.length === 0) {
        el.activeCardList.innerHTML = `<div class="empty-state">No active learning cards remain.</div>`;
        return;
      }

      activeCards.forEach((card) => {
        const line = document.createElement("div");
        line.className = "active-line";
        line.innerHTML = `
          <div><b>${escapeHtml(card.question)}</b><br><span class="muted">${escapeHtml(card.answer)}</span></div>
          <span class="stars">${renderStars(card.stars)}</span>
        `;
        el.activeCardList.appendChild(line);
      });
    }

    function renderStats() {
      const decks = getSelectedDecks();
      const cards = getSelectedCards();
      if (!decks.length) {
        el.statsSummary.innerHTML = `<div class="empty-state">Select at least one deck first.</div>`;
        el.funStatsSummary.innerHTML = "";
        el.lowestSuccessList.innerHTML = "";
        el.mostWrongList.innerHTML = "";
        el.confusedList.innerHTML = "";
        return;
      }

      const totalCards = cards.length;
      const totalAttempts = cards.reduce((sum, card) => sum + card.stats.totalAttempts, 0);
      const correctAttempts = cards.reduce((sum, card) => sum + card.stats.correctAttempts, 0);
      const wrongAttempts = cards.reduce((sum, card) => sum + card.stats.wrongAttempts, 0);
      const correctPercent = totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
      const wrongPercent = totalAttempts ? Math.round((wrongAttempts / totalAttempts) * 100) : 0;

      el.statsSummary.innerHTML = `
        <div class="stat-box"><span>Total cards</span><strong>${totalCards}</strong></div>
        <div class="stat-box"><span>Total attempts</span><strong>${totalAttempts}</strong></div>
        <div class="stat-box"><span>Correct</span><strong>${correctPercent}%</strong></div>
        <div class="stat-box"><span>Wrong</span><strong>${wrongPercent}%</strong></div>
      `;
      el.funStatsSummary.innerHTML = `
        <div class="stat-box"><span>Max combo achieved</span><strong>x${data.funStats.maxCombo}</strong></div>
        <div class="stat-box"><span>Total correct answers</span><strong>${data.funStats.totalCorrectAnswers}</strong></div>
        <div class="stat-box"><span>Total wrong answers</span><strong>${data.funStats.totalWrongAnswers}</strong></div>
      `;

      const attempted = cards.filter((card) => card.stats.totalAttempts > 0);
      const lowestSuccess = attempted
        .slice()
        .sort((a, b) => successRate(a) - successRate(b) || b.stats.wrongAttempts - a.stats.wrongAttempts)
        .slice(0, 5);
      const mostWrong = cards
        .filter((card) => card.stats.wrongAttempts > 0)
        .slice()
        .sort((a, b) => b.stats.wrongAttempts - a.stats.wrongAttempts)
        .slice(0, 5);
      const mostConfused = cards
        .filter((card) => card.stats.confusionCount > 0)
        .slice()
        .sort((a, b) => b.stats.confusionCount - a.stats.confusionCount)
        .slice(0, 5);

      renderStatList(el.lowestSuccessList, lowestSuccess, (card) => `${Math.round(successRate(card) * 100)}% success &middot; ${card.stats.totalAttempts} attempts`);
      renderStatList(el.mostWrongList, mostWrong, (card) => `${card.stats.wrongAttempts} wrong &middot; ${card.stats.correctAttempts} correct`);
      renderStatList(el.confusedList, mostConfused, (card) => {
        const latest = card.stats.confusedWithAnswers[card.stats.confusedWithAnswers.length - 1];
        return `${card.stats.confusionCount} confusion(s) &middot; last typed "${escapeHtml(latest.answer)}" for ${escapeHtml(latest.question)}`;
      });
    }

    function renderStatList(node, cards, detail) {
      node.innerHTML = "";
      if (!cards.length) {
        node.innerHTML = `<div class="empty-state">No data yet.</div>`;
        return;
      }
      cards.forEach((card) => {
        const line = document.createElement("div");
        line.className = "stat-line";
        line.innerHTML = `
          <div><b>${escapeHtml(card.question)}</b> <span class="muted">&rarr; ${escapeHtml(card.answer)}</span><br><span class="muted">${detail(card)}</span></div>
          <span class="stars">${renderStars(card.stars)}</span>
        `;
        node.appendChild(line);
      });
    }

    function successRate(card) {
      return card.stats.totalAttempts ? card.stats.correctAttempts / card.stats.totalAttempts : 0;
    }

    function renderStars(count) {
      const filled = clampStars(count);
      return `<span class="filled">${"&#9733;".repeat(filled)}</span>${"&#9734;".repeat(10 - filled)}`;
    }

    function setMessage(node, text, type) {
      node.textContent = text;
      node.className = `message ${type || ""}`;
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
