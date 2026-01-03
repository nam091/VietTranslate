// VietTranslate - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const detectedLangEl = document.getElementById('detectedLang');
    const targetLangEl = document.getElementById('targetLang');
    const modelSelect = document.getElementById('modelSelect');
    const customModelInput = document.getElementById('customModel');
    const translateBtn = document.getElementById('translateBtn');
    const toggleBtn = document.getElementById('toggleBtn');
    const removeBtn = document.getElementById('removeBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressCount = document.getElementById('progressCount');
    const statusMessage = document.getElementById('statusMessage');

    // Language names
    const langNames = {
        'vi': 'Tiếng Việt 🇻🇳',
        'en': 'English 🇬🇧',
        'unknown': 'Không xác định'
    };

    // State
    let showingOriginal = false;
    let isTranslating = false;

    // Load saved settings
    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['model', 'customModel'], (result) => {
                if (result.model) {
                    modelSelect.value = result.model;
                    if (result.model === 'custom' && result.customModel) {
                        customModelInput.value = result.customModel;
                        customModelInput.classList.remove('hidden');
                    }
                }
                resolve();
            });
        });
    }

    // Save settings
    function saveSettings() {
        const settings = {
            model: modelSelect.value === 'custom' ? customModelInput.value : modelSelect.value
        };

        chrome.storage.sync.set({
            model: modelSelect.value,
            customModel: customModelInput.value
        });

        // Update content script
        sendToActiveTab({ action: 'updateSettings', settings });
    }

    // Detect page language
    async function detectLanguage() {
        try {
            const response = await sendToActiveTab({ action: 'detectLanguage' });
            if (response && response.language) {
                const sourceLang = response.language;
                const targetLang = sourceLang === 'vi' ? 'en' : 'vi';

                detectedLangEl.textContent = langNames[sourceLang] || sourceLang;
                targetLangEl.textContent = langNames[targetLang] || targetLang;
            }
        } catch (error) {
            detectedLangEl.textContent = 'Không thể phát hiện';
            targetLangEl.textContent = '-';
        }
    }

    // Get current status
    async function getStatus() {
        try {
            const response = await sendToActiveTab({ action: 'getStatus' });
            if (response && response.isEnabled) {
                toggleBtn.disabled = false;
                removeBtn.disabled = false;
            }
        } catch (error) {
            console.log('Could not get status');
        }
    }

    // Send message to active tab
    function sendToActiveTab(message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(response);
                        }
                    });
                } else {
                    reject(new Error('No active tab'));
                }
            });
        });
    }

    // Show status message
    function showStatus(message, type = 'success') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');

        if (type === 'success') {
            setTimeout(() => {
                statusMessage.classList.add('hidden');
            }, 3000);
        }
    }

    // Translate page
    async function translatePage() {
        if (isTranslating) return;

        isTranslating = true;
        translateBtn.disabled = true;
        translateBtn.classList.add('loading');
        translateBtn.querySelector('.btn-text').textContent = 'Đang dịch...';

        // Show progress
        progressSection.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = 'Đang chuẩn bị...';
        progressCount.textContent = '0/0';

        try {
            // Save current model selection
            saveSettings();

            const response = await sendToActiveTab({ action: 'translatePage' });

            if (response && response.success) {
                progressFill.style.width = '100%';
                progressText.textContent = 'Hoàn tất!';
                progressCount.textContent = `${response.translatedCount}/${response.totalCount}`;

                showStatus(`✓ Đã dịch ${response.translatedCount} đoạn văn bản`, 'success');

                toggleBtn.disabled = false;
                removeBtn.disabled = false;
            } else {
                showStatus(response?.error || 'Lỗi không xác định', 'error');
            }
        } catch (error) {
            showStatus(`Lỗi: ${error.message}`, 'error');
        } finally {
            isTranslating = false;
            translateBtn.disabled = false;
            translateBtn.classList.remove('loading');
            translateBtn.querySelector('.btn-text').textContent = 'Dịch trang này';

            setTimeout(() => {
                progressSection.classList.add('hidden');
            }, 2000);
        }
    }

    // Toggle translations
    async function toggleTranslations() {
        showingOriginal = !showingOriginal;

        try {
            await sendToActiveTab({
                action: 'toggleAll',
                showOriginal: showingOriginal
            });

            toggleBtn.querySelector('span').textContent =
                showingOriginal ? 'Hiển thị bản dịch' : 'Hiển thị bản gốc';
        } catch (error) {
            showStatus('Không thể chuyển đổi', 'error');
        }
    }

    // Remove translations
    async function removeTranslations() {
        try {
            await sendToActiveTab({ action: 'removeTranslations' });

            toggleBtn.disabled = true;
            removeBtn.disabled = true;
            showingOriginal = false;
            toggleBtn.querySelector('span').textContent = 'Chuyển đổi gốc/dịch';

            showStatus('Đã xóa bản dịch', 'success');
        } catch (error) {
            showStatus('Không thể xóa bản dịch', 'error');
        }
    }

    // Open options page
    function openOptions() {
        chrome.runtime.openOptionsPage();
    }

    // Handle model change
    modelSelect.addEventListener('change', () => {
        if (modelSelect.value === 'custom') {
            customModelInput.classList.remove('hidden');
            customModelInput.focus();
        } else {
            customModelInput.classList.add('hidden');
        }
        saveSettings();
    });

    customModelInput.addEventListener('change', saveSettings);

    // Event listeners
    translateBtn.addEventListener('click', translatePage);
    toggleBtn.addEventListener('click', toggleTranslations);
    removeBtn.addEventListener('click', removeTranslations);
    settingsBtn.addEventListener('click', openOptions);

    // Listen for progress updates
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'translationProgress') {
            const percent = Math.round((message.progress / message.total) * 100);
            progressFill.style.width = `${percent}%`;
            progressText.textContent = 'Đang dịch...';
            progressCount.textContent = `${message.progress}/${message.total}`;
        }
    });

    // Initialize
    await loadSettings();
    await detectLanguage();
    await getStatus();
});
