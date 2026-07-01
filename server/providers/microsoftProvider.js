const axios = require('axios');

class MicrosoftProvider {
  constructor() {
    this.name = 'Microsoft';
    
    const key1 = process.env.MICROSOFT_TRANSLATOR_KEY || '';
    const key2 = process.env.MICROSOFT_TRANSLATOR_KEY_2 || '';
    this.keys = [key1, key2].map(k => k.trim()).filter(k => k !== '');
    
    this.region = process.env.MICROSOFT_TRANSLATOR_REGION || 'global';
    
    let endpoint = process.env.MICROSOFT_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
    if (endpoint.endsWith('/')) {
      endpoint = endpoint.slice(0, -1);
    }
    this.endpoint = endpoint;
    
    // Capability declarations
    this.supportedLanguages = ['en', 'hi', 'ur', 'fr', 'de', 'es', 'it', 'ru', 'ja', 'zh', 'ar', 'ko', 'pt', 'tr', 'bn', 'ta', 'pa', 'gu', 'ml', 'mr'];
    this.supportsAutoDetect = true;
    this.localeMapping = {
      'zh': 'zh-Hans'
    };
  }

  getName() {
    return this.name;
  }

  isAvailable() {
    return this.keys.length > 0;
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
   * Translate text using Microsoft Azure Translator API
   */
  async translate(text, source, target) {
    if (!this.isAvailable()) {
      throw new Error('Microsoft Translator provider credentials are not configured.');
    }

    const sl = source === 'auto' ? '' : this.normalizeCode(source);
    const tl = this.normalizeCode(target);

    const fromParam = source === 'auto' ? '' : `&from=${sl}`;
    const url = `${this.endpoint}/translate?api-version=3.0${fromParam}&to=${tl}`;

    let lastErr = null;
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      try {
        const response = await axios.post(
          url,
          [{ Text: text }],
          {
            headers: {
              'Ocp-Apim-Subscription-Key': key,
              'Ocp-Apim-Subscription-Region': this.region,
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 seconds timeout
          }
        );

        const data = response.data;
        if (!data || !data[0] || !data[0].translations) {
          throw new Error('Invalid structure returned from Microsoft Translator');
        }

        const translationItem = data[0].translations[0];
        
        // Parse detected language if source was set to auto
        let detectedLanguage = null;
        if (source === 'auto' && data[0].detectedLanguage) {
          detectedLanguage = data[0].detectedLanguage.language;
        }

        return {
          success: true,
          translatedText: translationItem.text,
          detectedLanguage: detectedLanguage,
          provider: this.name
        };
      } catch (err) {
        console.error(`[Microsoft Translator Key ${i + 1} Error] ${err.message}`);
        lastErr = err;
      }
    }

    throw new Error(`Microsoft Translator service error: ${lastErr ? lastErr.message : 'All keys failed'}`);
  }
}

module.exports = new MicrosoftProvider();
