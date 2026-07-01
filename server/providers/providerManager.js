const libreProvider = require('./libreProvider');
const mymemoryProvider = require('./mymemoryProvider');
const microsoftProvider = require('./microsoftProvider');

class ProviderManager {
  constructor() {
    this.providers = {
      'libre': libreProvider,
      'mymemory': mymemoryProvider,
      'microsoft': microsoftProvider
    };
  }

  /**
   * Returns a list of available providers, starting with the primary provider set in .env
   * @returns {Array} List of active providers in order of fallback priority
   */
  getPriorityQueue() {
    const queue = [];
    const configProvider = (process.env.TRANSLATION_PROVIDER || 'libre').toLowerCase();
    
    // 1. Add configured primary provider first if available
    const primary = this.providers[configProvider];
    if (primary && primary.isAvailable()) {
      queue.push(primary);
    }

    // 2. Add remaining available providers as fallback options
    const fallbackOrder = ['libre', 'mymemory', 'microsoft'];
    for (const key of fallbackOrder) {
      if (key !== configProvider) {
        const provider = this.providers[key];
        if (provider && provider.isAvailable()) {
          queue.push(provider);
        }
      }
    }

    // 3. Absolute safety fallback (MyMemory requires zero configurations and is always online)
    if (queue.length === 0) {
      queue.push(mymemoryProvider);
    }

    return queue;
  }

  /**
   * Returns a capability-filtered priority list of active providers supporting the specific language pair
   * @param {string} source Source language code or 'auto'
   * @param {string} target Target language code
   * @returns {Array} List of filtered active providers in fallback priority order
   */
  getBestProviderQueue(source, target) {
    const configProvider = (process.env.TRANSLATION_PROVIDER || 'libre').toLowerCase();
    
    // Filter providers that are available and support the requested language pair
    const candidates = Object.values(this.providers).filter(provider => {
      return provider.isAvailable() && 
             provider.isLanguageSupported(source) && 
             provider.isLanguageSupported(target);
    });

    const queue = [];

    // Prioritize the configured preferred provider if it is available and qualified
    const primary = this.providers[configProvider];
    if (primary && candidates.includes(primary)) {
      queue.push(primary);
    }

    // Add remaining qualified candidates
    candidates.forEach(provider => {
      if (!queue.includes(provider)) {
        queue.push(provider);
      }
    });

    // absolute safety fallback
    if (queue.length === 0) {
      queue.push(mymemoryProvider);
    }

    return queue;
  }
}

module.exports = new ProviderManager();
