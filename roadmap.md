# Shopee Review Scraper - Development Roadmap 🗺️

## 🚀 Next Version (v1.1)

### Planned Features

1.  **Buyer User ID (`buyer_userid`)**
    *   **Goal**: Extract the unique numeric ID of the buyer.
    *   **Feasibility**: ⚠️ Medium. Shopee often hides this in the UI. We will need to scan for `data-userid`, `href` links to user profiles, or deep internal React properties.

2.  **Buyer Avatar (`buyer_avatar`)**
    *   **Goal**: Extract the profile picture URL of the reviewer.
    *   **Feasibility**: ✅ High. This is usually available in the `.shopee-product-rating__avatar` element (either as an `<img>` tag or a `background-image` style).

## 🔮 Future Ideas
-   **Review Sentiment Analysis** (categorize as Positive/Neutral/Negative).
-   **Filter by Date Range** (scrape only last 30 days).
-   **Auto-Translate Reviews**.
