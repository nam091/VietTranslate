// VietTranslate - Main Content Script
// Orchestrates translation on web pages

(function () {
    'use strict';

    // State
    const state = {
        isTranslating: false,
        isEnabled: false,
        sourceLang: null,
        targetLang: null,
        translatedCount: 0,
        totalCount: 0
    };

    // Initialize
    async function init() {
        // Wait for modules to load
        if (!window.LanguageDetector || !window.Translator || !window.DOMHandler) {
            console.error('VietTranslate: Required modules not loaded');
            return;
        }

        // Load translator settings
        await window.Translator.loadSettings();

        // Listen for messages from popup/background
        chrome.runtime.onMessage.addListener(handleMessage);

        console.log('VietTranslate: Content script initialized');
    }

    // Handle messages from popup/background
    function handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'translatePage':
                translatePage().then(result => sendResponse(result));
                return true; // Keep channel open for async

            case 'removeTranslations':
                removeTranslations();
                sendResponse({ success: true });
                break;

            case 'toggleAll':
                toggleAll(message.showOriginal);
                sendResponse({ success: true });
                break;

            case 'getStatus':
                sendResponse(getStatus());
                break;

            case 'updateSettings':
                window.Translator.saveSettings(message.settings).then(() => {
                    sendResponse({ success: true });
                });
                return true;

            case 'detectLanguage':
                const lang = window.LanguageDetector.detectPageLanguage();
                sendResponse({ language: lang });
                break;

            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    // Translate entire page
    async function translatePage() {
        if (state.isTranslating) {
            return { success: false, error: 'Translation in progress' };
        }

        try {
            state.isTranslating = true;
            state.isEnabled = true;

            // Detect page language
            state.sourceLang = window.LanguageDetector.detectPageLanguage();
            state.targetLang = window.LanguageDetector.getTargetLanguage(state.sourceLang);

            console.log(`VietTranslate: Detected ${state.sourceLang}, translating to ${state.targetLang}`);

            // Find all text nodes
            const textNodes = window.DOMHandler.findTextNodes();
            state.totalCount = textNodes.length;
            state.translatedCount = 0;

            if (textNodes.length === 0) {
                return { success: true, message: 'No translatable content found' };
            }

            // Show loading state for all nodes
            const loadingWrappers = textNodes.map(node => window.DOMHandler.showLoading(node));

            // Collect texts
            const texts = loadingWrappers.map(wrapper => wrapper.textContent);

            // Translate in batches
            const batchSize = 10;
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const wrapperBatch = loadingWrappers.slice(i, i + batchSize);

                try {
                    const translations = await window.Translator.translateBatch(
                        batch,
                        state.sourceLang,
                        state.targetLang
                    );

                    // Update wrappers with translations
                    for (let j = 0; j < translations.length; j++) {
                        window.DOMHandler.updateLoadingToTranslated(wrapperBatch[j], translations[j]);
                        state.translatedCount++;
                    }

                    // Report progress
                    chrome.runtime.sendMessage({
                        action: 'translationProgress',
                        progress: state.translatedCount,
                        total: state.totalCount
                    }).catch(() => { }); // Ignore if popup closed

                } catch (error) {
                    console.error('VietTranslate: Batch translation error:', error);
                    // Mark failed nodes
                    wrapperBatch.forEach(wrapper => {
                        wrapper.classList.add('vt-error');
                        wrapper.classList.remove('vt-loading');
                    });
                }
            }

            state.isTranslating = false;

            return {
                success: true,
                sourceLang: state.sourceLang,
                targetLang: state.targetLang,
                translatedCount: state.translatedCount,
                totalCount: state.totalCount
            };

        } catch (error) {
            state.isTranslating = false;
            console.error('VietTranslate: Translation error:', error);
            return { success: false, error: error.message };
        }
    }

    // Remove all translations
    function removeTranslations() {
        window.DOMHandler.removeAll();
        state.isEnabled = false;
        state.translatedCount = 0;
        state.totalCount = 0;
    }

    // Toggle all translations
    function toggleAll(showOriginal) {
        window.DOMHandler.toggleAll(showOriginal);
    }

    // Get current status
    function getStatus() {
        const stats = window.DOMHandler.getStats();
        return {
            isEnabled: state.isEnabled,
            isTranslating: state.isTranslating,
            sourceLang: state.sourceLang,
            targetLang: state.targetLang,
            ...stats
        };
    }

    // Start
    init();

})();
