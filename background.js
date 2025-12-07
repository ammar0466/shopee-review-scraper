// Background script - Service Worker
// Mainly for managing state or complex long-running tasks if popup closes.
// For now, the scraping logic is simple enough to run in popup or content script.

chrome.runtime.onInstalled.addListener(() => {
    console.log('Shopee Reviews Scraper Installed');
});

// We can use this to hold "offscreen" scraping if needed, but Manifest V3
// prefers simple event handling. 
