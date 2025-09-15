function isAudibleBookPage() {
  return window.location.pathname.includes("/pd/");
}

function extractASINFromURL() {
  // Extract ASIN from URL: /pd/BookName/ASIN
  const urlMatch = window.location.pathname.match(
    /\/pd\/[^\/]+\/([A-Z0-9]{10})/,
  );
  if (urlMatch) {
    return urlMatch[1];
  }

  // Also check for ASIN in page elements as fallback
  const asinElement = document.querySelector("[data-asin]");
  if (asinElement) {
    return asinElement.getAttribute("data-asin");
  }

  return null;
}

async function fetchBookDataFromAPI(asin) {
  if (!asin) {
    console.log("No ASIN found");
    return null;
  }

  try {
    // Use Audible's internal API with multiple response groups
    const responseGroups = [
      "contributors",
      "media",
      "product_attrs",
      "product_desc",
      "product_details",
      "product_extended_attrs",
      "rating",
      "series",
    ].join(",");

    const apiUrl = `https://api.audible.com/1.0/catalog/products/${asin}?response_groups=${responseGroups}`;

    console.log("Fetching from API:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      credentials: "include", // Include cookies for authentication
      headers: {
        Accept: "application/json",
        "User-Agent": navigator.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw API response:", data);

    // Transform API response to our format
    const bookData = {
      asin: asin,
      title: data.product?.title || "",
      authors: [],
      narrators: [],
      summary:
        data.product?.publisher_summary || data.product?.editorial_review || "",
      coverImage: "",
      sourceUrl: window.location.href,
      series: "",
      publishDate: data.product?.issue_date || "",
      publisher: data.product?.publisher_name || "",
      language: data.product?.language || "",
      runtime: data.product?.runtime_length_min || 0,
    };

    // Extract authors
    if (data.product?.authors) {
      bookData.authors = data.product.authors.map((author) => author.name);
    }

    // Extract narrators
    if (data.product?.narrators) {
      bookData.narrators = data.product.narrators.map(
        (narrator) => narrator.name,
      );
    }

    // Extract cover image
    if (data.product?.product_images) {
      const images = data.product.product_images;
      // Try to get the largest available image
      bookData.coverImage =
        images["500"] || images["300"] || images["180"] || images["100"] || "";
    }

    // Extract series information
    if (data.product?.series && data.product.series.length > 0) {
      const series = data.product.series[0];
      bookData.series = series.title;
      bookData.seriesPosition = series.sequence;
    }

    console.log("Processed book data:", bookData);
    return bookData;
  } catch (error) {
    console.error("API fetch error:", error);

    // Fallback to basic scraping if API fails
    return fallbackScraping(asin);
  }
}

function fallbackScraping(asin) {
  console.log("Falling back to basic scraping");

  const bookData = {
    asin: asin,
    sourceUrl: window.location.href,
    title: "",
    authors: [],
    narrators: [],
    summary: "",
    coverImage: "",
  };

  // Basic title extraction
  const titleElement = document.querySelector("h1.bc-heading, h1");
  if (titleElement) {
    bookData.title = titleElement.textContent.trim();
  }

  // Basic cover image extraction
  const imageElement = document.querySelector(
    'img[src*="images-na.ssl-images-amazon.com"], img[src*="m.media-amazon.com"]',
  );
  if (imageElement && imageElement.src) {
    bookData.coverImage = imageElement.src;
  }

  return bookData;
}

async function scrapeBookData() {
  if (!isAudibleBookPage()) {
    console.log("Not an Audible book page");
    return null;
  }

  const asin = extractASINFromURL();
  if (!asin) {
    console.log("Could not extract ASIN from page");
    return null;
  }

  console.log("Found ASIN:", asin);

  // Try API first, fallback to scraping if needed
  const bookData = await fetchBookDataFromAPI(asin);
  return bookData;
}

// Listen for messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeBook") {
    scrapeBookData()
      .then((bookData) => {
        console.log("Sending book data:", bookData);
        sendResponse(bookData);
      })
      .catch((error) => {
        console.error("Scraping error:", error);
        sendResponse(null);
      });

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});
