// VietTranslate - Translator Module
// Handles translation via Google Translate (free, fast) and Local AI (slower but customizable)

const Translator = {
    // Cache for translations
    cache: new Map(),

    // Default settings
    settings: {
        translationEngine: 'google', // 'google' or 'localai'
        apiEndpoint: 'http://localhost:8317/v1',
        apiKey: 'proxypal-local',
        model: 'gemini-3-flash-preview',
        maxTokens: 2000,
        temperature: 0.3
    },

    // Available models from local chatbot
    availableModels: [
        'gemini-3-flash-preview',
        'gemini-3-pro-preview',
        'gemini-3-pro-image-preview',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-claude-sonnet-4-5',
        'gemini-claude-sonnet-4-5-thinking',
        'gemini-claude-opus-4-5-thinking',
        'gpt-oss-120b-medium'
    ],

    // Load settings from storage
    async loadSettings() {
        return new Promise((resolve) => {
            if (chrome?.storage?.sync) {
                chrome.storage.sync.get(['translationEngine', 'apiEndpoint', 'apiKey', 'model', 'maxTokens', 'temperature'], (result) => {
                    if (result.translationEngine) this.settings.translationEngine = result.translationEngine;
                    if (result.apiEndpoint) this.settings.apiEndpoint = result.apiEndpoint;
                    if (result.apiKey) this.settings.apiKey = result.apiKey;
                    if (result.model) this.settings.model = result.model;
                    if (result.maxTokens) this.settings.maxTokens = result.maxTokens;
                    if (result.temperature) this.settings.temperature = result.temperature;
                    resolve(this.settings);
                });
            } else {
                resolve(this.settings);
            }
        });
    },

    // Save settings to storage
    async saveSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        return new Promise((resolve) => {
            if (chrome?.storage?.sync) {
                chrome.storage.sync.set(this.settings, resolve);
            } else {
                resolve();
            }
        });
    },

    // ==================== GOOGLE TRANSLATE (FREE) ====================

    // Google Translate via free API
    async googleTranslate(text, sourceLang, targetLang) {
        const langMap = { 'vi': 'vi', 'en': 'en' };
        const sl = langMap[sourceLang] || 'auto';
        const tl = langMap[targetLang] || 'en';

        // Using Google Translate free endpoint
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            // Parse response - format is [[["translation","original",null,null,10]]]
            if (data && data[0]) {
                let translation = '';
                for (const part of data[0]) {
                    if (part[0]) {
                        translation += part[0];
                    }
                }
                return translation;
            }
            return text;
        } catch (error) {
            console.error('VietTranslate: Google Translate error:', error);
            throw error;
        }
    },

    // Batch translate with Google (fast!)
    async googleTranslateBatch(texts, sourceLang, targetLang) {
        // Process in parallel for speed
        const promises = texts.map(text => this.googleTranslate(text, sourceLang, targetLang));
        return Promise.all(promises);
    },

    // ==================== LOCAL AI TRANSLATION ====================

    // Fetch available models from API
    async fetchModels() {
        try {
            const response = await fetch(`${this.settings.apiEndpoint}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.settings.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    return data.data.map(m => m.id);
                }
            }
        } catch (error) {
            console.warn('VietTranslate: Could not fetch models:', error.message);
        }
        return this.availableModels;
    },

    // Build translation prompt for Local AI
    buildPrompt(text, sourceLang, targetLang) {
        const langNames = {
            'vi': 'Vietnamese',
            'en': 'English'
        };

        return `Translate the following text from ${langNames[sourceLang]} to ${langNames[targetLang]}. 
Only provide the translation, no explanations or additional text.

Text: ${text}`;
    },

    // Call Local AI API
    async callLocalAI(prompt) {
        const response = await fetch(`${this.settings.apiEndpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.settings.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional translator. Translate text accurately while preserving the original meaning and tone. Only output the translation, nothing else.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.settings.maxTokens,
                temperature: this.settings.temperature
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    },

    // Local AI single translation
    async localAITranslate(text, sourceLang, targetLang) {
        const prompt = this.buildPrompt(text, sourceLang, targetLang);
        return await this.callLocalAI(prompt);
    },

    // Local AI batch translation
    async localAITranslateBatch(texts, sourceLang, targetLang) {
        const results = [];

        // Process sequentially to avoid rate limits
        for (const text of texts) {
            try {
                const translation = await this.localAITranslate(text, sourceLang, targetLang);
                results.push(translation);
            } catch (error) {
                console.error('VietTranslate: Local AI error:', error);
                results.push(text); // Fallback to original
            }
        }

        return results;
    },

    // ==================== MAIN TRANSLATION API ====================

    // Translate single text (auto-selects engine)
    async translate(text, sourceLang, targetLang) {
        // Check cache
        const cacheKey = `${this.settings.translationEngine}:${sourceLang}:${targetLang}:${text}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        await this.loadSettings();

        let translation;
        if (this.settings.translationEngine === 'google') {
            translation = await this.googleTranslate(text, sourceLang, targetLang);
        } else {
            translation = await this.localAITranslate(text, sourceLang, targetLang);
        }

        // Cache result
        this.cache.set(cacheKey, translation);
        return translation;
    },

    // Batch translate multiple texts (auto-selects engine)
    async translateBatch(texts, sourceLang, targetLang) {
        await this.loadSettings();

        // Check cache
        const results = [];
        const uncached = [];
        const uncachedIndices = [];

        for (let i = 0; i < texts.length; i++) {
            const cacheKey = `${this.settings.translationEngine}:${sourceLang}:${targetLang}:${texts[i]}`;
            if (this.cache.has(cacheKey)) {
                results[i] = this.cache.get(cacheKey);
            } else {
                uncached.push(texts[i]);
                uncachedIndices.push(i);
            }
        }

        if (uncached.length > 0) {
            let translations;

            if (this.settings.translationEngine === 'google') {
                // Google: fast parallel processing
                translations = await this.googleTranslateBatch(uncached, sourceLang, targetLang);
            } else {
                // Local AI: sequential to avoid rate limits
                translations = await this.localAITranslateBatch(uncached, sourceLang, targetLang);
            }

            // Store results and cache
            for (let j = 0; j < translations.length; j++) {
                const idx = uncachedIndices[j];
                results[idx] = translations[j];

                const cacheKey = `${this.settings.translationEngine}:${sourceLang}:${targetLang}:${uncached[j]}`;
                this.cache.set(cacheKey, translations[j]);
            }
        }

        return results;
    },

    // Clear cache
    clearCache() {
        this.cache.clear();
    }
};

// Export for content script
if (typeof window !== 'undefined') {
    window.Translator = Translator;
}
