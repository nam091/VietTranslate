// VietTranslate - DOM Handler
// Handles immersive bilingual translation display

const DOMHandler = {
    // CSS class names
    classes: {
        wrapper: 'vt-translation-wrapper',
        original: 'vt-original',
        translated: 'vt-translated',
        separator: 'vt-separator',
        bilingual: 'vt-bilingual',
        showOriginal: 'vt-show-original',
        showTranslatedOnly: 'vt-show-translated-only',
        loading: 'vt-loading',
        error: 'vt-error',
        blockMode: 'vt-block-mode',
        inlineMode: 'vt-inline-mode'
    },

    // Display modes
    displayMode: 'bilingual', // 'bilingual' | 'original' | 'translated'

    // Track processed nodes
    processedNodes: new WeakSet(),

    // Minimum text length to translate
    minTextLength: 3,

    // Elements to skip
    skipTags: ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'CODE', 'PRE', 'KBD'],

    // Skip classes
    skipClasses: ['vt-translation-wrapper', 'vt-original', 'vt-translated', 'notranslate', 'no-translate'],

    // Check if element should be skipped
    shouldSkip(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

        if (this.skipTags.includes(element.tagName)) return true;

        for (const cls of this.skipClasses) {
            if (element.classList?.contains(cls)) return true;
        }

        if (element.isContentEditable) return true;

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return true;

        return false;
    },

    // Find all translatable text nodes
    findTextNodes(root = document.body) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent.trim();
                    if (!text || text.length < this.minTextLength) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    let parent = node.parentElement;
                    while (parent) {
                        if (this.shouldSkip(parent)) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        parent = parent.parentElement;
                    }

                    if (this.processedNodes.has(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        return textNodes;
    },

    // Create bilingual wrapper - shows BOTH original and translation
    wrapTextNode(textNode, translation) {
        const originalText = textNode.textContent;

        // Determine if block or inline mode
        const isLongText = originalText.length > 100;

        // Create wrapper
        const wrapper = document.createElement('span');
        wrapper.className = `${this.classes.wrapper} ${this.classes.bilingual}`;
        if (isLongText) {
            wrapper.classList.add(this.classes.blockMode);
        } else {
            wrapper.classList.add(this.classes.inlineMode);
        }
        wrapper.setAttribute('data-vt-original', originalText);
        wrapper.setAttribute('data-vt-translated', translation);

        // Create original span
        const originalSpan = document.createElement('span');
        originalSpan.className = this.classes.original;
        originalSpan.textContent = originalText;

        // Create separator
        const separator = document.createElement('span');
        separator.className = this.classes.separator;
        separator.textContent = '→';

        // Create translated span
        const translatedSpan = document.createElement('span');
        translatedSpan.className = this.classes.translated;
        translatedSpan.textContent = translation;

        // Append all elements
        wrapper.appendChild(originalSpan);
        wrapper.appendChild(separator);
        wrapper.appendChild(translatedSpan);

        // Add click handler for cycling through modes
        wrapper.addEventListener('click', this.handleToggleClick.bind(this));

        // Replace text node
        textNode.parentNode.replaceChild(wrapper, textNode);

        this.processedNodes.add(wrapper);

        return wrapper;
    },

    // Handle toggle click - cycle through: bilingual → original only → translated only → bilingual
    handleToggleClick(event) {
        const wrapper = event.currentTarget;
        if (!wrapper.classList.contains(this.classes.wrapper)) return;

        event.stopPropagation();
        event.preventDefault();

        // Cycle through modes
        if (wrapper.classList.contains(this.classes.showOriginal)) {
            // Currently showing original only → switch to translated only
            wrapper.classList.remove(this.classes.showOriginal);
            wrapper.classList.add(this.classes.showTranslatedOnly);
        } else if (wrapper.classList.contains(this.classes.showTranslatedOnly)) {
            // Currently showing translated only → switch to bilingual
            wrapper.classList.remove(this.classes.showTranslatedOnly);
        } else {
            // Currently bilingual → switch to original only
            wrapper.classList.add(this.classes.showOriginal);
        }
    },

    // Show loading state
    showLoading(textNode) {
        const wrapper = document.createElement('span');
        wrapper.className = `${this.classes.wrapper} ${this.classes.bilingual} ${this.classes.loading} ${this.classes.inlineMode}`;

        const originalSpan = document.createElement('span');
        originalSpan.className = this.classes.original;
        originalSpan.textContent = textNode.textContent;

        const separator = document.createElement('span');
        separator.className = this.classes.separator;
        separator.textContent = '→';

        const translatedSpan = document.createElement('span');
        translatedSpan.className = this.classes.translated;
        translatedSpan.textContent = 'Đang dịch...';

        wrapper.appendChild(originalSpan);
        wrapper.appendChild(separator);
        wrapper.appendChild(translatedSpan);

        wrapper.setAttribute('data-vt-original', textNode.textContent);

        textNode.parentNode.replaceChild(wrapper, textNode);
        return wrapper;
    },

    // Update loading to translated
    updateLoadingToTranslated(wrapper, translation) {
        wrapper.classList.remove(this.classes.loading);
        wrapper.setAttribute('data-vt-translated', translation);

        const translatedSpan = wrapper.querySelector(`.${this.classes.translated}`);
        if (translatedSpan) {
            translatedSpan.textContent = translation;
        }

        // Determine block mode
        const originalText = wrapper.getAttribute('data-vt-original') || '';
        if (originalText.length > 100) {
            wrapper.classList.remove(this.classes.inlineMode);
            wrapper.classList.add(this.classes.blockMode);
        }

        // Add click handler
        wrapper.addEventListener('click', this.handleToggleClick.bind(this));

        this.processedNodes.add(wrapper);
    },

    // Set global display mode
    setDisplayMode(mode) {
        this.displayMode = mode;
        const wrappers = document.querySelectorAll(`.${this.classes.wrapper}`);

        wrappers.forEach(wrapper => {
            wrapper.classList.remove(this.classes.showOriginal, this.classes.showTranslatedOnly);

            if (mode === 'original') {
                wrapper.classList.add(this.classes.showOriginal);
            } else if (mode === 'translated') {
                wrapper.classList.add(this.classes.showTranslatedOnly);
            }
            // 'bilingual' mode: no extra class needed
        });
    },

    // Toggle between modes globally
    cycleDisplayMode() {
        if (this.displayMode === 'bilingual') {
            this.displayMode = 'original';
        } else if (this.displayMode === 'original') {
            this.displayMode = 'translated';
        } else {
            this.displayMode = 'bilingual';
        }
        this.setDisplayMode(this.displayMode);
        return this.displayMode;
    },

    // Remove all translations
    removeAll() {
        const wrappers = document.querySelectorAll(`.${this.classes.wrapper}`);

        wrappers.forEach(wrapper => {
            const originalText = wrapper.getAttribute('data-vt-original') || wrapper.textContent;
            const textNode = document.createTextNode(originalText);
            wrapper.parentNode.replaceChild(textNode, wrapper);
        });

        this.processedNodes = new WeakSet();
        this.displayMode = 'bilingual';
    },

    // Get page translation stats
    getStats() {
        const wrappers = document.querySelectorAll(`.${this.classes.wrapper}`);
        const bilingual = document.querySelectorAll(`.${this.classes.wrapper}:not(.${this.classes.showOriginal}):not(.${this.classes.showTranslatedOnly})`);
        const showingOriginal = document.querySelectorAll(`.${this.classes.wrapper}.${this.classes.showOriginal}`);
        const showingTranslated = document.querySelectorAll(`.${this.classes.wrapper}.${this.classes.showTranslatedOnly}`);
        const loading = document.querySelectorAll(`.${this.classes.wrapper}.${this.classes.loading}`);

        return {
            total: wrappers.length,
            bilingual: bilingual.length,
            showingOriginal: showingOriginal.length,
            showingTranslated: showingTranslated.length,
            loading: loading.length,
            displayMode: this.displayMode
        };
    }
};

// Export for content script
if (typeof window !== 'undefined') {
    window.DOMHandler = DOMHandler;
}
