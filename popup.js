/**
 * Popup Logic for Shopee Reviews Scraper
 */
console.log("POPUP LOADED - DOM VERSION v5 (Syntax Fixed)");

// State
let state = {
    shopId: null,
    itemId: null,
    itemUrl: null,
    itemName: '',
    itemImage: '',
    isScraping: false,
    isPaused: false,
    reviews: [],
    progress: 0
};

// DOM Elements
const elements = {
    shopId: document.getElementById('shop-id'),
    itemId: document.getElementById('item-id'),
    exportBtn: document.getElementById('export-btn'),
    downloadBtn: document.getElementById('download-btn'),
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    progressPercent: document.getElementById('progress-percent'),
    collectedCount: document.getElementById('collected-count'),

    // Controls
    pauseBtn: document.getElementById('pause-btn'),
    resumeBtn: document.getElementById('resume-btn'),
    stopBtn: document.getElementById('stop-btn'),

    // Sidebar & Settings
    menuSetting: document.getElementById('menu-setting'),
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettings: document.getElementById('close-settings'),
    settingsRadios: document.querySelectorAll('input[name="filetype"]'),
    menuIcon: document.querySelector('.menu-icon'),

    fileTypeDisplay: document.getElementById('file-type-display'),
    totalReviews: document.getElementById('total-reviews')
};


// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('shopee')) {
        chrome.tabs.sendMessage(tab.id, { action: 'GET_IDS' }, (response) => {
            if (response && response.shopId && response.itemId) {
                state.shopId = response.shopId;
                state.itemId = response.itemId;
                state.itemUrl = response.url;
                state.itemName = response.itemName || '';
                state.itemImage = response.itemImage || '';

                elements.shopId.textContent = state.shopId;
                elements.itemId.textContent = state.itemId;
                elements.exportBtn.disabled = false;
            } else {
                elements.shopId.textContent = 'Not Found';
                elements.itemId.textContent = 'Not Found';
                elements.exportBtn.disabled = true;
            }
        });
    } else {
        elements.shopId.textContent = 'N/A';
        elements.itemId.textContent = 'N/A';
        elements.exportBtn.disabled = true;
    }
});

function initEventListeners() {
    elements.menuIcon.addEventListener('click', toggleSidebar);
    elements.overlay.addEventListener('click', () => {
        closeSidebar();
        closeSettings();
    });

    elements.menuSetting.addEventListener('click', () => {
        closeSidebar();
        openSettings();
    });
    elements.closeSettings.addEventListener('click', closeSettings);

    elements.settingsRadios.forEach(radio => {
        radio.addEventListener('change', updateDownloadButtonText);
    });

    elements.exportBtn.addEventListener('click', startScraping);
    elements.downloadBtn.addEventListener('click', downloadData);

    // New Controls
    elements.pauseBtn.addEventListener('click', () => {
        state.isPaused = true;
        elements.pauseBtn.style.display = 'none';
        elements.resumeBtn.style.display = 'inline-block';
        elements.progressPercent.textContent = "Paused";
    });

    elements.resumeBtn.addEventListener('click', () => {
        state.isPaused = false;
        elements.pauseBtn.style.display = 'inline-block';
        elements.resumeBtn.style.display = 'none';
        elements.progressPercent.textContent = "Scraping...";
    });

    elements.stopBtn.addEventListener('click', stopScraping);
}

// ... Sidebar/Settings functions ...
function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
    elements.overlay.classList.toggle('show');
}
function closeSidebar() {
    elements.sidebar.classList.remove('open');
    if (elements.settingsModal.style.display === 'none') elements.overlay.classList.remove('show');
}
function openSettings() {
    elements.settingsModal.style.display = 'block';
    elements.overlay.classList.add('show');
}
function closeSettings() {
    elements.settingsModal.style.display = 'none';
    elements.overlay.classList.remove('show');
}
function updateDownloadButtonText() {
    const fileType = document.querySelector('input[name="filetype"]:checked').value.toUpperCase();
    elements.fileTypeDisplay.textContent = fileType;
}

// --- Scraping Logic (DOM BASED) ---

