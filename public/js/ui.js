/**
 * UI Controller module managing transitions, overlays, counters, toast alerts, history rendering, and copy animations
 */

const UI = {
  // Elements references
  elements: {
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    historyDrawer: document.getElementById('historyDrawer'),
    historyList: document.getElementById('historyList'),
    
    srcText: document.getElementById('srcText'),
    tgtText: document.getElementById('tgtText'),
    clearSrcBtn: document.getElementById('clearSrcBtn'),
    wordCount: document.getElementById('wordCount'),
    charCount: document.getElementById('charCount'),
    
    srcLang: document.getElementById('srcLang'),
    tgtLang: document.getElementById('tgtLang'),
    swapBtn: document.getElementById('swapBtn'),
    translateBtn: document.getElementById('translateBtn'),
    spinnerInline: document.getElementById('spinnerInline'),
    loaderOverlay: document.getElementById('loaderOverlay'),
    
    speakBtn: document.getElementById('speakBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    stopBtn: document.getElementById('stopBtn'),
    ttsSubControls: document.getElementById('ttsSubControls'),
    
    downloadBtn: document.getElementById('downloadBtn'),
    copyBtn: document.getElementById('copyBtn'),
    toastContainer: document.getElementById('toastContainer'),
    
    confirmationModal: document.getElementById('confirmationModal'),
    confirmModalBtn: document.getElementById('confirmModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    modalMessage: document.getElementById('modalMessage')
  },

  /**
   * Escape HTML special characters to prevent cross-site scripting (XSS)
   * @param {string} str Input string to escape
   * @returns {string} Clean escaped string
   */
  escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  },

  /**
   * Display a clean toast notification banner
   * @param {string} message Text message
   * @param {string} type Alert type: 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration Timeout in ms
   */
  showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon selection
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';
    if (type === 'warning') iconClass = 'fa-circle-exclamation';
    
    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${this.escapeHTML(message)}</span>
    `;
    
    this.elements.toastContainer.appendChild(toast);
    
    // Trigger slide out and delete
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  },

  /**
   * Modify UI layout loading indicators
   * @param {boolean} isLoading Loading active state flag
   */
  setLoading(isLoading) {
    if (isLoading) {
      this.elements.loaderOverlay.classList.remove('hidden');
      this.elements.spinnerInline.classList.remove('hidden');
      this.elements.translateBtn.disabled = true;
      this.elements.translateBtn.querySelector('.btn-text').textContent = 'Translating...';
      this.elements.translateBtn.querySelector('.btn-icon').classList.add('hidden');
      
      // Prevent source input during runtime
      this.elements.srcText.disabled = true;
      this.elements.srcLang.disabled = true;
      this.elements.tgtLang.disabled = true;
      this.elements.swapBtn.disabled = true;
      this.elements.clearSrcBtn.classList.remove('visible');
    } else {
      this.elements.loaderOverlay.classList.add('hidden');
      this.elements.spinnerInline.classList.add('hidden');
      this.elements.translateBtn.disabled = false;
      this.elements.translateBtn.querySelector('.btn-text').textContent = 'Translate';
      this.elements.translateBtn.querySelector('.btn-icon').classList.remove('hidden');
      
      this.elements.srcText.disabled = false;
      this.elements.srcLang.disabled = false;
      this.elements.tgtLang.disabled = false;
      this.elements.swapBtn.disabled = false;
      this.toggleClearButton(this.elements.srcText.value);
    }
  },

  /**
   * Recalculate word counts and character limits
   * @param {string} text Text content to process
   */
  updateCounters(text) {
    const chars = text.length;
    // Word counter matching regex bounds
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    
    this.elements.charCount.textContent = `${chars} / 5000 characters`;
    this.elements.wordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;

    if (chars > 4500) {
      this.elements.charCount.style.color = '#ef4444'; // Red alert warning for size
    } else {
      this.elements.charCount.style.color = '';
    }
  },

  /**
   * Show/hide source panel clear button
   * @param {string} text Source textarea input
   */
  toggleClearButton(text) {
    if (text && text.trim() !== '' && !this.elements.srcText.disabled) {
      this.elements.clearSrcBtn.classList.add('visible');
    } else {
      this.elements.clearSrcBtn.classList.remove('visible');
    }
  },

  /**
   * Action utility to copy text to clipboard with micro animations
   * @param {string} text Text to duplicate
   */
  async copyToClipboard(text) {
    if (!text || text.trim() === '') return;

    try {
      await navigator.clipboard.writeText(text);
      
      const copyBtn = this.elements.copyBtn;
      const originalHTML = copyBtn.innerHTML;
      
      copyBtn.classList.add('success');
      copyBtn.innerHTML = `
        <i class="fa-solid fa-check"></i>
        <span class="copy-text">Copied ✓</span>
      `;
      this.showToast('Translation copied to clipboard!', 'success', 2000);
      
      // Restore default state
      setTimeout(() => {
        copyBtn.classList.remove('success');
        copyBtn.innerHTML = originalHTML;
      }, 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      this.showToast('Unable to copy text. Please copy manually.', 'error');
    }
  },

  /**
   * Sync buttons based on SpeechSynthesis engine states
   * @param {string} state Current play state: 'stopped' | 'playing' | 'paused'
   */
  setTTSPlaybackState(state) {
    if (state === 'playing') {
      this.elements.ttsSubControls.classList.remove('hidden');
      this.elements.pauseBtn.classList.remove('hidden');
      this.elements.resumeBtn.classList.add('hidden');
      this.elements.speakBtn.classList.add('hidden');
    } else if (state === 'paused') {
      this.elements.ttsSubControls.classList.remove('hidden');
      this.elements.pauseBtn.classList.add('hidden');
      this.elements.resumeBtn.classList.remove('hidden');
      this.elements.speakBtn.classList.add('hidden');
    } else {
      // Stopped / Ended
      this.elements.ttsSubControls.classList.add('hidden');
      this.elements.speakBtn.classList.remove('hidden');
    }
  },

  /**
   * Toggle dynamic action items if output content updates
   * @param {boolean} enabled Enable/Disable translated actions controls
   */
  setTargetActionsEnabled(enabled) {
    this.elements.copyBtn.disabled = !enabled;
    this.elements.speakBtn.disabled = !enabled;
    this.elements.downloadBtn.disabled = !enabled;
  },

  /**
   * Populate source/target language selects
   * @param {Object} languages Map of codes to display names
   */
  populateLanguageDropdowns(languages) {
    const srcSelect = this.elements.srcLang;
    const tgtSelect = this.elements.tgtLang;
    
    // Clear dynamic options while preserving first static ones
    srcSelect.innerHTML = '<option value="auto">Auto Detect</option>';
    tgtSelect.innerHTML = '';
    
    Object.entries(languages).forEach(([code, name]) => {
      if (code === 'auto') return; // Handled separately
      
      const optionSrc = new Option(name, code);
      const optionTgt = new Option(name, code);
      
      srcSelect.add(optionSrc);
      tgtSelect.add(optionTgt);
    });

    // Default select selections
    srcSelect.value = 'auto';
    tgtSelect.value = 'es'; // Default target to Spanish
  },

  /**
   * Slide drawer container
   * @param {boolean} forceOpen Optional force toggle flag
   */
  toggleHistoryDrawer(forceOpen) {
    const drawer = this.elements.historyDrawer;
    const isOpen = forceOpen !== undefined ? forceOpen : !drawer.classList.contains('open');
    
    if (isOpen) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    } else {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
  },

  /**
   * Render translations log inside the drawer
   * @param {Array} history Array of history logs
   * @param {Function} onItemClick Click callback function
   */
  renderHistory(history, handlers) {
    const list = this.elements.historyList;
    list.innerHTML = '';

    if (!history || history.length === 0) {
      list.innerHTML = '<li class="history-empty">No recent translations</li>';
      this.elements.clearHistoryBtn.disabled = true;
      return;
    }

    this.elements.clearHistoryBtn.disabled = false;

    history.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      
      const timeString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Calculate display badges
      const charCount = item.characterCount || item.originalText.length;
      const wordCount = item.wordCount || (item.originalText.trim() === '' ? 0 : item.originalText.trim().split(/\s+/).length);
      const providerText = item.provider || 'Translation';
      const metaBadge = `<span class="history-meta-badge">${providerText} • ${wordCount}w • ${charCount}c</span>`;

      li.innerHTML = `
        <div class="history-languages">
          <span>${this.escapeHTML(item.sourceName)} &rarr; ${this.escapeHTML(item.targetName)}</span>
          <span class="history-time">${timeString}</span>
        </div>
        <div class="history-text original">${this.escapeHTML(item.originalText)}</div>
        <div class="history-text translated">${this.escapeHTML(item.translatedText)}</div>
        <div style="margin-top: 4px; display: flex; align-items: center; justify-content: space-between;">
          ${metaBadge}
        </div>
        <div class="history-item-actions">
          <button class="history-action-btn reuse-btn" title="Reuse translation" aria-label="Reuse translation">
            <i class="fa-solid fa-arrows-rotate"></i> Reuse
          </button>
          <button class="history-action-btn copy-btn" title="Copy translation" aria-label="Copy translation">
            <i class="fa-solid fa-copy"></i> Copy
          </button>
          <button class="history-action-btn delete delete-btn" title="Delete entry" aria-label="Delete entry">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      `;

      // Event binds
      const handleLoad = () => {
        if (typeof handlers === 'function') {
          handlers(item);
        } else if (handlers && handlers.onLoad) {
          handlers.onLoad(item);
        }
      };

      li.addEventListener('click', (e) => {
        if (e.target.closest('.history-action-btn')) return;
        handleLoad();
      });

      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target.closest('.history-action-btn')) return;
          e.preventDefault();
          handleLoad();
        }
      });

      // Actions click binding
      const reuseBtn = li.querySelector('.reuse-btn');
      reuseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleLoad();
      });

      const copyBtn = li.querySelector('.copy-btn');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (handlers && handlers.onCopy) {
          handlers.onCopy(item.translatedText);
        } else {
          UI.copyToClipboard(item.translatedText);
        }
      });

      const deleteBtn = li.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (handlers && handlers.onDelete) {
          handlers.onDelete(item.id);
        }
      });

      list.appendChild(li);
    });
  },

  /**
   * Show custom confirmation modal overlay
   * @param {string} message Confirmation message text
   * @param {Function} onConfirm Callback when confirm is triggered
   */
  showConfirmationModal(message, onConfirm) {
    const modal = this.elements.confirmationModal;
    const confirmBtn = this.elements.confirmModalBtn;
    const cancelBtn = this.elements.cancelModalBtn;
    const closeBtn = this.elements.closeModalBtn;
    const messageEl = this.elements.modalMessage;

    messageEl.textContent = message;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    // Focus cancel button for keyboard navigation safety
    cancelBtn.focus();

    const closeModal = () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', closeModal);
      closeBtn.removeEventListener('click', closeModal);
      modal.removeEventListener('click', handleOutsideClick);
    };

    const handleConfirm = () => {
      onConfirm();
      closeModal();
    };

    const handleOutsideClick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', handleOutsideClick);
  },

  /**
   * Toggle browser light/dark class tags
   */
  toggleTheme() {
    const currentTheme = this.elements.html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    this.elements.html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Alter toggle button display icon
    const themeIcon = this.elements.themeToggleBtn.querySelector('i');
    if (newTheme === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
    }

    this.showToast(`Switched to ${newTheme} theme`, 'info', 1500);
  },

  /**
   * Initialize system theme state from local cache
   */
  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.elements.html.setAttribute('data-theme', savedTheme);
    
    const themeIcon = this.elements.themeToggleBtn.querySelector('i');
    if (savedTheme === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
    }
  }
};

// Export to global window namespace
window.UI = UI;
