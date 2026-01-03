// VietTranslate - Background Service Worker

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu
    chrome.contextMenus.create({
        id: 'translateSelection',
        title: 'Dịch văn bản đã chọn',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'translatePage',
        title: 'Dịch toàn bộ trang',
        contexts: ['page']
    });

    console.log('VietTranslate: Extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'translateSelection') {
        // Translate selected text
        chrome.tabs.sendMessage(tab.id, {
            action: 'translateSelection',
            text: info.selectionText
        });
    } else if (info.menuItemId === 'translatePage') {
        // Translate entire page
        chrome.tabs.sendMessage(tab.id, {
            action: 'translatePage'
        });
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'toggle-translate') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'translatePage'
        });
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'translationProgress') {
        // Update badge with progress
        const progress = Math.round((message.progress / message.total) * 100);
        chrome.action.setBadgeText({
            text: `${progress}%`,
            tabId: sender.tab.id
        });
        chrome.action.setBadgeBackgroundColor({
            color: '#4f46e5',
            tabId: sender.tab.id
        });

        // Clear badge when complete
        if (message.progress >= message.total) {
            setTimeout(() => {
                chrome.action.setBadgeText({
                    text: '',
                    tabId: sender.tab.id
                });
            }, 2000);
        }
    }

    return false;
});

// Proxy API calls to avoid CORS issues
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'proxyApiCall') {
        fetch(message.url, message.options)
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async
    }
});
