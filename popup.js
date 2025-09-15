let currentBookData = null;
let jeluCredentials = null;
let importedBookId = null;

// Jelu API helper functions
class JeluAPI {
  constructor(baseUrl, username, password, token = null) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.username = username;
    this.password = password;
    this.token = token;
    this.authHeader = token
      ? null // We'll use X-Auth-Token header instead
      : "Basic " + btoa(`${username}:${password}`);
  }

  getHeaders() {
    if (this.token) {
      return {
        "X-Auth-Token": this.token,
        "Content-Type": "application/json",
      };
    } else {
      return {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      };
    }
  }

  async getToken() {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/token`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        return data.token;
      }
      return null;
    } catch (error) {
      console.error("Token retrieval failed:", error);
      return null;
    }
  }

  async testConnection() {
    try {
      // If we have a token, test with that first
      if (this.token) {
        const response = await fetch(`${this.baseUrl}/api/v1/users/me`, {
          method: "GET",
          headers: this.getHeaders(),
        });
        if (response.ok) return true;

        // Token might be expired, clear it
        this.token = null;
      }

      // Try with Basic auth and get a new token
      const response = await fetch(
        `${this.baseUrl}/api/v1/books?page=0&size=1`,
        {
          method: "GET",
          headers: this.getHeaders(),
        },
      );

      if (response.ok) {
        // Get and store token for future use
        await this.getToken();
        return true;
      }

      return false;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  async importBook(bookData) {
    // Transform Audible data to Jelu BookCreateDto format
    const jeluBook = {
      title: bookData.title || "",
      isbn10: null,
      isbn13: null,
      summary: this.stripHtml(bookData.summary || ""),
      publisher: bookData.publisher || null,
      publishedDate: bookData.publishDate || null,
      pageCount: null,
      goodreadsId: null,
      googleId: null,
      librarythingId: null,
      amazonId: bookData.asin || null,
      language: bookData.language || "en",
      authors: (bookData.authors || []).map((name) => ({ name })),
      narrators: (bookData.narrators || []).map((name) => ({ name })),
      tags: [{ name: "Audiobook" }, { name: "Audible" }],
      image: bookData.coverImage || null,
    };

    // Add series information if available
    if (bookData.series) {
      jeluBook.series = [
        {
          name: bookData.series,
          numberInSeries: bookData.seriesPosition
            ? parseFloat(bookData.seriesPosition)
            : null,
        },
      ];
    }

    // Create UserBook (this adds it to "my books")
    const userBook = {
      book: jeluBook,
      owned: true, // Mark as owned since it's from Audible
      personalNotes: `Imported from Audible\nASIN: ${bookData.asin}\nSource: ${bookData.sourceUrl}`,
    };

    console.log("Book payload being sent:", JSON.stringify(userBook, null, 2));

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/userbooks`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(userBook),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Try to upload cover image if available and book was created
      if (bookData.coverImage && result.book && result.book.id) {
        await this.uploadCoverImage(result.book.id, bookData.coverImage);
      }

      return result;
    } catch (error) {
      console.error("Book import failed:", error);
      throw error;
    }
  }

  async uploadCoverImage(bookId, imageUrl) {
    try {
      // Download the image first
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) return;

      const blob = await imageResponse.blob();

      // Create form data for upload
      const formData = new FormData();
      formData.append("file", blob, "cover.jpg");

      const response = await fetch(
        `${this.baseUrl}/api/v1/books/${bookId}/image`,
        {
          method: "POST",
          headers: this.token
            ? { "X-Auth-Token": this.token }
            : { Authorization: this.authHeader },
          body: formData,
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Cover upload failed:", error);
      return false;
    }
  }

  async checkBookExists(asin) {
    try {
      // Search user's books for this ASIN
      const response = await fetch(
        `${this.baseUrl}/api/v1/userbooks?q=${encodeURIComponent(asin)}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        },
      );

      if (response.ok) {
        const data = await response.json();
        // Check if any of the returned books have matching amazonId (where we store ASIN)
        if (data.content && data.content.length > 0) {
          const existingBook = data.content.find(
            (userBook) => userBook.book && userBook.book.amazonId === asin,
          );
          return existingBook || null;
        }
      }
      return null;
    } catch (error) {
      console.error("Error checking for existing book:", error);
      return null;
    }
  }

  stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }
}

// UI helper functions
function showStatus(message, type = "success") {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = "block";

  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 5000);
}

function updateJeluStatus(connected, url = "") {
  console.log("updateJeluStatus called:", {
    connected,
    url,
    currentBookData: !!currentBookData,
    importedBookId,
  });
  const statusElement = document.getElementById("jeluStatus");
  const loginForm = document.getElementById("loginForm");
  const loggedInInfo = document.getElementById("loggedInInfo");
  const connectedUrlElement = document.getElementById("connectedUrl");
  const importBtn = document.getElementById("importBtn");

  if (connected) {
    statusElement.textContent = "Connected";
    statusElement.className = "connected";
    loginForm.classList.add("hidden");
    loggedInInfo.classList.remove("hidden");
    connectedUrlElement.textContent = url;

    // Enable import if we have book data, or keep existing button state
    if (currentBookData || importedBookId) {
      importBtn.disabled = false;
    }
  } else {
    statusElement.textContent = "Not connected";
    statusElement.className = "disconnected";
    loginForm.classList.remove("hidden");
    loggedInInfo.classList.add("hidden");
    importBtn.disabled = true;
    document.getElementById("openInJeluBtn").classList.add("hidden");
    jeluCredentials = null;
    importedBookId = null;
  }
}

async function displayBookData(bookData) {
  console.log("Displaying book data:", bookData);

  if (!bookData) {
    document.getElementById("bookData").classList.add("hidden");
    document.getElementById("noBook").style.display = "block";
    document.getElementById("importBtn").disabled = true;
    return;
  }

  currentBookData = bookData;

  // Hide the open button since we have new book data
  document.getElementById("openInJeluBtn").classList.add("hidden");
  importedBookId = null;

  // Hide the retry scrape button since we have data
  document.getElementById("scrapeBtn").classList.add("hidden");

  document.getElementById("bookTitle").textContent =
    bookData.title || "Unknown Title";
  document.getElementById("bookAuthor").textContent =
    bookData.authors && bookData.authors.length > 0
      ? `By: ${bookData.authors.join(", ")}`
      : "Author: Unknown";
  document.getElementById("bookNarrator").textContent =
    bookData.narrators && bookData.narrators.length > 0
      ? `Narrated by: ${bookData.narrators.join(", ")}`
      : "";
  document.getElementById("bookSeries").textContent = bookData.series
    ? `Series: ${bookData.series}${bookData.seriesPosition ? ` #${bookData.seriesPosition}` : ""}`
    : "";
  document.getElementById("bookPublisher").textContent = bookData.publisher
    ? `Publisher: ${bookData.publisher}`
    : "";

  document.getElementById("bookData").classList.remove("hidden");
  document.getElementById("noBook").style.display = "none";

  // Check if book already exists if Jelu is connected
  if (jeluCredentials && bookData.asin) {
    showStatus("Checking if book already exists...", "info");
    const existingBook = await jeluCredentials.checkBookExists(bookData.asin);

    if (existingBook) {
      // Book already exists - show "View in Jelu" button instead of import
      importedBookId = existingBook.id;
      console.log(
        "Found existing book, setting up View button:",
        existingBook.id,
      );
      document.getElementById("importBtn").textContent = "View in Jelu";
      document.getElementById("importBtn").disabled = false;
      document.getElementById("importBtn").className = "open-btn"; // Use the blue style
      console.log("Button state after setting:", {
        text: document.getElementById("importBtn").textContent,
        disabled: document.getElementById("importBtn").disabled,
        className: document.getElementById("importBtn").className,
      });
      showStatus("Book already in your Jelu library!");
    } else {
      // Book doesn't exist - show normal import button
      document.getElementById("importBtn").textContent = "Import Book to Jelu";
      document.getElementById("importBtn").disabled = false;
      document.getElementById("importBtn").className = "import-btn"; // Use the green style
      showStatus("Book data scraped successfully!");
    }
  } else if (jeluCredentials) {
    // Connected but no ASIN - enable normal import
    document.getElementById("importBtn").textContent = "Import Book to Jelu";
    document.getElementById("importBtn").disabled = false;
    document.getElementById("importBtn").className = "import-btn";
    showStatus("Book data scraped successfully!");
  } else {
    // Not connected to Jelu
    document.getElementById("importBtn").disabled = true;
    showStatus("Book data scraped successfully!");
  }
}

// Event listeners
document.getElementById("scrapeBtn").addEventListener("click", async () => {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];

    if (!tab.url.includes("audible.")) {
      showStatus("Please navigate to an Audible book page first.", "error");
      return;
    }

    showStatus("Scraping book data...", "info");
    const response = await browser.tabs.sendMessage(tab.id, {
      action: "scrapeBook",
    });

    if (response) {
      await displayBookData(response);
      // Hide the retry button since scraping worked
      document.getElementById("scrapeBtn").classList.add("hidden");
    } else {
      showStatus("No book data found on this page.", "error");
    }
  } catch (error) {
    console.error("Error scraping book data:", error);
    showStatus(
      "Error scraping book data. Make sure you're on an Audible book page.",
      "error",
    );
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const url = document.getElementById("jeluUrl").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!url || !username || !password) {
    showStatus("Please fill in all Jelu connection fields.", "error");
    return;
  }

  showStatus("Connecting to Jelu...", "info");

  try {
    const jelu = new JeluAPI(url, username, password);
    const connected = await jelu.testConnection();

    if (connected) {
      jeluCredentials = jelu;
      updateJeluStatus(true, url);
      showStatus("Successfully connected to Jelu!");

      // Save credentials and token for persistent session
      await browser.storage.local.set({
        jeluUrl: url,
        jeluUsername: username,
        jeluToken: jelu.token,
        // Note: Not storing password for security
      });
    } else {
      showStatus(
        "Failed to connect to Jelu. Check your credentials and URL.",
        "error",
      );
    }
  } catch (error) {
    console.error("Jelu connection error:", error);
    showStatus("Connection error: " + error.message, "error");
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  updateJeluStatus(false);
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";

  // Clear saved token
  await browser.storage.local.remove(["jeluToken"]);

  showStatus("Disconnected from Jelu.", "info");
});

document.getElementById("importBtn").addEventListener("click", async () => {
  if (!currentBookData) {
    showStatus("No book data available.", "error");
    return;
  }

  if (!jeluCredentials) {
    showStatus("Please connect to Jelu first.", "error");
    return;
  }

  const buttonText = document.getElementById("importBtn").textContent;

  if (buttonText === "View in Jelu") {
    // Book already exists - open it in Jelu
    if (importedBookId) {
      const bookUrl = `${jeluCredentials.baseUrl}/books/${importedBookId}`;
      console.log("Opening existing book URL:", bookUrl);
      browser.tabs.create({ url: bookUrl });
    } else {
      showStatus("Book ID not found.", "error");
    }
  } else {
    // Import new book
    showStatus("Importing book to Jelu...", "info");

    try {
      const result = await jeluCredentials.importBook(currentBookData);
      importedBookId = result.id; // Use UserBook ID for "my books" view
      console.log("Import result:", result);
      console.log("Extracted book ID:", importedBookId);
      console.log("UserBook ID:", result.id);
      console.log("Book ID:", result.book ? result.book.id : "no book object");

      showStatus(`Successfully imported "${currentBookData.title}" to Jelu!`);

      // Update button to "View in Jelu" since we now have the book
      document.getElementById("importBtn").textContent = "View in Jelu";
      document.getElementById("importBtn").className = "open-btn";
    } catch (error) {
      console.error("Import error:", error);
      showStatus("Import failed: " + error.message, "error");
    }
  }
});

document.getElementById("openInJeluBtn").addEventListener("click", () => {
  if (!jeluCredentials || !importedBookId) {
    showStatus("No imported book to open.", "error");
    return;
  }

  const bookUrl = `${jeluCredentials.baseUrl}/books/${importedBookId}`;
  console.log("Opening book URL:", bookUrl);
  console.log("Using book ID:", importedBookId);
  browser.tabs.create({ url: bookUrl });
});

// Auto-scrape and load saved credentials on popup open
document.addEventListener("DOMContentLoaded", async () => {
  // Load saved Jelu URL, username, and token
  try {
    const saved = await browser.storage.local.get([
      "jeluUrl",
      "jeluUsername",
      "jeluToken",
    ]);
    if (saved.jeluUrl) {
      document.getElementById("jeluUrl").value = saved.jeluUrl;
    }
    if (saved.jeluUsername) {
      document.getElementById("username").value = saved.jeluUsername;
    }

    // Try to auto-login with saved token
    if (saved.jeluUrl && saved.jeluUsername && saved.jeluToken) {
      showStatus("Checking saved session...", "info");
      const jelu = new JeluAPI(
        saved.jeluUrl,
        saved.jeluUsername,
        "",
        saved.jeluToken,
      );
      const connected = await jelu.testConnection();

      if (connected) {
        jeluCredentials = jelu;
        updateJeluStatus(true, saved.jeluUrl);
        showStatus("Automatically connected using saved session!");
      } else {
        // Token expired or invalid, clear it
        await browser.storage.local.remove(["jeluToken"]);
        showStatus("Saved session expired. Please login again.", "info");
      }
    }
  } catch (error) {
    console.log("No saved credentials or auto-login failed:", error);
  }

  // Auto-scrape if on Audible page
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];

    if (tab.url.includes("audible.")) {
      setTimeout(async () => {
        try {
          const response = await browser.tabs.sendMessage(tab.id, {
            action: "scrapeBook",
          });
          if (response) {
            await displayBookData(response);
          } else {
            // Auto-scrape failed to get data, show retry button
            document.getElementById("scrapeBtn").classList.remove("hidden");
            showStatus(
              "Auto-scrape failed. Click 'Retry Scraping' if needed.",
              "info",
            );
          }
        } catch (error) {
          console.log("Auto-scrape failed:", error);
          // Auto-scrape failed, show retry button
          document.getElementById("scrapeBtn").classList.remove("hidden");
          showStatus(
            "Auto-scrape failed. Click 'Retry Scraping' if needed.",
            "info",
          );
        }
      }, 500);
    }
  } catch (error) {
    console.error("Error in auto-scrape:", error);
  }
});
