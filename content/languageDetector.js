// VietTranslate - Language Detector
// Detects if page content is Vietnamese or English

const LanguageDetector = {
    // Vietnamese diacritics pattern
    vietnamesePattern: /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi,

    // Common Vietnamese words
    vietnameseWords: ['và', 'của', 'là', 'có', 'được', 'trong', 'cho', 'này', 'với', 'không', 'những', 'một', 'các', 'đã', 'để', 'người', 'năm', 'theo', 'về', 'như', 'khi', 'từ', 'họ', 'tại', 'đến', 'hay', 'còn', 'nhiều', 'bị', 'sau', 'trên', 'làm', 'thì', 'ra', 'sẽ', 'cũng', 'nếu', 'nhưng', 'đó', 'vì'],

    // Sample text from page
    samplePageText(limit = 3000) {
        const bodyText = document.body?.innerText || '';
        return bodyText.substring(0, limit).toLowerCase();
    },

    // Count Vietnamese characters
    countVietnameseChars(text) {
        const matches = text.match(this.vietnamesePattern);
        return matches ? matches.length : 0;
    },

    // Count Vietnamese words
    countVietnameseWords(text) {
        let count = 0;
        const words = text.split(/\s+/);
        for (const word of words) {
            if (this.vietnameseWords.includes(word.toLowerCase())) {
                count++;
            }
        }
        return count;
    },

    // Detect language of given text
    detectLanguage(text) {
        if (!text || text.trim().length < 10) {
            return 'unknown';
        }

        const viCharCount = this.countVietnameseChars(text);
        const viWordCount = this.countVietnameseWords(text);
        const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;

        // Calculate Vietnamese score
        const charRatio = viCharCount / text.length;
        const wordRatio = totalWords > 0 ? viWordCount / totalWords : 0;

        // If significant Vietnamese content found
        if (charRatio > 0.02 || wordRatio > 0.05) {
            return 'vi';
        }

        // Default to English for non-Vietnamese content
        return 'en';
    },

    // Detect page language
    detectPageLanguage() {
        // Check HTML lang attribute first
        const htmlLang = document.documentElement.lang?.toLowerCase();
        if (htmlLang) {
            if (htmlLang.startsWith('vi')) return 'vi';
            if (htmlLang.startsWith('en')) return 'en';
        }

        // Sample and detect from content
        const sampleText = this.samplePageText();
        return this.detectLanguage(sampleText);
    },

    // Get target language based on source
    getTargetLanguage(sourceLang) {
        return sourceLang === 'vi' ? 'en' : 'vi';
    },

    // Language display names
    getLanguageName(code) {
        const names = {
            'vi': 'Tiếng Việt',
            'en': 'English',
            'unknown': 'Unknown'
        };
        return names[code] || code;
    }
};

// Export for content script
if (typeof window !== 'undefined') {
    window.LanguageDetector = LanguageDetector;
}
