/**
 * Content Script for Shopee Reviews Scraper
 * Extracts Shop ID and Item ID from the DOM
 */

console.log('Shopee Scraper Content Script Loaded v13 (REGEX MP4 SCAN)');

function getPageIds() {
    let shopId = null;
    let itemId = null;
    const url = window.location.href;
    const match = url.match(/i\.(\d+)\.(\d+)/);

    if (match) {
        shopId = match[1];
        itemId = match[2];
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('shopid') && urlParams.has('itemid')) {
            shopId = urlParams.get('shopid');
            itemId = urlParams.get('itemid');
        } else if (urlParams.has('shop') && urlParams.has('item')) {
            shopId = urlParams.get('shop');
            itemId = urlParams.get('item');
        }
    }

    const itemName = document.querySelector('meta[property="og:title"]')?.content || document.title || '';
    let itemImage = document.querySelector('meta[property="og:image"]')?.content || '';

    // Fix: Convert 'file/xxx' to 'xxx.jpg' (Clean Direct URL)
    if (itemImage.includes('/file/')) {
        itemImage = itemImage.replace('/file/', '/');
        if (!itemImage.endsWith('.jpg') && !itemImage.endsWith('.png')) {
            itemImage += '.jpg';
        }
    }

    const cleanName = itemName.split('|')[0].trim();

    return { shopId, itemId, url, itemName: cleanName, itemImage };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_IDS') {
        const ids = getPageIds();
        sendResponse(ids);
    }
    else if (request.action === 'SCRAPE_DOM') {
        window.scrollBy(0, 500);

        // --- DISCOVERY PHASE ---
        const candidates = new Set();

        // 1. Primary Class
        document.querySelectorAll('.shopee-product-rating').forEach(el => candidates.add(el));

        // 2. Author Class (.InK5kS) - Critical for Anonymous
        document.querySelectorAll('.InK5kS').forEach(authorEl => {
            let parent = authorEl.parentElement;
            let bestContainer = null;

            // Traverse up max 5 levels
            for (let i = 0; i < 5; i++) {
                if (!parent) break;
                if (parent.tagName === 'BODY' || parent.tagName === 'HTML') break;

                // CHECK: Does this parent contain MULTIPLE authors?
                const authorsInParent = parent.querySelectorAll('.InK5kS, .shopee-product-rating__author-name');

                // If > 1 author, we climbed too high. Stop.
                if (authorsInParent.length > 1) {
                    break;
                }

                bestContainer = parent;

                if (parent.classList.contains('shopee-product-rating')) {
                    break;
                }
                parent = parent.parentElement;
            }
            if (bestContainer) candidates.add(bestContainer);
        });

        const reviewElements = Array.from(candidates);
        const reviews = [];
        const seenTexts = new Set();

        reviewElements.forEach(el => {
            if (!el) return;
            try {
                if (el.querySelectorAll('.icon-rating-solid').length > 10) return;

                // --- AUTHOR ---
                let author = el.querySelector('.shopee-product-rating__author-name')?.innerText
                    || el.querySelector('.InK5kS')?.innerText
                    || el.querySelector('.author-name')?.innerText;

                if (!author) {
                    const text = el.innerText;
                    const maskedMatch = text.match(/\b[a-zA-Z0-9._]{1,4}\*{3,}[a-zA-Z0-9._]{0,4}\b/);
                    if (maskedMatch) author = maskedMatch[0];
                }

                if (!author || author.trim() === 'Anonymous') {
                    const textLines = el.innerText.split('\n').map(x => x.trim()).filter(x => x.length > 0);
                    if (textLines.length > 0 && textLines[0].length < 25 && !textLines[0].includes(' ')) {
                        author = textLines[0];
                    }
                }

                author = author || 'Anonymous';
                const isAnonymous = author === 'Anonymous' || author.includes('*');

                // --- DATE ---
                let date = el.querySelector('.shopee-product-rating__time')?.innerText
                    || el.querySelector('.time')?.innerText;
                if (!date) {
                    const dateMatch = el.innerText.match(/\d{2,4}[-/]\d{1,2}[-/]\d{2,4}\s*\|?\s*\d{1,2}:\d{2}/)
                        || el.innerText.match(/\d{4}-\d{2}-\d{2}/);
                    if (dateMatch) date = dateMatch[0];
                }
                date = date || '';

                // --- RATING ---
                let rating = el.querySelectorAll('.icon-rating-solid').length
                    || el.querySelectorAll('polygon[fill="#d0011b"]').length;
                if (rating === 0) {
                    rating = el.querySelectorAll('svg.icon-rating-solid').length;
                }

                // --- CONTENT & CLEANUP ---
                let content = el.querySelector('.shopee-product-rating__content')?.innerText
                    || el.querySelector('.Rk6V\\+3')?.innerText;

                if (!content) {
                    let fullText = el.innerText;
                    if (author && author !== 'Anonymous') fullText = fullText.replace(author, '');
                    if (date) fullText = fullText.replace(date, '');

                    content = fullText.split('\n')
                        .map(line => line.trim())
                        .filter(line => {
                            if (line.length === 0) return false;
                            if (line === author) return false;
                            if (line.startsWith('Variation:')) return false;
                            if (line === 'Helpful?') return false;
                            if (line === 'Report') return false;
                            if (/^\d+:\d+$/.test(line)) return false;
                            if (/^\d+$/.test(line) && line.length < 3) return false;
                            if (line.includes('out of 5')) return false;
                            return true;
                        })
                        .join('\n');
                }

                // --- MEDIA SCANNERS ---
                const images = [];
                const videos = [];

                // 1. Standard Images (img src)
                el.querySelectorAll('img').forEach(img => {
                    const src = img.getAttribute('src') || img.getAttribute('data-src');
                    if (src && src.startsWith('http') && !src.includes('blank.gif')) {
                        // Exclude obvious video thumbnails from the *Image* list
                        if (!src.includes('.vod.') && !src.includes('/video/') && !src.includes('_tn')) {
                            images.push(src);
                        }
                    }
                });

                // 2. Background Images
                el.querySelectorAll('div').forEach(div => {
                    const style = window.getComputedStyle(div);
                    const bg = style.backgroundImage;
                    if (bg && bg.startsWith('url(') && bg.includes('susercontent')) {
                        let url = bg.slice(4, -1).replace(/"/g, "").replace(/'/g, "");
                        // Only add if NOT a video thumbnail
                        if (url && !url.includes('.vod.') && !url.includes('/video/')) {
                            if (!images.includes(url)) images.push(url);
                        }
                    }
                });

                // 3. NUCLEAR OPTION: Scan innerHTML for MP4s (The "Real" Video Link)
                // This catches <video src="...">, data-src="...", data-video="...", or anything else
                const htmlContent = el.innerHTML;
                // Regex matches http... .mp4
                const mp4Matches = htmlContent.match(/https?:\/\/[a-zA-Z0-9.\-_/]+\.mp4/g);
                if (mp4Matches) {
                    mp4Matches.forEach(match => {
                        if (!videos.includes(match)) videos.push(match);
                    });
                }

                // 4. Fallback: If no MP4 found, check for <video> tags specifically (e.g. blobs? uncommon in scraping but possible)
                if (videos.length === 0) {
                    el.querySelectorAll('video').forEach(vid => {
                        if (vid.src && vid.src.startsWith('http')) videos.push(vid.src);
                    });
                }

                const cleanImages = images.map(url => url.replace(/_tn/, ''));
                const uniqueImages = [...new Set(cleanImages)];
                const imageUrl = uniqueImages.join(';');

                const uniqueVideos = [...new Set(videos)];
                const videoUrl = uniqueVideos.join(';');

                // --- DEDUP CHECK ---
                const uniqueKey = `${author}|${date}|${content.substring(0, 20)}`;
                if (seenTexts.has(uniqueKey)) return;
                seenTexts.add(uniqueKey);

                if (rating > 0 || content.length > 0) {
                    reviews.push({
                        buyer_username: author,
                        rating_star: rating,
                        review_text: content || '',
                        review_date: date,
                        image_url: imageUrl,
                        image_count: uniqueImages.length,
                        buyer_userid: '',
                        buyer_shopid: '',
                        anonymous: isAnonymous,
                        product_quality: 0,
                        seller_service: 0,
                        delivery_service: 0,
                        video_count: uniqueVideos.length,
                        video_url: videoUrl,
                        reply_text: '',
                        reply_date: ''
                    });
                }
            } catch (e) {
                console.error("Error parsing review element", e);
            }
        });

        sendResponse({ success: true, data: reviews });
    }
    else if (request.action === 'CLICK_NEXT') {
        const nextBtn = document.querySelector('.shopee-icon-button--right');
        if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('shopee-icon-button--disabled')) {
            nextBtn.click();
            sendResponse({ success: true });
        } else {
            console.warn("DOM CLICK_NEXT: Button not found or disabled.");
            sendResponse({ success: false, error: 'No next button or disabled' });
        }
    }
});
