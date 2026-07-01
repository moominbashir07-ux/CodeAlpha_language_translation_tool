const translationService = require('./translationService');
const providerManager = require('../providers/providerManager');

class StressTester {
  /**
   * Run high concurrency translation simulations
   * @param {number} concurrency Concurrency worker count
   * @param {number} durationSeconds Duration of worker loops in seconds
   * @param {boolean} useMock If true, intercept provider HTTP queries with low-latency local simulations
   */
  async runStressTest(concurrency = 10, durationSeconds = 3, useMock = true) {
    const originalProviders = { ...providerManager.providers };

    // Setup Mock providers to bypass external limits and prevent 429 quota exhaustion
    if (useMock) {
      providerManager.providers = {
        'libre': {
          getName: () => 'LibreTranslateMock',
          isAvailable: () => true,
          isLanguageSupported: (code) => {
            const unsupported = ['bn', 'ta', 'pa', 'gu', 'ml', 'mr'];
            return !unsupported.includes(code);
          },
          translate: async (text, src, tgt) => {
            // Simulate network latency
            await new Promise(r => setTimeout(r, 40 + Math.random() * 40));
            // Simulate random failure (5% chance)
            if (Math.random() < 0.05) {
              throw new Error('Mock LibreTranslate failed: getaddrinfo ENOTFOUND');
            }
            return {
              success: true,
              translatedText: `[Mock Libre: ${tgt}] ${text}`,
              detectedLanguage: src === 'auto' ? 'en' : src,
              provider: 'LibreTranslateMock'
            };
          }
        },
        'mymemory': {
          getName: () => 'MyMemoryMock',
          isAvailable: () => true,
          isLanguageSupported: () => true,
          translate: async (text, src, tgt) => {
            await new Promise(r => setTimeout(r, 60 + Math.random() * 50));
            // Simulate rate limits (3% chance)
            if (Math.random() < 0.03) {
              throw new Error('Mock MyMemory failed: status code 429');
            }
            return {
              success: true,
              translatedText: `[Mock MyMemory: ${tgt}] ${text}`,
              detectedLanguage: src === 'auto' ? 'en' : src,
              provider: 'MyMemoryMock'
            };
          }
        },
        'microsoft': {
          getName: () => 'MicrosoftMock',
          isAvailable: () => true,
          isLanguageSupported: () => true,
          translate: async (text, src, tgt) => {
            await new Promise(r => setTimeout(r, 30 + Math.random() * 30));
            return {
              success: true,
              translatedText: `[Mock Microsoft: ${tgt}] ${text}`,
              detectedLanguage: src === 'auto' ? 'en' : src,
              provider: 'MicrosoftMock'
            };
          }
        }
      };
    }

    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    const initialMemory = process.memoryUsage();
    
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalLatency = 0;

    const languages = ['en', 'hi', 'fr', 'de', 'es', 'it', 'ru', 'ja', 'zh', 'ko', 'pt', 'tr', 'bn', 'ta', 'pa', 'gu', 'ml', 'mr'];
    const testPhrases = [
      'Hello world', 'How are you today?', 'Verify translation pipelines', 'Production audit log',
      'Observability system logging', 'Exponential backoff retries', 'Memory leaks checking',
      'RTL language text validation', 'Concurrencies test'
    ];

    // Capture unhandled promise rejections
    let unhandledRejectionsCount = 0;
    const rejectionHandler = (reason, promise) => {
      unhandledRejectionsCount++;
    };
    process.on('unhandledRejection', rejectionHandler);

    // Active workers list
    const workers = [];
    const runWorker = async () => {
      while (Date.now() < endTime) {
        const text = testPhrases[Math.floor(Math.random() * testPhrases.length)];
        const source = Math.random() < 0.2 ? 'auto' : languages[Math.floor(Math.random() * languages.length)];
        let target = languages[Math.floor(Math.random() * languages.length)];
        if (source === target) {
          target = target === 'en' ? 'es' : 'en';
        }

        totalRequests++;
        const reqStart = Date.now();
        try {
          const res = await translationService.translate(text, source, target);
          totalLatency += (Date.now() - reqStart);
          if (res.success) {
            successfulRequests++;
          }
        } catch (err) {
          failedRequests++;
          totalLatency += (Date.now() - reqStart);
        }
      }
    };

    // Spawn concurrent virtual clients
    for (let i = 0; i < concurrency; i++) {
      workers.push(runWorker());
    }

    // Wait for stress period to complete
    await Promise.all(workers);

    // Tear down tracking listeners & restore original providers
    process.off('unhandledRejection', rejectionHandler);
    providerManager.providers = originalProviders;

    const finalMemory = process.memoryUsage();
    const durationMs = Date.now() - startTime;

    return {
      concurrency,
      durationMs,
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? parseFloat(((successfulRequests / totalRequests) * 100).toFixed(2)) : 0,
      avgLatencyMs: totalRequests > 0 ? parseFloat((totalLatency / totalRequests).toFixed(1)) : 0,
      unhandledRejectionsCount,
      memoryInitialRssMb: parseFloat((initialMemory.rss / 1024 / 1024).toFixed(2)),
      memoryFinalRssMb: parseFloat((finalMemory.rss / 1024 / 1024).toFixed(2)),
      memoryGrowthRssMb: parseFloat(((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2)),
      memoryInitialHeapMb: parseFloat((initialMemory.heapUsed / 1024 / 1024).toFixed(2)),
      memoryFinalHeapMb: parseFloat((finalMemory.heapUsed / 1024 / 1024).toFixed(2)),
      memoryGrowthHeapMb: parseFloat(((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2))
    };
  }
}

module.exports = new StressTester();
