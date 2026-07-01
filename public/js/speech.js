/**
 * Speech module wrapping browser SpeechSynthesis API with full audio flow control
 */

const LanguageLocaleMap = {
  'en': 'en-US',
  'hi': 'hi-IN',
  'ur': 'ur-PK',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'es': 'es-ES',
  'it': 'it-IT',
  'ru': 'ru-RU',
  'ja': 'ja-JP',
  'zh': 'zh-CN',
  'ar': 'ar-SA',
  'ko': 'ko-KR',
  'pt': 'pt-PT',
  'tr': 'tr-TR',
  'bn': 'bn-IN',
  'ta': 'ta-IN',
  'pa': 'pa-IN',
  'gu': 'gu-IN',
  'ml': 'ml-IN',
  'mr': 'mr-IN'
};

const SpeechController = {
  utterance: null,
  isSpeaking: false,
  isPaused: false,

  /**
   * Check if speech synthesis is supported in current browser
   */
  isSupported() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  },

  /**
   * Speak translation text with a matching localized voice
   * @param {string} text Text to vocalize
   * @param {string} langCode 2-character language code (e.g. 'hi')
   * @param {Object} callbacks Event lifecycle callbacks
   */
  speak(text, langCode, callbacks = {}) {
    if (!this.isSupported()) {
      if (callbacks.onError) callbacks.onError(new Error('Speech synthesis not supported in this browser.'));
      return;
    }

    // Terminate any active speaking
    this.stop();

    if (!text || text.trim() === '') return;

    try {
      this.utterance = new SpeechSynthesisUtterance(text);
      
      // Determine correct voice locale
      const locale = LanguageLocaleMap[langCode] || langCode;
      
      // Attempt to assign matching voice from browser
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = voices.find(v => v.lang.toLowerCase() === locale.toLowerCase()) ||
                         voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
      
      if (selectedVoice) {
        this.utterance.voice = selectedVoice;
      }
      this.utterance.lang = locale;

      // Event binds
      this.utterance.onstart = () => {
        this.isSpeaking = true;
        this.isPaused = false;
        if (callbacks.onStart) callbacks.onStart();
      };

      this.utterance.onend = () => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.utterance = null;
        if (callbacks.onEnd) callbacks.onEnd();
      };

      this.utterance.onerror = (e) => {
        // Ignore user cancellation errors
        if (e.error !== 'interrupted') {
          this.isSpeaking = false;
          this.isPaused = false;
          this.utterance = null;
          if (callbacks.onError) callbacks.onError(e);
        }
      };

      this.utterance.onpause = () => {
        this.isPaused = true;
        if (callbacks.onPause) callbacks.onPause();
      };

      this.utterance.onresume = () => {
        this.isPaused = false;
        if (callbacks.onResume) callbacks.onResume();
      };

      window.speechSynthesis.speak(this.utterance);
    } catch (err) {
      console.error('Speech Synthesis initialization error:', err);
      if (callbacks.onError) callbacks.onError(err);
    }
  },

  /**
   * Pause vocal playback
   */
  pause() {
    if (!this.isSupported()) return;
    if (this.isSpeaking && !this.isPaused) {
      window.speechSynthesis.pause();
    }
  },

  /**
   * Resume vocal playback from pause state
   */
  resume() {
    if (!this.isSupported()) return;
    if (this.isSpeaking && this.isPaused) {
      window.speechSynthesis.resume();
    }
  },

  /**
   * Cancel speak playback entirely
   */
  stop() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.isPaused = false;
    this.utterance = null;
  }
};

// Export to global window namespace
window.SpeechController = SpeechController;
