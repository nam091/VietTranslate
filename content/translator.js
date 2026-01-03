// VietTranslate - Translator Module
// Handles API calls to local chatbot

const Translator = {
    // Cache for translations
    cache: new Map(),

    // Default settings
    settings: {
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
                chrome.storage.sync.get(['apiEndpoint', 'apiKey', 'model', 'maxTokens', 'temperature'], (result) => {
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

    // Build translation prompt
    buildPrompt(text, sourceLang, targetLang) {
        const langNames = {
            'vi': 'Vietnamese',
            'en': 'English'
        };

        return `Translate the following text from ${langNames[sourceLang]} to ${langNames[targetLang]}. 
Only provide the translation, no explanations or additional text.

Text: ${text}`;
    },

    // Call translation API
    async callAPI(prompt) {
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

    // Translate single text
    async translate(text, sourceLang, targetLang) {
        // Check cache
        const cacheKey = `${sourceLang}:${targetLang}:${text}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Load settings if not loaded
        await this.loadSettings();

        // Build prompt and call API
        const prompt = this.buildPrompt(text, sourceLang, targetLang);
        const translation = await this.callAPI(prompt);

        // Cache result
        this.cache.set(cacheKey, translation);

        return translation;
    },

    // Batch translate multiple texts
    async translateBatch(texts, sourceLang, targetLang) {
        const results = [];
        const uncached = [];
        const uncachedIndices = [];

        // Check cache for each text
        for (let i = 0; i < texts.length; i++) {
            const cacheKey = `${sourceLang}:${targetLang}:${texts[i]}`;
            if (this.cache.has(cacheKey)) {
                results[i] = this.cache.get(cacheKey);
            } else {
                uncached.push(texts[i]);
                uncachedIndices.push(i);
            }
        }

        // Translate uncached texts in batches
        if (uncached.length > 0) {
            await this.loadSettings();

            // Process in chunks of 5
            const chunkSize = 5;
            for (let i = 0; i < uncached.length; i += chunkSize) {
                const chunk = uncached.slice(i, i + chunkSize);
                const indices = uncachedIndices.slice(i, i + chunkSize);

                // Build batch prompt
                const batchPrompt = this.buildBatchPrompt(chunk, sourceLang, targetLang);

                try {
                    const response = await this.callAPI(batchPrompt);
                    const translations = this.parseBatchResponse(response, chunk.length);

                    // Store results
                    for (let j = 0; j < translations.length; j++) {
                        const idx = indices[j];
                        results[idx] = translations[j];

                        // Cache
                        const cacheKey = `${sourceLang}:${targetLang}:${chunk[j]}`;
                        this.cache.set(cacheKey, translations[j]);
                    }
                } catch (error) {
                    console.error('VietTranslate: Batch translation error:', error);
                    // Fill with original text on error
                    for (const idx of indices) {
                        results[idx] = texts[idx];
                    }
                }
            }
        }

        return results;
    },

    // Build prompt for batch translation
    buildBatchPrompt(texts, sourceLang, targetLang) {
        const langNames = {
            'vi': 'Vietnamese',
            'en': 'English'
        };

        const numberedTexts = texts.map((t, i) => `[${i + 1}] ${t}`).join('\n');

        return `Translate each of the following numbered texts from ${langNames[sourceLang]} to ${langNames[targetLang]}. 
Keep the same numbering format [1], [2], etc. Only provide translations, no explanations.

${numberedTexts}`;
    },

    // Parse batch response
    parseBatchResponse(response, expectedCount) {
        const lines = response.split('\n').filter(l => l.trim());
        const results = [];

        for (let i = 1; i <= expectedCount; i++) {
            const pattern = new RegExp(`^\\[${i}\\]\\s*(.+)$`);
            let found = false;

            for (const line of lines) {
                const match = line.match(pattern);
                if (match) {
                    results.push(match[1].trim());
                    found = true;
                    break;
                }
            }

            if (!found) {
                // Fallback: try to get by line position
                if (lines[i - 1]) {
                    results.push(lines[i - 1].replace(/^\[\d+\]\s*/, '').trim());
                } else {
                    results.push('');
                }
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
