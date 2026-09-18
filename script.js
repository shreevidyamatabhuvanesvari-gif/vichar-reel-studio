(() => {
"use strict";

const $ = id => document.getElementById(id);
const image = $("image");
const photo = $("photo");
const text = $("text");
const lang = $("lang");
const current = $("current");
const empty = $("empty");
const stage = $("stage");
const play = $("play");
const pause = $("pause");
const stop = $("stop");
const fullscreen = $("fullscreen");
const record = $("record");
const voiceLabel = $("voice");
const status = $("status");

let imageUrl = "";
let lines = [];
let index = 0;
let speaking = false;
let paused = false;
let voice = null;

function setStatus(message, error = false) {
  status.textContent = message;
  status.style.color = error ? "#ff9eae" : "#9fe7bd";
}

function findVoice() {
  const voices = speechSynthesis.getVoices();
  const isSanskrit = lang.value === "sa-IN";
  const languages = isSanskrit ? ["sa", "hi", "en"] : ["hi", "en"];

  const matching = voices.filter(v =>
    languages.some(code => v.lang.toLowerCase().startsWith(code))
  );

  voice =
    matching.find(v =>
      /female|woman|girl|heera|kalpana|lekha|samantha|google हिन्दी/i.test(v.name)
    ) ||
    matching.find(v => v.lang.toLowerCase().startsWith(lang.value.slice(0, 2))) ||
    matching[0] ||
    null;

  voiceLabel.textContent = voice
    ? `आवाज़: ${voice.name} (${voice.lang})`
    : "इस ब्राउज़र में उपयुक्त TTS voice उपलब्ध नहीं";
}

function prepare() {
  lines = text.value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) throw Error("कम-से-कम एक पंक्ति लिखें।");

  if (!imageUrl) throw Error("पहले फोटो चुनें।");

  index = 0;
}

function speakNext() {
  if (!speaking || paused) return;

  if (index >= lines.length) {
    speaking = false;
    setStatus("रील समाप्त हुई।");
    return;
  }

  current.textContent = lines[index];

  const utterance = new SpeechSynthesisUtterance(lines[index]);
  utterance.lang = lang.value;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  if (voice) utterance.voice = voice;

  utterance.onend = () => {
    if (!speaking) return;
    index++;
    speakNext();
  };

  utterance.onerror = event => {
    speaking = false;
    paused = false;
    setStatus(`TTS त्रुटि: ${event.error || "अज्ञात त्रुटि"}`, true);
  };

  speechSynthesis.speak(utterance);
}

function startSpeech() {
  if (!("speechSynthesis" in window)) {
    setStatus("इस browser में TTS उपलब्ध नहीं है।", true);
    return;
  }

  try {
    prepare();
  } catch (error) {
    setStatus(error.message, true);
    return;
  }

  speechSynthesis.cancel();
  speaking = true;
  paused = false;
  setStatus("TTS चल रहा है…");
  speakNext();
}

function stopSpeech() {
  speechSynthesis.cancel();
  speaking = false;
  paused = false;
  index = 0;
  current.textContent = "";
  setStatus("रोक दिया गया।");
}

image.onchange = () => {
  const file = image.files[0];
  if (!file) return;

  if (imageUrl) URL.revokeObjectURL(imageUrl);

  imageUrl = URL.createObjectURL(file);
  photo.src = imageUrl;
  photo.style.display = "block";
  empty.style.display = "none";
  setStatus("फोटो तैयार है।");
};

lang.onchange = () => {
  findVoice();
  if (speaking) stopSpeech();
};

text.oninput = () => {
  if (!speaking) {
    const firstLine = text.value
      .split(/\n+/)
      .map(line => line.trim())
      .find(Boolean) || "";

    current.textContent = firstLine;
  }
};

play.onclick = startSpeech;

pause.onclick = () => {
  if (!speaking) return;

  if (paused) {
    paused = false;
    speechSynthesis.resume();
    setStatus("फिर से चल रहा है…");
    return;
  }

  paused = true;
  speechSynthesis.pause();
  setStatus("पॉज़ किया गया।");
};

stop.onclick = stopSpeech;

fullscreen.onclick = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (stage.requestFullscreen) {
      await stage.requestFullscreen();
    } else {
      setStatus("इस browser में fullscreen उपलब्ध नहीं है।", true);
    }
  } catch {
    setStatus("Fullscreen शुरू नहीं हो सका।", true);
  }
};

record.onclick = () => {
  stage.classList.toggle("recording");

  const active = stage.classList.contains("recording");
  document.querySelector(".controls").style.opacity = active ? ".35" : "1";

  setStatus(
    active
      ? "रिकॉर्डिंग मोड: अब मोबाइल Screen Recorder शुरू करें।"
      : "सामान्य मोड।"
  );
};

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = findVoice;
  findVoice();
} else {
  voiceLabel.textContent = "इस browser में Speech Synthesis उपलब्ध नहीं है।";
  play.disabled = true;
  pause.disabled = true;
  stop.disabled = true;
}

window.addEventListener("pagehide", () => {
  speechSynthesis?.cancel();
  if (imageUrl) URL.revokeObjectURL(imageUrl);
});

})();
