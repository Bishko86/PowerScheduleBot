import axios from "axios";
import dotenv from "dotenv";
import * as cheerio from "cheerio";

dotenv.config();

const TODAY_ID = 238;
const TOMORROW_ID = 256;

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

/** * Represents the structure of a single menu item from the LOE API 
 */
interface MenuItem {
  id: number;
  name: string;
  rawHtml: string;
  imageUrl?: string;
}

// --- Configuration ---

const API_CONFIG = {
  // Base URL for menu items
  baseUrl: process.env.API_URL_BASE || "https://api.loe.lviv.ua/api/menu_items",
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: "application/json",
    Referer: "https://loe.lviv.ua/",
  },
};

// --- Logic ---

/**
 * Fetches and parses power outage data for a specific day using its static ID.
 * @param isToday - Boolean flag to determine which day to fetch.
 */
export async function getLvivPowerData(
  isToday: boolean,
): Promise<PowerDataResult | null> {
  try {
    // return null;
    const targetId = isToday ? TODAY_ID : TOMORROW_ID;
    
    // Fetching data from a specific static endpoint
    const { data } = await axios.get<MenuItem>(
      `${API_CONFIG.baseUrl}/${targetId}`,
      {
        timeout: API_CONFIG.timeout,
        headers: API_CONFIG.headers,
      },
    );

    // Validate that the response contains the required HTML content
    if (!data || !data.rawHtml) {
      console.warn(`[Parser] API response for ID ${targetId} is empty or rawHtml is missing.`);
      return null;
    }

    const result: PowerDataResult = {};
    const parsedData = parseHtmlContent(data.rawHtml);

    // Assign the parsed data to the correct property based on the requested day
    if (isToday) {
      result.today = parsedData;
    } else {
      result.tomorrow = parsedData;
    }

    return parsedData ? result : null;
  } catch (error: any) {
    console.error(`[API Error] Failed to fetch LOE data: ${error.message}`);
    return null;
  }
}

/**
 * Extracts the update timestamp and group-specific schedules from raw HTML.
 */
function parseHtmlContent(html: string): DayData {
  const $ = cheerio.load(html);
  const schedule: GroupSchedule = {};
  let updateTime = "Time not specified";

  // Extract the "Information as of..." timestamp
  // Targets the bold text inside paragraph tags
  const infoText = $("p b")
    .filter((_, el) => $(el).text().includes("станом на"))
    .text();

  if (infoText) {
    // Clean up the string to keep only the date/time
    updateTime = infoText.replace(/Інформація станом на\s*/, "").trim();
  }

  // Iterate through paragraphs to find group-specific lines
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    // Regex matches "Група X.X" followed by their status
    const match = text.match(/^Група\s+(\d+\.\d+)\.?\s*(.*)/i);

    if (match) {
      const [_, group, status] = match;
      schedule[group] = status.trim();
    }
  });

  return { updateTime, schedule };
}