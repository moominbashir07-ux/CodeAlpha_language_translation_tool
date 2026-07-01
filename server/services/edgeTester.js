const translationService = require('./translationService');

class EdgeTester {
  async runEdgeTests() {
    const results = {
      total: 0,
      passed: 0,
      failures: []
    };

    const runTest = async (name, fn) => {
      results.total++;
      try {
        await fn();
        results.passed++;
      } catch (err) {
        results.failures.push({
          testName: name,
          error: err.message
        });
      }
    };

    // 1. Empty strings
    await runTest('Empty input text check', async () => {
      try {
        await translationService.translate('', 'en', 'es');
        throw new Error('Allowed empty string text inputs');
      } catch (err) {
        if (!err.message.includes('cannot be empty')) {
          throw err;
        }
      }
    });

    // 2. Spaces only
    await runTest('Whitespace-only input check', async () => {
      try {
        await translationService.translate('    ', 'en', 'es');
        throw new Error('Allowed whitespace-only inputs');
      } catch (err) {
        if (!err.message.includes('cannot be empty')) {
          throw err;
        }
      }
    });

    // 3. Overflow input characters
    await runTest('Overflow characters check (> 5000 chars)', async () => {
      try {
        const largeText = 'a'.repeat(5001);
        await translationService.translate(largeText, 'en', 'es');
        throw new Error('Allowed oversized inputs');
      } catch (err) {
        if (!err.message.includes('exceeds the maximum limit')) {
          throw err;
        }
      }
    });

    // 4. Same source and target
    await runTest('Same source/target language check', async () => {
      try {
        await translationService.translate('Hello', 'en', 'en');
        throw new Error('Allowed translating to the identical language');
      } catch (err) {
        if (!err.message.includes('cannot be the same')) {
          throw err;
        }
      }
    });

    // 5. Invalid source language code
    await runTest('Invalid source language code check', async () => {
      try {
        await translationService.translate('Hello', 'invalid_code', 'es');
        throw new Error('Allowed invalid source language code');
      } catch (err) {
        if (!err.message.includes('Unsupported language code')) {
          throw err;
        }
      }
    });

    // 6. Invalid target language code
    await runTest('Invalid target language code check', async () => {
      try {
        await translationService.translate('Hello', 'en', 'invalid_code');
        throw new Error('Allowed invalid target language code');
      } catch (err) {
        if (!err.message.includes('Unsupported language code')) {
          throw err;
        }
      }
    });

    // 7. HTML tags and markdown preservation
    await runTest('HTML and Markdown input sanitization checks', async () => {
      const res = await translationService.translate('<p>Hello 🚀</p>', 'en', 'es');
      if (!res.translatedText || !res.success) {
        throw new Error('Failed translating text with HTML tags');
      }
    });

    return {
      success: results.failures.length === 0,
      total: results.total,
      passed: results.passed,
      failuresCount: results.failures.length,
      failuresList: results.failures
    };
  }
}

module.exports = new EdgeTester();
