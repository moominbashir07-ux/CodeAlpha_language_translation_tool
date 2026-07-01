const crypto = require('crypto');
const providerManager = require('../providers/providerManager');

const LANGUAGES = {
  'auto': 'Auto Detect',
  'en': 'English',
  'hi': 'Hindi',
  'ur': 'Urdu',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'it': 'Italian',
  'ru': 'Russian',
  'ja': 'Japanese',
  'zh': 'Chinese (Simplified)',
  'ar': 'Arabic',
  'ko': 'Korean',
  'pt': 'Portuguese',
  'tr': 'Turkish',
  'bn': 'Bengali',
  'ta': 'Tamil',
  'pa': 'Punjabi',
  'gu': 'Gujarati',
  'ml': 'Malayalam',
  'mr': 'Marathi'
};

class TranslationService {
  getLanguages() {
    return LANGUAGES;
  }

  /**
   * Helper utility to retry transient network/rate-limit requests with exponential backoff and random jitter
   */
  async retryWithBackoff(fn, retries = 2, delay = 300, correlationId) {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        const isRateLimit = err.response && err.response.status === 429 || 
                            (err.message && /429|limit|exceed/i.test(err.message));
        const isTransient = err.code === 'ECONNABORTED' || 
                            err.code === 'ENOTFOUND' ||
                            (err.message && /timeout|network|econnrefused|econnreset|eai_again/i.test(err.message));

        if (attempt > retries || (!isRateLimit && !isTransient)) {
          throw err;
        }

        const backoffDelay = delay * Math.pow(2, attempt) * (0.5 + Math.random());
        console.warn(`[CID: ${correlationId}] [Retry Attempt ${attempt}/${retries}] Retrying after ${Math.round(backoffDelay)}ms due to error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  /**
   * Run translation task across available providers queue
   */
  async translate(text, source, target, correlationId) {
    const cid = correlationId || crypto.randomUUID();
    
    // 1. Inputs validation checks
    if (!text || text.trim() === '') {
      const err = new Error('Input text cannot be empty.');
      err.status = 400;
      throw err;
    }

    if (!source || !target) {
      const err = new Error('Both source and target languages must be specified.');
      err.status = 400;
      throw err;
    }

    if (source === target && source !== 'auto') {
      const err = new Error('Source language and target language cannot be the same.');
      err.status = 400;
      throw err;
    }

    if (text.length > 5000) {
      const err = new Error('Input text exceeds the maximum limit of 5000 characters.');
      err.status = 400;
      throw err;
    }

    if (!LANGUAGES[source] || !LANGUAGES[target]) {
      const err = new Error('Unsupported language code requested.');
      err.status = 400;
      throw err;
    }

    // 2. Resolve provider execution queue based on language capabilities
    const queue = providerManager.getBestProviderQueue(source, target);
    let lastError = null;

    for (let i = 0; i < queue.length; i++) {
      const provider = queue[i];
      const startTime = Date.now();
      let retryCount = 0;
      
      try {
        // Execute the translation with backoff handling
        const result = await this.retryWithBackoff(async () => {
          return await provider.translate(text, source, target);
        }, 2, 300, cid);

        const duration = Date.now() - startTime;

        // Structured telemetry execution log
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: cid,
          provider: result.provider,
          sourceLanguage: source,
          targetLanguage: target,
          detectedLanguage: result.detectedLanguage || 'N/A',
          durationMs: duration,
          retryCount: retryCount,
          status: 'success',
          statusCode: 200
        }));

        return {
          success: true,
          translatedText: result.translatedText,
          detectedLanguage: result.detectedLanguage || source,
          provider: result.provider,
          correlationId: cid
        };
      } catch (err) {
        lastError = err;
        const duration = Date.now() - startTime;
        const statusCode = err.response ? err.response.status : 500;
        const fallbackReason = err.message || 'Unknown error';

        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: cid,
          provider: provider.getName(),
          sourceLanguage: source,
          targetLanguage: target,
          durationMs: duration,
          retryCount: retryCount,
          status: 'failure',
          statusCode: statusCode,
          fallbackReason: fallbackReason
        }));

        // If there are more providers left in queue, log switching
        if (i < queue.length - 1) {
          const nextProvider = queue[i + 1];
          console.warn(`[CID: ${cid}] ${provider.getName()} failed. Switching to ${nextProvider.getName()}...`);
        }
      }
    }

    // 3. Fallback exhausted
    console.error(`[CID: ${cid}] [Translation Service Exhausted] All providers failed.`);
    const serviceError = new Error('Translation provider unavailable.');
    serviceError.status = 502; // Bad Gateway
    throw serviceError;
  }
}

module.exports = new TranslationService();
