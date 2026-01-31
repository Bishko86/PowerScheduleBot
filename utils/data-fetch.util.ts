import axios from "axios";
import * as cheerio from "cheerio";

// --- Types & Interfaces ---

export interface GroupSchedule {
  [group: string]: string;
}

export interface DayData {
  updateTime: string;
  schedule: GroupSchedule;
}

export interface PowerDataResult {
  today?: DayData;
  tomorrow?: DayData;
}

// Define the shape of the LOE API response for internal use
interface LoeApiResponse {
  "hydra:member": Array<{
    menuItems: Array<{
      name: string;
      rawHtml: string;
    }>;
  }>;
}

// --- Configuration ---

const API_CONFIG = {
  url: process.env.API_URL || "",
  timeout: 10000, // 10 seconds
  headers: {
    "User-Agent": "LvivPowerBot/1.0 (Production; Telegram Bot)",
    Accept: "application/json",
  },
};

// --- Logic ---

/**
 * Fetches and parses power outage data from Lvivoblenergo API.
 * Returns null if the request fails or data is malformed.
 */
export async function getLvivPowerData(): Promise<PowerDataResult | null> {
  try {
    const { data } = await axios.get<LoeApiResponse>(API_CONFIG.url, {
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
    });

    const menuItems = data["hydra:member"]?.[0]?.menuItems;
    if (!menuItems || !Array.isArray(menuItems)) {
      console.warn("[Parser] API structure changed: menuItems not found.");
      return null;
    }

    const result: PowerDataResult = {};

    for (const item of menuItems) {
      const normalizedName = item.name.toLowerCase();

      if (normalizedName === "today" && item.rawHtml) {
        result.today = parseHtmlContent(item.rawHtml);
      } else if (normalizedName === "tomorrow" && item.rawHtml) {
        result.tomorrow = parseHtmlContent(item.rawHtml);
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error: any) {
    console.error(`[API Error] Failed to fetch LOE data: ${error.message}`);
    return null;
  }
}

/**
 * Helper to extract schedule and update time from raw HTML strings.
 */
function parseHtmlContent(html: string): DayData {
  const $ = cheerio.load(html);
  const schedule: GroupSchedule = {};
  let updateTime = "Час не вказано";

  // Extracting the Update Time
  // Targeting the bold text that contains the update timestamp
  const infoText = $("p b")
    .filter((_, el) => $(el).text().includes("станом на"))
    .text();

  if (infoText) {
    updateTime = infoText.replace(/Інформація станом на\s*/, "").trim();
  }

  // Extracting Group Schedules
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    // Updated Regex to be more forgiving with whitespace and dots
    const match = text.match(/^Група\s+(\d+\.\d+)\.?\s*(.*)/i);

    if (match) {
      const [_, group, status] = match;
      schedule[group] = status.trim();
    }
  });

  return { updateTime, schedule };
}
