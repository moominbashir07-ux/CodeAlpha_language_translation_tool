/**
 * API client layer to communicate with the Express backend translation service
 */
const API_BASE_URL = 'https://translation-backend-9kjo.onrender.com/api';

const TranslatorAPI = {
  /**
   * Fetch the list of supported languages from backend
   * @returns {Promise<Object>} Object mapping lang codes to language names
   */
  async getSupportedLanguages() {
    try {
      const response = await fetch(`${API_BASE_URL}/languages`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch languages');
      }
      return data.languages;
    } catch (error) {
      console.error('Error fetching languages from API:', error);
      throw error;
    }
  },

  /**
   * Send text to translate on backend
   * @param {string} text Source text to translate
   * @param {string} source Source language code
   * @param {string} target Target language code
   * @returns {Promise<Object>} API Translation response
   */
  async translateText(text, source, target) {
    // Basic client validations
    if (!text || text.trim() === '') {
      throw new Error('Please enter some text to translate.');
    }
    if (source === target && source !== 'auto') {
      throw new Error('Source language and target language cannot be the same.');
    }
    if (text.length > 5000) {
      throw new Error('Text exceeds maximum character limit of 5000 characters.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, source, target }),
      });

      const data = await response.json().catch(() => {
        throw new Error('Unable to parse server response.');
      });

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Server responded with status: ${response.status}`);
      }

      return {
        translatedText: data.translatedText,
        sourceLanguage: data.source,
        targetLanguage: data.target,
        provider: data.provider,
        fallbackUsed: data.fallbackUsed
      };
    } catch (error) {
      // Differentiate offline / connection failures
      if (error.message === 'Failed to fetch') {
        throw new Error('Network error: Please check your internet connection.');
      }
      throw error;
    }
  }
};

// Export to global window namespace
window.TranslatorAPI = TranslatorAPI;
