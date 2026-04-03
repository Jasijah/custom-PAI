export type TtsProvider = "nvidia" | "browser";

export type SynthesizeParams = {
  text: string;
  provider: TtsProvider;
  browserVoiceUri: string;
  rate: number;
  pitch: number;
  nvidiaVoice: string;
};

function playAudioFromBase64(base64Data: string, mimeType = "audio/wav") {
  const src = `data:${mimeType};base64,${base64Data}`;
  const audio = new Audio(src);
  void audio.play();
}

async function synthesizeWithNvidia(text: string, voice: string): Promise<boolean> {
  const apiKey = (import.meta.env.VITE_NVIDIA_API_KEY as string | undefined)?.trim();
  if (!apiKey) return false;

  const endpoint =
    (import.meta.env.VITE_NVIDIA_TTS_URL as string | undefined)?.trim() ||
    "https://integrate.api.nvidia.com/v1/audio/speech";

  const model =
    (import.meta.env.VITE_NVIDIA_TTS_MODEL as string | undefined)?.trim() ||
    "nvidia/llama-3.1-nemotron-mini-4b-instruct";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: "wav",
      }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { audio?: string; data?: string };
    const audio = data.audio ?? data.data;
    if (!audio) return false;
    playAudioFromBase64(audio, "audio/wav");
    return true;
  } catch {
    return false;
  }
}

function synthesizeWithBrowser(params: SynthesizeParams): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(params.text);
  utterance.rate = params.rate;
  utterance.pitch = params.pitch;
  const match = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.voiceURI === params.browserVoiceUri);
  if (match) utterance.voice = match;
  window.speechSynthesis.speak(utterance);
  return true;
}

export async function synthesizeSpeech(params: SynthesizeParams): Promise<TtsProvider | null> {
  if (params.provider === "nvidia") {
    const ok = await synthesizeWithNvidia(params.text, params.nvidiaVoice);
    if (ok) return "nvidia";
  }
  const browserOk = synthesizeWithBrowser(params);
  return browserOk ? "browser" : null;
}
