const translationService = require('./translationService');

// Quality datasets representing language scripts
const DETECTION_DATASET = [
  { text: 'Hello, how is your day?', lang: 'en', type: 'short' },
  { text: 'Bonjour, comment allez-vous aujourd\'hui?', lang: 'fr', type: 'short' },
  { text: 'Guten Tag, ich hoffe, es geht Ihnen heute sehr gut.', lang: 'de', type: 'short' },
  { text: 'Hola, ¿cómo estás hoy? Espero que todo esté bien con tu trabajo.', lang: 'es', type: 'short' },
  { text: 'Привет, как твои дела сегодня? Надеюсь, погода хорошая.', lang: 'ru', type: 'short' },
  { text: '안녕하세요, 오늘 하루는 어떠신가요? 건강하세요.', lang: 'ko', type: 'short' },
  { text: 'こんにちは、今日の調子はいかがですか？素晴らしい一日を。', lang: 'ja', type: 'short' },
  { text: '你好，你今天怎么样？希望一切顺利。', lang: 'zh', type: 'short' },
  { text: 'नमस्ते, आप कैसे हैं? आशा है कि आपका दिन अच्छा रहेगा।', lang: 'hi', type: 'short' },
  { text: 'سلام، آپ کا دن کیسا گزر رہا ہے؟ امید ہے سب خیریت سے ہوگا۔', lang: 'ur', type: 'short' },
  { text: 'Olá, como vai o seu dia hoje? Espero que esteja tudo bem.', lang: 'pt', type: 'short' },
  { text: 'Merhaba, bugün nasılsınız? Umarım gününüz güzel geçer.', lang: 'tr', type: 'short' },
  { text: 'হ্যালো, আজ আপনার দিনটি কেমন কাটছে? আশা করি ভালো আছেন।', lang: 'bn', type: 'short' },
  { text: 'வணக்கம், இன்று உங்கள் நாள் எப்படி இருக்கிறது? நன்றாக இருக்க நம்புகிறேன்.', lang: 'ta', type: 'short' },
  { text: 'ਹੈਲੋ, ਅੱਜ ਤੁਹਾਡਾ ਦਿਨ ਕਿਵੇਂ ਰਿਹਾ? ਉਮੀਦ ਹੈ ਸਭ ਠੀਕ ਹੋਵੇਗਾ।', lang: 'pa', type: 'short' },
  { text: 'હેલો, આજે તમારો દિવસ કેવો રહ્યો? આશા છે કે બધું સારું છે.', lang: 'gu', type: 'short' },
  { text: 'ഹലോ, ഇന്ന് നിങ്ങളുടെ ദിവസം എങ്ങനെയുണ്ട്? സുഖമാണെന്ന് കരുതുന്നു.', lang: 'ml', type: 'short' },
  { text: 'हॅलो, आज तुमचा दिवस कसा आहे? सर्व काही ठीक असेल अशी आशा आहे.', lang: 'mr', type: 'short' },
  { text: 'Ciao, come va la tua giornata? Spero che vada tutto benissimo.', lang: 'it', type: 'short' },
  { text: 'مرحباً، كيف حالك اليوم؟ أتمنى لك يوماً سعيداً ومليئاً بالنجاح.', lang: 'ar', type: 'short' },
  
  // Mixed / Edge inputs
  { text: 'Click here: https://example.com/translate?lang=fr 🚀', lang: 'en', type: 'url_emoji' },
  { text: 'const x = 5; console.log("Hello World");', lang: 'en', type: 'code' },
  { text: '1234567890', lang: 'en', type: 'numbers' }
];

const SCRIPT_REGEXPS = {
  'ar': /[\u0600-\u06FF]/,
  'ur': /[\u0600-\u06FF]/,
  'hi': /[\u0900-\u097F]/,
  'mr': /[\u0900-\u097F]/,
  'bn': /[\u0980-\u09FF]/,
  'ta': /[\u0B80-\u0BFF]/,
  'gu': /[\u0A80-\u0AFF]/,
  'pa': /[\u0A00-\u0A7F]/,
  'ml': /[\u0D00-\u0D7F]/,
  'zh': /[\u4E00-\u9FFF]/,
  'ja': /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
  'ko': /[\uAC00-\uD7AF]/,
  'ru': /[\u0400-\u04FF]/,
  // Accented Latin ranges check
  'fr': /[éèàùçâêîôûëïüöäßÉÈÀÙÇ]/,
  'de': /[äöüßÄÖÜß]/,
  'es': /[áéíóúñ¿¡ÁÉÍÓÚÑ]/,
  'pt': /[áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]/,
  'it': /[àèéìòùÀÈÉÌÒÙ]/,
  'tr': /[çğışöüÇĞİŞÖÜ]/
};

class QualityValidator {
  /**
   * Run dynamic metrics audits on translation translation script matching and auto-detect outputs
   */
  async runQualityValidation() {
    const results = {
      autoDetection: {
        total: 0,
        correct: 0,
        accuracy: 0,
        failures: []
      },
      scriptValidation: {
        total: 0,
        passed: 0,
        successRate: 0,
        failures: []
      }
    };

    // 1. Auto-Detection Quality Check
    for (const item of DETECTION_DATASET) {
      // Skip numeric sequences and code snippets as they are structurally language-agnostic
      if (item.type === 'numbers' || item.type === 'code') {
        continue;
      }

      results.autoDetection.total++;
      try {
        const res = await translationService.translate(item.text, 'auto', 'en');
        const detected = res.detectedLanguage ? res.detectedLanguage.split('-')[0].toLowerCase() : '';

        if (detected === item.lang) {
          results.autoDetection.correct++;
        } else {
          results.autoDetection.failures.push({
            text: item.text,
            expected: item.lang,
            detected: res.detectedLanguage,
            type: item.type
          });
        }
      } catch (err) {
        results.autoDetection.failures.push({
          text: item.text,
          expected: item.lang,
          detected: 'Error',
          error: err.message,
          type: item.type
        });
      }
    }
    
    results.autoDetection.accuracy = results.autoDetection.total > 0 
      ? parseFloat(((results.autoDetection.correct / results.autoDetection.total) * 100).toFixed(2)) 
      : 0;

    // 2. Script Validation Check (Translating English text into target languages)
    const englishSource = 'My father is very happy and active today. We are going to a café.';
    const targets = Object.keys(SCRIPT_REGEXPS);

    for (const target of targets) {
      results.scriptValidation.total++;
      try {
        const res = await translationService.translate(englishSource, 'en', target);
        
        if (!res.translatedText || res.translatedText.trim() === '') {
          throw new Error('Received empty translation output');
        }
        
        // Safeguard check against un-translated source pass-throughs
        if (res.translatedText.trim().toLowerCase() === englishSource.toLowerCase()) {
          throw new Error('Bypassed translation: returned identical input source');
        }

        const regex = SCRIPT_REGEXPS[target];
        if (regex.test(res.translatedText)) {
          results.scriptValidation.passed++;
        } else {
          results.scriptValidation.failures.push({
            target,
            translatedText: res.translatedText,
            reason: `Unicode script mismatch: text does not match script pattern ${regex.toString()}`
          });
        }
      } catch (err) {
        results.scriptValidation.failures.push({
          target,
          translatedText: 'N/A',
          reason: err.message
        });
      }
    }

    results.scriptValidation.successRate = results.scriptValidation.total > 0 
      ? parseFloat(((results.scriptValidation.passed / results.scriptValidation.total) * 100).toFixed(2)) 
      : 0;

    return results;
  }
}

module.exports = new QualityValidator();
