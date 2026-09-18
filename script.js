const $ = id => document.getElementById(id);

const photoInput = $("photoInput");
const quoteInput = $("quoteInput");
const languageSelect = $("languageSelect");
const speedSelect = $("speedSelect");
const previewButton = $("previewButton");
const stopButton = $("stopButton");
const fullscreenButton = $("fullscreenButton");
const reelStage = $("reelStage");
const photoLayer = $("photoLayer");
const quoteText = $("quoteText");
const reelPlayButton = $("reelPlayButton");
const statusBox = $("status");

let photoUrl = "";
let lines = [];
let currentLine = -1;
let playing = false;
let voices = [];

function setStatus(message) {
  statusBox.textContent = message || "";
}

function loadVoices() {
  voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
}

if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[char]));
}

function coloredText(text) {
  const safe = escapeHtml(text);
  const parts = safe.split(/(\s+)/);
  let color = 0;
  return parts.map(part => {
    if (/^\s+$/.test(part)) return part;
    const className = "c" + ((color++ % 5) + 1);
    return `<span class="word ${className}">${part}</span>`;
  }).join("");
}

function splitQuote(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
}

function chooseVoice(lang) {
  const matching = voices.filter(voice =>
    voice.lang && voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())
  );
  if (!matching.length) return null;

  const femaleWords = /female|woman|zira|samantha|veena|lekha|google हिन्दी|google hindi/i;
  return matching.find(voice => femaleWords.test(voice.name)) || matching[0];
}

function preparePreview() {
  const quote = quoteInput.value.trim();

  if (!quote) {
    setStatus("कृपया सुविचार लिखें।");
    return false;
  }

  lines = splitQuote(quote);

  if (!lines.length) {
    setStatus("कम-से-कम एक quote line आवश्यक है।");
    return false;
  }

  quoteText.innerHTML = coloredText(lines[0]);
  currentLine = -1;
  playing = false;
  reelPlayButton.classList.remove("hidden");
  reelStage.classList.remove("recording");
  setStatus("Preview तैयार है।");
  return true;
}

function speakLine(text) {
  return new Promise(resolve => {
    if (!("speechSynthesis" in window)) {
      setStatus("इस browser में Text-to-Speech उपलब्ध नहीं है।");
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = languageSelect.value;
    const voice = chooseVoice(lang);

    utterance.lang = lang;
    utterance.rate = Number(speedSelect.value);
    utterance.pitch = 1;
    utterance.volume = 1;

    if (voice) utterance.voice = voice;

    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function playReel() {
  if (playing || !lines.length) return;

  playing = true;
  currentLine = -1;
  reelPlayButton.classList.add("hidden");
  reelStage.classList.add("recording");
  stopButton.disabled = false;
  setStatus("Reel चल रही है...");

  if ("speechSynthesis" in window) speechSynthesis.cancel();

  for (let index = 0; index < lines.length; index++) {
    if (!playing) break;

    currentLine = index;
    quoteText.innerHTML = coloredText(lines[index]);
    await speakLine(lines[index]);
    await wait(250);
  }

  if (playing) {
    setStatus("Reel पूरी हो गई।");
  } else {
    setStatus("Reel रोक दी गई।");
  }

  playing = false;
  stopButton.disabled = true;
  reelStage.classList.remove("recording");
  reelPlayButton.classList.remove("hidden");
}

function stopReel() {
  playing = false;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  stopButton.disabled = true;
  reelStage.classList.remove("recording");
  reelPlayButton.classList.remove("hidden");
  setStatus("Reel रोक दी गई।");
}

function setPhoto(file) {
  if (!file) return;

  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  photoLayer.style.backgroundImage = `url("${photoUrl}")`;
  setStatus("Photo लोड हो गई।");
}

async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await reelStage.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    setStatus("Full Screen उपलब्ध नहीं हो सका।");
  }
}

photoInput.addEventListener("change", event => {
  setPhoto(event.target.files[0]);
});

previewButton.addEventListener("click", () => {
  preparePreview();
});

reelPlayButton.addEventListener("click", () => {
  playReel();
});

stopButton.addEventListener("click", () => {
  stopReel();
});

fullscreenButton.addEventListener("click", () => {
  enterFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === reelStage) {
    setStatus("Full Screen सक्रिय है। Screen recorder शुरू करके Reel के अंदर Play दबाएँ।");
  }
});

window.addEventListener("beforeunload", () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
});

preparePreview();
