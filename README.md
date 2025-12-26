# Shopee Review Scraper 🛍️⭐⭐⭐⭐⭐

A powerful, robust Chrome Extension designed to scrape product reviews from Shopee keys, capable of extracting detailed data including anonymous reviews, high-resolution images, and direct video links.

## ✨ Features

- **Anonymous Review Support**: Uses smart DOM traversal to correctly attribute reviews to anonymous users (e.g., `f*****9`) without losing data.
- **Deep Media Extraction**:
  - **Images**: Scans for standard tags and background-image divs (common in Shopee layouts).
  - **Videos**: Deep scans raw HTML to unearth direct `.mp4` links, even if lazy-loaded.
- **Buyer Identity Extraction**:
  - **User ID**: Captures user profile links as identifiers.
  - **Avatar**: Extracts user profile pictures.
- **Smart Data Cleaning**: Automatically cleans up timestamps, "Variation:" text, and junk data.
- **Multiple Export Formats**: Export your data to **CSV**, **Excel** (HTML-based), or **JSON**.
- **Auto-Scroll & Pagination**: Automatically handles lazy loading and clicks "Next Page" to scrape thousands of reviews.
- **Pause/Resume Control**: Full control over the scraping process.

## 🚀 Installation

1.  Clone this repository or download the ZIP.
    ```bash
    git clone git@github.com:ammar0466/shopee-review-scraper.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer Mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the folder where you cloned this repository.

## 📖 Usage

1.  Go to any **Shopee Product Page**.
2.  **Scroll down** until you see the "Product Ratings" section (this ensures the initial data is loaded).
3.  Click the **Extension Icon** in your browser toolbar.
4.  Choose your export format (CSV, Excel, or JSON).
5.  Click **EXPORT REVIEWS**.
6.  Sit back and watch the counter grow! You can Pause or Stop at any time.
7.  Click **Download** when finished.

## 🛠️ Technical Highlights

-   **Manifest V3**: Built with the latest Chrome Extension standards.
-   **Regex Scanning**: Implements advanced regex patterns to find masked usernames and hidden video files.
-   **Robust DOM Traversal**: "Grandparent" traversal logic ensures accurate review text extraction even when the HTML structure varies for anonymous users.

## 🔮 Roadmap & Status

### ✅ Completed
- [x] **Anonymous Review Support**: Full support for masked usernames.
- [x] **Deep Media Extraction**: High-res images and direct `.mp4` video links.
- [x] **Buyer Identity**: User Avatar and User ID extraction.
- [x] **Export Formats**: CSV, Excel, JSON.

### 🚧 Future Ideas
- [ ] **Review Sentiment Analysis**: Categorize reviews as Positive, Neutral, or Negative.
- [ ] **Filter by Date Range**: Option to scrape only reviews from the last X days.
- [ ] **Auto-Translate Reviews**: Built-in translation for foreign language reviews.

## 📝 License

Values provided "as is". Created by **ammar0466**.

For details on privacy, data handling, and policies, see the [Privacy Policy](https://ammar0466.github.io/shopee-review-scraper/privacy-policy).
