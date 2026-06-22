"use strict";

const CARD_COUNT = 25;
const STORAGE_KEY = "kado.printableFlashcards.v1";

const emptyCards = () => Array.from({ length: CARD_COUNT }, () => ({
  japanese: "",
  romaji: "",
  meaning: ""
}));

let cards = loadLocalCards();
let printTestMode = false;
let statusTimer = null;

const editorGrid = document.getElementById("editorGrid");
const frontPrintGrid = document.getElementById("frontPrintGrid");
const backPrintGrid = document.getElementById("backPrintGrid");
const backLayout = document.getElementById("backLayout");
const testBtn = document.getElementById("testBtn");
const status = document.getElementById("status");
const loadInput = document.getElementById("loadInput");

function normalizeCards(value) {
  if (!Array.isArray(value) || value.length !== CARD_COUNT) return null;
  return value.map((card) => ({
    japanese: String(card?.japanese ?? ""),
    romaji: String(card?.romaji ?? ""),
    meaning: String(card?.meaning ?? "")
  }));
}

function loadLocalCards() {
  try {
    return normalizeCards(JSON.parse(localStorage.getItem(STORAGE_KEY))) || emptyCards();
  } catch {
    return emptyCards();
  }
}

function saveLocalCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function announce(message) {
  clearTimeout(statusTimer);
  status.textContent = message;
  statusTimer = setTimeout(() => {
    status.textContent = "Ready · changes save automatically";
  }, 2800);
}

function makeInput(index, field, className, placeholder, label) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = `field ${className}`;
  input.value = cards[index][field];
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", `Card ${index + 1} ${label}`);
  input.addEventListener("input", () => {
    cards[index][field] = input.value;
    saveLocalCards();
    renderPrintPages();
  });
  return input;
}

function renderEditor() {
  editorGrid.replaceChildren();
  cards.forEach((card, index) => {
    const cell = document.createElement("div");
    cell.className = "editor-card";

    const number = document.createElement("span");
    number.className = "card-number";
    number.textContent = String(index + 1).padStart(2, "0");

    cell.append(
      number,
      makeInput(index, "japanese", "japanese-input", "日本語", "Japanese text"),
      makeInput(index, "romaji", "romaji-input", "Romaji", "romaji"),
      makeInput(index, "meaning", "meaning-input", "Türkçe", "Turkish meaning")
    );
    editorGrid.append(cell);
  });
}

function textElement(className, text) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  return element;
}

function orderedBackCards(sourceCards) {
  if (backLayout.value === "normal") return sourceCards;
  const ordered = [];
  for (let row = 0; row < 5; row += 1) {
    ordered.push(...sourceCards.slice(row * 5, row * 5 + 5).reverse());
  }
  return ordered;
}

function renderPrintPages() {
  frontPrintGrid.replaceChildren();
  backPrintGrid.replaceChildren();
  const printCards = printTestMode
    ? Array.from({ length: CARD_COUNT }, (_, index) => {
        const number = String(index + 1).padStart(2, "0");
        return { japanese: number, romaji: "", meaning: number };
      })
    : cards;

  printCards.forEach((card) => {
    const cell = document.createElement("div");
    cell.className = "print-card";
    cell.append(
      textElement("print-japanese", card.japanese),
      textElement("print-romaji", card.romaji)
    );
    frontPrintGrid.append(cell);
  });

  orderedBackCards(printCards).forEach((card) => {
    const cell = document.createElement("div");
    cell.className = "print-card";
    cell.append(textElement("print-meaning", card.meaning));
    backPrintGrid.append(cell);
  });
}

function setCards(nextCards, message) {
  cards = nextCards;
  saveLocalCards();
  renderEditor();
  renderPrintPages();
  announce(message);
}

document.getElementById("printBtn").addEventListener("click", async () => {
  await document.fonts.ready;
  renderPrintPages();
  window.print();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!cards.some((card) => card.japanese || card.romaji || card.meaning)) return;
  if (!window.confirm("Clear all 25 cards? This cannot be undone.")) return;
  setCards(emptyCards(), "All cards cleared");
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const payload = { app: "Kado", version: 1, backLayout: backLayout.value, cards };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `kado-flashcards-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  announce("JSON saved");
});

document.getElementById("loadBtn").addEventListener("click", () => loadInput.click());

loadInput.addEventListener("change", async () => {
  const file = loadInput.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const loadedCards = normalizeCards(Array.isArray(parsed) ? parsed : parsed.cards);
    if (!loadedCards) throw new Error("Invalid card data");
    if (parsed.backLayout === "normal" || parsed.backLayout === "mirrored") {
      backLayout.value = parsed.backLayout;
    }
    setCards(loadedCards, "JSON loaded successfully");
  } catch {
    announce("Could not load that file · expected 25 cards");
  } finally {
    loadInput.value = "";
  }
});

backLayout.addEventListener("change", () => {
  renderPrintPages();
  announce(backLayout.value === "mirrored" ? "Back columns mirrored" : "Back layout set to normal");
});

testBtn.addEventListener("click", () => {
  printTestMode = !printTestMode;
  testBtn.setAttribute("aria-pressed", String(printTestMode));
  testBtn.textContent = printTestMode ? "Exit Print Test" : "Print Test Mode";
  renderPrintPages();
  announce(printTestMode
    ? "Print Test Mode active · cards 01–25 are ready to print"
    : "Print Test Mode disabled · real flashcards restored");
});

renderEditor();
renderPrintPages();
