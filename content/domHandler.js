// VietTranslate - DOM Handler
// Handles DOM manipulation for inline translations

const DOMHandler = {
    // CSS class names
    classes: {
        wrapper: 'vt-translation-wrapper',
        original: 'vt-original',
        translated: 'vt-translated',
        active: 'vt-active',
        showOriginal: 'vt-show-original',
        showTranslated: 'vt-show-translated',
        loading: 'vt-loading',
        error: 'vt-error'
    },

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

        // Skip by tag
        if (this.skipTags.includes(element.tagName)) return true;

        // Skip by class
        for (const cls of this.skipClasses) {
            if (element.classList?.contains(cls)) return true;
        }

        // Skip contenteditable
        if (element.isContentEditable) return true;

        // Skip hidden elements
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
                    // Skip empty text
                    const text = node.textContent.trim();
                    if (!text || text.length < this.minTextLength) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // Skip if parent should be skipped
                    let parent = node.parentElement;
                    while (parent) {
                        if (this.shouldSkip(parent)) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        parent = parent.parentElement;
                    }

                    // Skip already processed
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

    // Wrap text node with translation wrapper
    wrapTextNode(textNode, translation) {
        const originalText = textNode.textContent;

        // Create wrapper
        const wrapper = document.createElement('span');
        wrapper.className = `${this.classes.wrapper} ${this.classes.showTranslated}`;
        wrapper.setAttribute('data-vt-original', originalText);
        wrapper.setAttribute('data-vt-translated', translation);

        // Create original span
        const originalSpan = document.createElement('span');
        originalSpan.className = this.classes.original;
        originalSpan.textContent = originalText;

        // Create translated span
        const translatedSpan = document.createElement('span');
        translatedSpan.className = this.classes.translated;
        translatedSpan.textContent = translation;

        // Append to wrapper
        wrapper.appendChild(originalSpan);
        wrapper.appendChild(translatedSpan);

        // Add click handler for toggle
        wrapper.addEventListener('click', this.handleToggleClick.bind(this));

        // Replace text node
        textNode.parentNode.replaceChild(wrapper, textNode);

        // Mark as processed
        this.processedNodes.add(wrapper);

        return wrapper;
    },

    // Handle toggle click
    handleToggleClick(event) {
        const wrapper = event.currentTarget;
        if (!wrapper.classList.contains(this.classes.wrapper)) return;

        event.stopPropagation();

        // Toggle between original and translated
        if (wrapper.classList.contains(this.classes.showOriginal)) {
            wrapper.classList.remove(this.classes.showOriginal);
            wrapper.classList.add(this.classes.showTranslated);
        } else {
            wrapper.classList.remove(this.classes.showTranslated);
            wrapper.classList.add(this.classes.showOriginal);
        }
    },

    // Show loading state
    showLoading(textNode) {
        const wrapper = document.createElement('span');
        wrapper.className = `${this.classes.wrapper} ${this.classes.loading}`;
        wrapper.textContent = textNode.textContent;
        wrapper.setAttribute('data-vt-loading', 'true');

        textNode.parentNode.replaceChild(wrapper, textNode);
        return wrapper;
    },

    // Update loading to translated
    updateLoadingToTranslated(wrapper, translation) {
        const originalText = wrapper.textContent;

        wrapper.className = `${this.classes.wrapper} ${this.classes.showTranslated}`;
        wrapper.removeAttribute('data-vt-loading');
        wrapper.setAttribute('data-vt-original', originalText);
        wrapper.setAttribute('data-vt-translated', translation);

        // Clear content
        wrapper.innerHTML = '';

        // Create original span
        const originalSpan = document.createElement('span');
        originalSpan.className = this.classes.original;
        originalSpan.textContent = originalText;

        // Create translated span
        const translatedSpan = document.createElement('span');
        translatedSpan.className = this.classes.translated;
        translatedSpan.textContent = translation;

        wrapper.appendChild(originalSpan);
        wrapper.appendChild(translatedSpan);

        // Add click handler
        wrapper.addEventListener('click', this.handleToggleClick.bind(this));

        this.processedNodes.add(wrapper);
    },

    // Toggle all translations on page
    toggleAll(showOriginal) {
        const wrappers = document.querySelectorAll(`.${this.classes.wrapper}`);
        const targetClass = showOriginal ? this.classes.showOriginal : this.classes.showTranslated;
        const removeClass = showOriginal ? this.classes.showTranslated : this.classes.showOriginal;

        wrappers.forEach(wrapper => {
            wrapper.classList.remove(removeClass);
            wrapper.classList.add(targetClass);
        });
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
    },

    // Get page translation stats
    getStats() {
        const wrappers = document.querySelectorAll(`.${this.classes.wrapper}`);
        const showingOriginal = document.querySelectorAll(`.${this.classes.wrapper}.${this.classes.showOriginal}`);
        const showingTranslated = document.querySelectorAll(`.${this.classes.wrapper}.${this.classes.showTranslated}`);
        const loading = document.querySelectorAll(`.${this.classes.wrapper}.${this.classes.loading}`);

        return {
            total: wrappers.length,
            showingOriginal: showingOriginal.length,
            showingTranslated: showingTranslated.length,
            loading: loading.length
        };
    }
};

// Export for content script
if (typeof window !== 'undefined') {
    window.DOMHandler = DOMHandler;
}
