/**
 * Main Application Controller linking APIs, Speech Synthesis, UI events, and storage configurations
 */

document.addEventListener('DOMContentLoaded', () => {
  // Reference languages map cache
  let languagesMap = {};
  
  // Local translation history storage
  // Local translation history storage with try-catch wrap for disabled/private mode safety
  let translationHistory = [];
  try {
    const raw = localStorage.getItem('translation_history');
    if (raw) {
      translationHistory = JSON.parse(raw);
      if (!Array.isArray(translationHistory)) {
        translationHistory = [];
      }
    }
  } catch (err) {
    console.error('Error loading translation history from localStorage:', err);
    translationHistory = [];
  }

  // Handlers mapping for history cards interactions
  const historyHandlers = {
    onLoad: loadHistoryItem,
    onDelete: deleteHistoryItem,
    onCopy: (text) => UI.copyToClipboard(text)
  };

  // Speech callback handlers
  const speechCallbacks = {
    onStart: () => UI.setTTSPlaybackState('playing'),
    onPause: () => UI.setTTSPlaybackState('paused'),
    onResume: () => UI.setTTSPlaybackState('playing'),
    onEnd: () => UI.setTTSPlaybackState('stopped'),
    onError: (err) => {
      UI.setTTSPlaybackState('stopped');
      UI.showToast(`Text-to-speech error: ${err.message || 'playback failure'}`, 'error');
    }
  };

  /* ==========================================================================
     CORE TRANSLATION LIFECYCLE
     ========================================================================== */
  let isTranslating = false;

  async function performTranslation() {
    if (isTranslating) return;

    const text = UI.elements.srcText.value;
    const source = UI.elements.srcLang.value;
    const target = UI.elements.tgtLang.value;
 
    // Validate inputs
    if (!text || text.trim() === '') {
      UI.showToast('Please type some text to translate.', 'warning');
      return;
    }
 
    if (source === target && source !== 'auto') {
      UI.showToast('Source and Target languages must be different.', 'warning');
      return;
    }
 
    // Stop speech synthesis if playing
    SpeechController.stop();
    UI.setTTSPlaybackState('stopped');
 
    try {
      isTranslating = true;
      UI.setLoading(true);
      
      const result = await TranslatorAPI.translateText(text, source, target);
      
      // Update UI translation output
      UI.elements.tgtText.value = result.translatedText;
      UI.setTargetActionsEnabled(true);
      
      // Adjust target textarea height to fit content
      autoResizeTextarea(UI.elements.tgtText);
 
      // Save translation item to history
      saveToHistory({
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        originalText: text,
        translatedText: result.translatedText,
        sourceCode: result.sourceLanguage,
        sourceName: languagesMap[result.sourceLanguage] || result.sourceLanguage,
        targetCode: result.targetLanguage,
        targetName: languagesMap[result.targetLanguage] || result.targetLanguage,
        provider: result.provider || 'Microsoft',
        detectedLanguage: source === 'auto' ? result.sourceLanguage : null,
        characterCount: text.length,
        wordCount: text.trim() === '' ? 0 : text.trim().split(/\s+/).length
      });
 
      if (result.fallbackUsed) {
        UI.showToast('Primary translation failed, fallback utilized.', 'info');
      } else {
        UI.showToast('Text translated successfully!', 'success', 2000);
      }
 
    } catch (error) {
      console.error('Translation process error:', error);
      UI.elements.tgtText.value = '';
      UI.setTargetActionsEnabled(false);
      UI.showToast(error.message || 'An error occurred during translation.', 'error');
    } finally {
      isTranslating = false;
      UI.setLoading(false);
    }
  }

  /* ==========================================================================
     HISTORY PERSISTENCE
     ========================================================================== */
  function saveToHistory(item) {
    // Exclude exact duplicates of the most recent translation to avoid spamming
    if (translationHistory.length > 0) {
      const latest = translationHistory[0];
      if (latest.originalText === item.originalText && 
          latest.sourceCode === item.sourceCode && 
          latest.targetCode === item.targetCode) {
        return;
      }
    }

    // Insert at top of list
    translationHistory.unshift(item);

    // Keep history bounded to max 50 entries
    if (translationHistory.length > 50) {
      translationHistory.pop();
    }

    try {
      localStorage.setItem('translation_history', JSON.stringify(translationHistory));
    } catch (err) {
      console.error('Failed to save translation history to localStorage (quota exceeded or disabled):', err);
      UI.showToast('Unable to save history: storage limit reached.', 'warning');
    }
    
    UI.renderHistory(translationHistory, historyHandlers);
  }

  function deleteHistoryItem(id) {
    translationHistory = translationHistory.filter(item => item.id !== id);
    try {
      localStorage.setItem('translation_history', JSON.stringify(translationHistory));
    } catch (err) {
      console.error('Failed to update translation history after deletion:', err);
    }
    UI.renderHistory(translationHistory, historyHandlers);
    UI.showToast('Translation deleted from history.', 'success', 2000);
  }

  function loadHistoryItem(item) {
    UI.elements.srcText.value = item.originalText;
    UI.elements.tgtText.value = item.translatedText;
    UI.elements.srcLang.value = item.sourceCode;
    UI.elements.tgtLang.value = item.targetCode;

    // Trigger responsive counts, buttons states, height resizing
    UI.updateCounters(item.originalText);
    UI.toggleClearButton(item.originalText);
    UI.setTargetActionsEnabled(true);
    
    autoResizeTextarea(UI.elements.srcText);
    autoResizeTextarea(UI.elements.tgtText);
    
    // Auto scroll view to inputs
    UI.elements.srcText.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Close Drawer
    UI.toggleHistoryDrawer(false);
    UI.showToast('Loaded translation from history', 'info', 1500);
  }

  /* ==========================================================================
     TEXTAREA RESIZING UTILITIES
     ========================================================================== */
  function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  /* ==========================================================================
     INITIALIZATION & LANGUAGE RETRIEVAL
     ========================================================================== */
  async function initializeApplication() {
    UI.initTheme();
    UI.renderHistory(translationHistory, historyHandlers);
    
    try {
      UI.setLoading(true);
      languagesMap = await TranslatorAPI.getSupportedLanguages();
      UI.populateLanguageDropdowns(languagesMap);
    } catch (err) {
      console.error('App init language fetch failure:', err);
      UI.showToast('Unable to fetch language configurations. Running with fallback layout.', 'error');
      
      // Default offline fallback list if connection to routes endpoints fails
      languagesMap = {
        'en': 'English', 'hi': 'Hindi', 'ur': 'Urdu', 'fr': 'French',
        'de': 'German', 'es': 'Spanish', 'it': 'Italian', 'ru': 'Russian',
        'ja': 'Japanese', 'zh': 'Chinese (Simplified)', 'ar': 'Arabic',
        'ko': 'Korean', 'pt': 'Portuguese', 'tr': 'Turkish'
      };
      UI.populateLanguageDropdowns(languagesMap);
    } finally {
      UI.setLoading(false);
    }
  }

  /* ==========================================================================
     EVENT LISTENER COUPLINGS
     ========================================================================== */
  
  // Theme changes
  UI.elements.themeToggleBtn.addEventListener('click', () => UI.toggleTheme());

  // Drawer switches
  UI.elements.toggleHistoryBtn.addEventListener('click', () => UI.toggleHistoryDrawer());
  UI.elements.closeHistoryBtn.addEventListener('click', () => UI.toggleHistoryDrawer(false));
  
  // Clear drawer log database with a premium confirmation modal
  UI.elements.clearHistoryBtn.addEventListener('click', () => {
    UI.showConfirmationModal(
      'Are you sure you want to permanently delete all translation history?',
      () => {
        translationHistory = [];
        try {
          localStorage.removeItem('translation_history');
        } catch (err) {
          console.error('Failed to clear translation history:', err);
        }
        UI.renderHistory(translationHistory, historyHandlers);
        UI.showToast('Translation history cleared successfully.', 'success', 2000);
      }
    );
  });

  // Source text changes / typing
  UI.elements.srcText.addEventListener('input', (e) => {
    const val = e.target.value;
    UI.updateCounters(val);
    UI.toggleClearButton(val);
    autoResizeTextarea(e.target);

    // Disable target outputs if original gets empty
    if (!val || val.trim() === '') {
      UI.elements.tgtText.value = '';
      autoResizeTextarea(UI.elements.tgtText);
      UI.setTargetActionsEnabled(false);
      SpeechController.stop();
      UI.setTTSPlaybackState('stopped');
    }
  });

  // Keyboard translation triggers: Ctrl + Enter
  UI.elements.srcText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      performTranslation();
    }
  });

  // Clear original inputs button
  UI.elements.clearSrcBtn.addEventListener('click', () => {
    UI.elements.srcText.value = '';
    UI.elements.tgtText.value = '';
    UI.updateCounters('');
    UI.toggleClearButton('');
    UI.setTargetActionsEnabled(false);
    
    // Reset heights
    UI.elements.srcText.style.height = '';
    UI.elements.tgtText.style.height = '';
    
    SpeechController.stop();
    UI.setTTSPlaybackState('stopped');
    UI.elements.srcText.focus();
    UI.showToast('Inputs cleared', 'info', 1000);
  });

  // Swap language dropdown values
  UI.elements.swapBtn.addEventListener('click', () => {
    let source = UI.elements.srcLang.value;
    let target = UI.elements.tgtLang.value;
    
    // If source language is 'auto', swap to the current target language
    // and assign a standard fallback to the target selection
    if (source === 'auto') {
      source = target;
      target = 'en'; // default to english target if original was auto detect
    } else {
      // Standard swap values
      const temp = source;
      source = target;
      target = temp;
    }
    
    UI.elements.srcLang.value = source;
    UI.elements.tgtLang.value = target;

    // Swap text areas content
    const srcText = UI.elements.srcText.value;
    const tgtText = UI.elements.tgtText.value;

    if (tgtText && tgtText.trim() !== '') {
      UI.elements.srcText.value = tgtText;
      UI.elements.tgtText.value = srcText;
      
      UI.updateCounters(tgtText);
      UI.toggleClearButton(tgtText);
      
      autoResizeTextarea(UI.elements.srcText);
      autoResizeTextarea(UI.elements.tgtText);
      
      // Stop speech
      SpeechController.stop();
      UI.setTTSPlaybackState('stopped');
    }
    
    UI.showToast('Languages swapped', 'info', 1000);
  });

  // Action Translate Click
  UI.elements.translateBtn.addEventListener('click', performTranslation);

  // Action Duplicate Translation Clipboard Click
  UI.elements.copyBtn.addEventListener('click', () => {
    const text = UI.elements.tgtText.value;
    UI.copyToClipboard(text);
  });

  // Download Output File Click
  UI.elements.downloadBtn.addEventListener('click', () => {
    const text = UI.elements.tgtText.value;
    const source = UI.elements.srcLang.value;
    const target = UI.elements.tgtLang.value;

    if (!text || text.trim() === '') return;

    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `translation-${source}-to-${target}.txt`;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      UI.showToast('File downloaded successfully!', 'success', 2000);
    } catch (err) {
      console.error('File download error:', err);
      UI.showToast('Failed to download translation file.', 'error');
    }
  });

  /* ==========================================================================
     TTS CONTROLLER LIFECYCLE BINDS
     ========================================================================== */
  UI.elements.speakBtn.addEventListener('click', () => {
    const text = UI.elements.tgtText.value;
    const targetCode = UI.elements.tgtLang.value;
    
    if (text && text.trim() !== '') {
      SpeechController.speak(text, targetCode, speechCallbacks);
    }
  });

  UI.elements.pauseBtn.addEventListener('click', () => {
    SpeechController.pause();
  });

  UI.elements.resumeBtn.addEventListener('click', () => {
    SpeechController.resume();
  });

  UI.elements.stopBtn.addEventListener('click', () => {
    SpeechController.stop();
    UI.setTTSPlaybackState('stopped');
  });

  // Close drawer if clicking outside on background dashboard
  document.addEventListener('click', (e) => {
    const drawer = UI.elements.historyDrawer;
    const isClickInside = drawer.contains(e.target) || 
                          UI.elements.toggleHistoryBtn.contains(e.target);
    
    if (!isClickInside && drawer.classList.contains('open')) {
      UI.toggleHistoryDrawer(false);
    }
  });

  // Launch initial settings
  initializeApplication();
});
