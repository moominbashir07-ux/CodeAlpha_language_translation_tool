const translationService = require('./translationService');

// Native test phrase for every supported language
const TEST_PHRASES = {
  'en': 'Hello, how are you today?',
  'hi': 'नमस्ते, आज आप कैसे हैं?',
  'ur': 'ہیلو، آج آپ کیسے ہیں؟',
  'fr': 'Bonjour, comment ça va aujourd\'hui?',
  'de': 'Hallo, wie geht es dir heute?',
  'es': 'Hola, ¿cómo estás hoy?',
  'it': 'Ciao, come stai oggi?',
  'ru': 'Привет, как дела сегодня?',
  'ja': 'こんにちは、今日の調子はいかがですか？',
  'zh': '你好，你今天怎么样？',
  'ar': 'مرحباً، كيف حالك اليوم؟',
  'ko': '안녕하세요, 오늘 어떻게 지내세요?',
  'pt': 'Olá, como você está hoje?',
  'tr': 'Merhaba, bugün nasılsın?',
  'bn': 'হ্যালো, আজ আপনি কেমন আছেন?',
  'ta': 'ஹலோ, இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?',
  'pa': 'ਹੈਲੋ, ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?',
  'gu': 'હેલો, આજે તમે કેમ છો?',
  'ml': 'ഹലോ, ഇന്ന് നിങ്ങൾക്ക് സുഖമാണോ?',
  'mr': 'हॅलो, आज तुम्ही कसे आहात?'
};

class MatrixValidator {
  /**
   * Concurrency mapper utility to throttle active requests pool
   */
  async runThrottled(tasks, limit, fn) {
    const results = [];
    const executing = [];
    for (const item of tasks) {
      const p = Promise.resolve().then(() => fn(item));
      results.push(p);
      if (limit <= tasks.length) {
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }
    }
    return Promise.all(results);
  }

  /**
   * Validate every language translation pair in matrix
   */
  async validateAll() {
    const languages = Object.keys(TEST_PHRASES);
    const tasks = [];
    
    // Create all permutation pairs excluding self-translation
    for (const source of languages) {
      for (const target of languages) {
        if (source !== target) {
          tasks.push({ source, target });
        }
      }
    }

    let successes = 0;
    let failuresCount = 0;
    const failuresList = [];
    const providersUsed = new Set();
    const startTime = Date.now();

    console.log(`Starting translation validation matrix tests (${tasks.length} pairs)...`);

    // Execute matrix checks with concurrency limit of 10
    await this.runThrottled(tasks, 10, async (task) => {
      const { source, target } = task;
      const text = TEST_PHRASES[source];

      try {
        const result = await translationService.translate(text, source, target);
        
        if (result && result.success && result.translatedText) {
          successes++;
          providersUsed.add(result.provider);
        } else {
          throw new Error('Received empty translation response');
        }
      } catch (err) {
        failuresCount++;
        failuresList.push({
          source,
          target,
          error: err.message || 'Unknown error'
        });
      }
    });

    // Test Language Auto-Detection Accuracy
    let detectedMatches = 0;
    const detectionFailures = [];

    await this.runThrottled(languages, 10, async (source) => {
      const text = TEST_PHRASES[source];
      try {
        // Translate from 'auto' to another language (e.g. English) to trigger detection
        const target = source === 'en' ? 'es' : 'en';
        const result = await translationService.translate(text, 'auto', target);
        
        // Normalize detected language code (e.g. "zh-Hans" or "en-US" to "zh", "en")
        const detected = result.detectedLanguage ? result.detectedLanguage.split('-')[0].toLowerCase() : '';
        
        if (detected === source) {
          detectedMatches++;
        } else {
          detectionFailures.push({
            source,
            detected: result.detectedLanguage,
            expected: source
          });
        }
      } catch (err) {
        detectionFailures.push({
          source,
          detected: 'Error',
          expected: source,
          error: err.message
        });
      }
    });

    const totalAttempts = tasks.length;
    const successRate = totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
    const detectionAccuracy = languages.length > 0 ? (detectedMatches / languages.length) * 100 : 0;

    return {
      success: failuresCount === 0,
      totalAttempts,
      successes,
      failuresCount,
      successRate: parseFloat(successRate.toFixed(2)),
      detectionAccuracy: parseFloat(detectionAccuracy.toFixed(2)),
      providersTested: Array.from(providersUsed),
      failuresList,
      detectionFailures,
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = new MatrixValidator();
