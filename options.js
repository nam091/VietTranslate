// VietTranslate - Options Script

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const apiEndpoint = document.getElementById('apiEndpoint');
    const apiKey = document.getElementById('apiKey');
    const toggleApiKey = document.getElementById('toggleApiKey');
    const fetchModelsBtn = document.getElementById('fetchModelsBtn');
    const modelSelect = document.getElementById('modelSelect');
    const customModel = document.getElementById('customModel');
    const maxTokens = document.getElementById('maxTokens');
    const temperature = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperatureValue');
    const autoDetect = document.getElementById('autoDetect');
    const showIndicator = document.getElementById('showIndicator');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Default settings
    const defaults = {
        apiEndpoint: 'http://localhost:8317/v1',
        apiKey: 'proxypal-local',
        model: 'gemini-3-flash-preview',
        customModel: '',
        maxTokens: 2000,
        temperature: 0.3,
        autoDetect: true,
        showIndicator: true
    };

    // Load settings
    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(Object.keys(defaults), (result) => {
                const settings = { ...defaults, ...result };

                apiEndpoint.value = settings.apiEndpoint;
                apiKey.value = settings.apiKey;
                modelSelect.value = settings.model;
                customModel.value = settings.customModel;
                maxTokens.value = settings.maxTokens;
                temperature.value = settings.temperature;
                temperatureValue.textContent = settings.temperature;
                autoDetect.checked = settings.autoDetect;
                showIndicator.checked = settings.showIndicator;

                resolve(settings);
            });
        });
    }

    // Save settings
    async function saveSettings() {
        const settings = {
            apiEndpoint: apiEndpoint.value.trim(),
            apiKey: apiKey.value.trim(),
            model: modelSelect.value,
            customModel: customModel.value.trim(),
            maxTokens: parseInt(maxTokens.value) || 2000,
            temperature: parseFloat(temperature.value) || 0.3,
            autoDetect: autoDetect.checked,
            showIndicator: showIndicator.checked
        };

        return new Promise((resolve) => {
            chrome.storage.sync.set(settings, () => {
                resolve();
            });
        });
    }

    // Show status
    function showStatus(message, type = 'success') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');

        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 3000);
    }

    // Fetch models from API
    async function fetchModels() {
        fetchModelsBtn.disabled = true;
        fetchModelsBtn.textContent = '⏳ Đang tải...';

        try {
            const response = await fetch(`${apiEndpoint.value}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey.value}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.data && Array.isArray(data.data)) {
                // Clear existing options
                const currentValue = modelSelect.value;
                modelSelect.innerHTML = '';

                // Add fetched models
                const optgroup = document.createElement('optgroup');
                optgroup.label = 'Models từ API';

                data.data.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.id;
                    optgroup.appendChild(option);
                });

                modelSelect.appendChild(optgroup);

                // Try to restore previous selection
                if ([...modelSelect.options].find(o => o.value === currentValue)) {
                    modelSelect.value = currentValue;
                }

                showStatus(`✓ Đã tải ${data.data.length} models`, 'success');
            } else {
                throw new Error('Không tìm thấy models');
            }
        } catch (error) {
            showStatus(`Lỗi: ${error.message}`, 'error');
        } finally {
            fetchModelsBtn.disabled = false;
            fetchModelsBtn.textContent = '🔄 Lấy danh sách model từ API';
        }
    }

    // Toggle API key visibility
    let apiKeyVisible = false;
    toggleApiKey.addEventListener('click', () => {
        apiKeyVisible = !apiKeyVisible;
        apiKey.type = apiKeyVisible ? 'text' : 'password';
        toggleApiKey.textContent = apiKeyVisible ? '🙈' : '👁';
    });

    // Temperature slider
    temperature.addEventListener('input', () => {
        temperatureValue.textContent = temperature.value;
    });

    // Fetch models button
    fetchModelsBtn.addEventListener('click', fetchModels);

    // Save button
    saveBtn.addEventListener('click', async () => {
        await saveSettings();
        showStatus('✓ Đã lưu cài đặt thành công!', 'success');
    });

    // Reset button
    resetBtn.addEventListener('click', async () => {
        if (confirm('Bạn có chắc muốn khôi phục cài đặt mặc định?')) {
            await new Promise((resolve) => {
                chrome.storage.sync.set(defaults, resolve);
            });
            await loadSettings();
            showStatus('✓ Đã khôi phục cài đặt mặc định', 'success');
        }
    });

    // Custom model input - use instead of select if filled
    customModel.addEventListener('change', () => {
        if (customModel.value.trim()) {
            modelSelect.value = '';
        }
    });

    modelSelect.addEventListener('change', () => {
        if (modelSelect.value) {
            customModel.value = '';
        }
    });

    // Initialize
    await loadSettings();
});
