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
const emptyMessage = $("emptyMessage");
const quoteText = $("quoteText");
const reelPlayButton = $("reelPlayButton");
const statusBox = $("status");

let photoUrl = "";
let lines = [];
let voices = [];
let playing = false;
let runId = 0;

function status(message) {
  statusBox.textContent = message || "";
}

function refreshVoices() {
  voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
}

if ("speechSynthesis" in window) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[char]));
}

function makeColoredText(text) {
  let colorIndex = 0;
  return escapeHtml(text).split(/(\s+)/).map(part => {
    if (/^\s+$/.test(part)) return part;
    colorIndex++;
    return `<span class="word c${((colorIndex - 1) % 5) + 1}">${part}</span>`;
  }).join("");
}

function getLines(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
}

function selectVoice(language) {
  const prefix = language.slice(0, 2).toLowerCase();
  const matches = voices.filter(voice =>
    String(voice.lang || "").toLowerCase().startsWith(prefix)
  );

  if (!matches.length) return null;

  const femalePattern = /female|woman|zira|samantha|veena|lekha|google hindi|google हिन्दी|priya|heera/i;
  return matches.find(voice => femalePattern.test(voice.name)) || matches[0];
}

function hasPhoto() {
  return Boolean(photoUrl);
}

function preparePreview() {
  const text = quoteInput.value.trim();

  if (!hasPhoto()) {
    status("पहले एक Photo चुनें।");
    return false;
  }

  if (!text) {
    status("कृपया सुविचार लिखें।");
    return false;
  }

  lines = getLines(text);

  if (!lines.length) {
    status("कम-से-कम एक quote line आवश्यक है।");
    return false;
  }

  stopPlayback(false);
  emptyMessage.style.display = "none";
  quoteText.innerHTML = makeColoredText(lines[0]);
  reelPlayButton.classList.remove("hidden");
  status("Preview तैयार है।");
  return true;
}

function speak(text, id) {
  return new Promise(resolve => {
    if (!playing || id !== runId) {
      resolve(false);
      return;
    }

    if (!("speechSynthesis" in window)) {
      status("इस browser में TTS उपलब्ध नहीं है।");
      resolve(true);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const language = languageSelect.value;
    const voice = selectVoice(language);

    utterance.lang = language;
    utterance.rate = Number(speedSelect.value);
    utterance.pitch = 1;
    utterance.volume = 1;

    if (voice) utterance.voice = voice;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve(true);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
  });
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function playReel() {
  if (playing) return;

  if (!preparePreview()) return;

  playing = true;
  runId++;
  const id = runId;

  reelPlayButton.classList.add("hidden");
  stopButton.disabled = false;
  reelStage.classList.add("playing");
  status("Reel चल रही है...");

  if ("speechSynthesis" in window) speechSynthesis.cancel();

  for (let index = 0; index < lines.length; index++) {
    if (!playing || id !== runId) return;

    quoteText.innerHTML = makeColoredText(lines[index]);
    const completed = await speak(lines[index], id);

    if (!completed || !playing || id !== runId) return;
    await pause(300);
  }

  if (id === runId) {
    playing = false;
    stopButton.disabled = true;
    reelStage.classList.remove("playing");
    reelPlayButton.classList.remove("hidden");
    status("Reel पूरी हो गई।");
  }
}

function stopPlayback(showStatus = true) {
  runId++;
  playing = false;

  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }

  stopButton.disabled = true;
  reelStage.classList.remove("playing");
  reelPlayButton.classList.remove("hidden");

  if (showStatus) status("Reel रोक दी गई।");
}

function loadPhoto(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    status("कृपया केवल image/photo file चुनें।");
    photoInput.value = "";
    return;
  }

  if (photoUrl) URL.revokeObjectURL(photoUrl);

  photoUrl = URL.createObjectURL(file);
  photoLayer.style.backgroundImage = `url("${photoUrl}")`;
  emptyMessage.style.display = "none";
  status("Photo सफलतापूर्वक लोड हो गई।");
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await reelStage.requestFullscreen();
  } catch (error) {
    status("Full Screen इस device/browser में उपलब्ध नहीं है।");
  }
}

photoInput.addEventListener("change", event => {
  loadPhoto(event.target.files[0]);
});

previewButton.addEventListener("click", () => {
  preparePreview();
});

reelPlayButton.addEventListener("click", () => {
  playReel();
});

stopButton.addEventListener("click", () => {
  stopPlayback();
});

fullscreenButton.addEventListener("click", () => {
  toggleFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === reelStage) {
    status("Full Screen सक्रिय है। अब Screen Recorder शुरू करके Play दबाएँ।");
  }
});

window.addEventListener("beforeunload", () => {
  stopPlayback(false);
  if (photoUrl) URL.revokeObjectURL(photoUrl);
});
