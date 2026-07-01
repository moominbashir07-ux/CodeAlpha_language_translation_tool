const axios = require('axios');

class LibreProvider {
  constructor() {
    this.name = 'LibreTranslate';
    this.url = process.env.LIBRE_TRANSLATE_URL || 'https://translate.argosopenteach.com';
    this.apiKey = process.env.LIBRE_TRANSLATE_API_KEY || '';
    
    // Capability declarations
    this.supportedLanguages = ['en', 'ar', 'zh', 'fr', 'de', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'es', 'tr', 'ur'];
    this.supportsAutoDetect = true;
    this.localeMapping = {
      'zh': 'zh'
    };
  }

  getName() {
    return this.name;
  }

  isAvailable() {
    return !!this.url;
  }

  /**
   * Check if the provider supports a language code
   */
  isLanguageSupported(code) {
    if (code === 'auto') return this.supportsAutoDetect;
    return this.supportedLanguages.includes(code);
  }

  /**
   * Normalize language code to provider-specific code
   */
  normalizeCode(code) {
    return this.localeMapping[code] || code;
  }

  /**
   * Translate text using LibreTranslate instance
   */
  async translate(text, source, target) {
    const sl = source === 'auto' ? 'auto' : this.normalizeCode(source);
    const tl = this.normalizeCode(target);
    
    const payload = {
      q: text,
      source: sl,
      target: tl,
      format: 'text'
    };

    if (this.apiKey) {
      payload.api_key = this.apiKey;
    }

    try {
      const response = await axios.post(`${this.url}/translate`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000 // 5 seconds timeout
      });

      if (!response.data || !response.data.translatedText) {
        throw new Error('Invalid structure returned from LibreTranslate API');
      }

      // Check if LibreTranslate detected the language
      let detectedLanguage = null;
      if (source === 'auto' && response.data.detectedLanguage) {
        detectedLanguage = response.data.detectedLanguage.language;
      }

      return {
        success: true,
        translatedText: response.data.translatedText,
        detectedLanguage: detectedLanguage,
        provider: this.name
      };
    } catch (err) {
      console.error(`[LibreTranslate Error] ${err.message}`);
      throw new Error(`LibreTranslate service error: ${err.message}`);
    }
  }
}

module.exports = new LibreProvider();