async function startScraping() {
    if (!state.shopId || !state.itemId) return;

    state.isScraping = true;
    state.isPaused = false;
    state.reviews = [];
    state.progress = 0;

    // UI Reset
    elements.exportBtn.style.display = 'none';
    elements.progressContainer.style.display = 'block';
    elements.downloadBtn.style.display = 'none';
    elements.pauseBtn.style.display = 'inline-block';
    elements.resumeBtn.style.display = 'none';
    elements.collectedCount.textContent = 'Collected: 0';
    elements.progressPercent.textContent = "Scraping...";

    let noNewReviewsCount = 0;

    try {
        console.log("STARTING SCRAPE LOOP");
        while (state.isScraping) {
            // Handle Pause
            while (state.isPaused && state.isScraping) {
                await new Promise(r => setTimeout(r, 500));
            }
            if (!state.isScraping) break;

            // 1. Scrape visible reviews with polling
            let newReviews = [];
            let attempts = 0;
            const maxAttempts = 6;

            while (attempts < maxAttempts) {
                newReviews = await scrapeDomReviews();
                console.log(`Polling attempt ${attempts + 1}: Found ${newReviews.length} reviews.`);

                if (newReviews.length > 0) {
                    break;
                }
                await new Promise(r => setTimeout(r, 1500));
                attempts++;
            }

            let addedCount = 0;
            // Add unique reviews
            newReviews.forEach(r => {
                const isAnon = r.anonymous || r.buyer_username === 'Anonymous';

                const exists = state.reviews.some(ex => {
                    const sameUser = ex.buyer_username === r.buyer_username;
                    const sameText = ex.review_text === r.review_text;
                    const sameRating = ex.rating_star === r.rating_star;
                    const sameDate = ex.review_date === r.review_date;

                    if (isAnon) {
                        // For anonymous, identical date+text+rating = duplicate
                        return sameText && sameRating && sameDate;
                    }
                    return sameUser && sameText && sameDate;
                });

                if (!exists) {
                    r.itemid = state.itemId;
                    r.shopid = state.shopId;
                    r.item_name = state.itemName;
                    r.item_image = state.itemImage;
                    r.item_url = state.itemUrl;
                    r.region = 'MY';

                    state.reviews.push(r);
                    addedCount++;
                }
            });

            // Update UI
            elements.collectedCount.textContent = `Collected: ${state.reviews.length}`;
            console.log(`Added ${addedCount} new reviews. Total: ${state.reviews.length}`);

            if (addedCount === 0) {
                noNewReviewsCount++;
            } else {
                noNewReviewsCount = 0;
            }

            // Stop if stuck 
            if (noNewReviewsCount > 3) {
                console.log("Stopping: No new reviews found for multiple iterations.");
                break;
            }

            // 2. Click Next
            const nextResult = await clickNext();
            if (!nextResult.success) {
                console.log("Stopping: Next button not found or failed.");
                break;
            }

            // 3. Post-navigation wait
            await new Promise(r => setTimeout(r, 2000));
        }

        finishScraping();

    } catch (error) {
        console.error("Scraping error:", error);
        alert(`Error scraping reviews: ${error.toString()}`);
        stopScraping();
    }
}

function stopScraping() {
    state.isScraping = false;
    state.isPaused = false;
    finishScraping();
}

function finishScraping() {
    state.isScraping = false;
    elements.progressContainer.style.display = 'none';
    elements.downloadBtn.style.display = 'flex';
    elements.totalReviews.textContent = state.reviews.length;
    updateDownloadButtonText();

    if (state.reviews.length === 0) {
        alert("Finished but 0 reviews extracted. Check the console (F12) for logs. Make sure reviews are visible.");
        elements.exportBtn.style.display = 'flex';
        elements.downloadBtn.style.display = 'none';
    }
}


// Helpers
async function scrapeDomReviews() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_DOM' }, (response) => {
            resolve(response && response.success ? response.data : []);
        });
    });
}
async function clickNext() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'CLICK_NEXT' }, (response) => {
            resolve(response || { success: false });
        });
    });
}

function downloadData() {
    const type = document.querySelector('input[name="filetype"]:checked').value;
    let content = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (type === 'csv') {
        content = convertToCSV(state.reviews);
        mimeType = 'text/csv';
        extension = 'csv';
    } else if (type === 'json') {
        content = JSON.stringify(state.reviews, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    } else if (type === 'xlsx') {
        content = convertToExcel(state.reviews);
        mimeType = 'application/vnd.ms-excel';
        extension = 'xls';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const filename = `shopee_reviews_${state.shopId}_${state.itemId}.${extension}`;

    chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
    });
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    const header = Object.keys(data[0]);
    const headerString = header.join(',');
    const rowItems = data.map(row => {
        return header.map(fieldName => {
            let value = row[fieldName] === undefined || row[fieldName] === null ? '' : row[fieldName];
            value = value.toString().replace(/"/g, '""');
            if (value.search(/("|,|\n)/g) >= 0) {
                value = `"${value}"`;
            }
            return value;
        }).join(',');
    });
    return [headerString, ...rowItems].join('\n');
}

function convertToExcel(data) {
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Reviews</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
    html += '<body><table>';
    if (data.length > 0) {
        html += '<thead><tr>';
        Object.keys(data[0]).forEach(key => {
            html += `<th>${key}</th>`;
        });
        html += '</tr></thead>';
    }
    html += '<tbody>';
    data.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(val => {
            html += `<td>${val === undefined || val === null ? '' : val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></body></html>';
    return html;
}
