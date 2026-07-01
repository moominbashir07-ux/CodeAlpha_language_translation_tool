const axios = require('axios');

class MyMemoryProvider {
  constructor() {
    this.name = 'MyMemory';
    this.url = 'https://api.mymemory.translated.net/get';
    
    // Capability declarations
    this.supportedLanguages = ['en', 'hi', 'ur', 'fr', 'de', 'es', 'it', 'ru', 'ja', 'zh', 'ar', 'ko', 'pt', 'tr', 'bn', 'ta', 'pa', 'gu', 'ml', 'mr'];
    this.supportsAutoDetect = true;
    this.localeMapping = {
      'zh': 'zh-CN'
    };
  }

  getName() {
    return this.name;
  }

  isAvailable() {
    return true;
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
   * Translate text using MyMemory Translate API
   */
  async translate(text, source, target) {
    const sl = source === 'auto' ? 'autodetect' : this.normalizeCode(source);
    const tl = this.normalizeCode(target);
    const langpair = `${sl}|${tl}`;
    const email = process.env.MYMEMORY_EMAIL || 'mymemory@translator-app.local';

    try {
      const response = await axios.get(this.url, {
        params: {
          q: text,
          langpair: langpair,
          de: email
        },
        timeout: 5000 // 5 seconds timeout
      });

      const data = response.data;

      if (!data) {
        throw new Error('Empty response received from MyMemory');
      }

      // Check if MyMemory returned a rate limit notification inside responseData
      if (typeof data.responseData === 'string' && 
          /limit|exceed|quota|warning/i.test(data.responseData)) {
        throw new Error(`MyMemory limit warning: ${data.responseData}`);
      }

      // MyMemory responds with status 200 inside JSON body data
      if (data.responseStatus && data.responseStatus !== 200) {
        const errorMsg = data.responseDetails || 'Failed request status inside MyMemory';
        throw new Error(errorMsg);
      }

      if (!data.responseData || !data.responseData.translatedText) {
        throw new Error('Invalid structure returned from MyMemory');
      }

      // Try to parse detected language from responseData or matches source segment
      let detectedLanguage = null;
      if (source === 'auto') {
        if (data.responseData && data.responseData.detectedLanguage) {
          detectedLanguage = data.responseData.detectedLanguage.toLowerCase();
        } else if (data.matches && data.matches.length > 0) {
          const primaryMatch = data.matches.find(m => m.source) || data.matches[0];
          if (primaryMatch && typeof primaryMatch.source === 'string') {
            // Normalize e.g. "en-GB" to "en"
            detectedLanguage = primaryMatch.source.split('-')[0].toLowerCase();
          }
        }
      }

      return {
        success: true,
        translatedText: data.responseData.translatedText,
        detectedLanguage: detectedLanguage,
        provider: this.name
      };
    } catch (err) {
      console.error(`[MyMemory Error] ${err.message}`);
      throw new Error(`MyMemory service error: ${err.message}`);
    }
  }
}

module.exports = new MyMemoryProvider();
