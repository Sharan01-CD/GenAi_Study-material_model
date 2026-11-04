// Web Speech API text-to-speech helper

let currentUtterance: SpeechSynthesisUtterance | null = null;

export const speechService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  speak(text: string, onEnd?: () => void, onError?: (err: any) => void): boolean {
    if (!this.isSupported()) return false;

    this.stop();

    try {
      const cleanText = text
        .replace(/[*#`_~]/g, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      if (!cleanText) return false;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Prefer a natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.lang.startsWith('en')) &&
          !v.name.includes('Bad')
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onend = () => {
        currentUtterance = null;
        onEnd?.();
      };

      utterance.onerror = (e) => {
        currentUtterance = null;
        onError?.(e);
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      return false;
    }
  },

  pause(): void {
    if (this.isSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  },

  resume(): void {
    if (this.isSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  },

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    }
  },

  isSpeaking(): boolean {
    return this.isSupported() && window.speechSynthesis.speaking;
  },
};
