import dotenv from "dotenv";
dotenv.config();

import { Telegraf } from "telegraf";
import { getLvivPowerData } from "./utils/data-fetch.util.js";
import { buildScheduleMessage } from "./utils/schedule-message-builder.util.js";
import { Keyboards } from "./consts/keyboard-markup.const.js";
import { UI_TEXT } from "./consts/ui-text.const.js";

// --- Configuration & Constants ---
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing in .env");


const bot = new Telegraf(BOT_TOKEN);

// --- Action Handlers ---

bot.start((ctx) => {
  console.info(
    `[Auth] User ${ctx.from?.id} (${ctx.from?.username}) started the bot.`,
  );
  return ctx.reply(UI_TEXT.welcome, {
    parse_mode: "Markdown",
    ...Keyboards.mainMenu(),
  });
});

bot.action(/select_(.+)/, (ctx) => {
  const group = ctx.match[1];
  return ctx.editMessageText(UI_TEXT.selectDay(group), {
    parse_mode: "Markdown",
    ...Keyboards.daySelection(group),
  });
});

bot.action(/date_([\d.]+)_(today|tomorrow)/, async (ctx) => {
  const group = ctx.match[1];
  const day = ctx.match[2] as "today" | "tomorrow";

  try {
    await ctx.answerCbQuery(UI_TEXT.refreshing);
    const allData = await getLvivPowerData(day);
    
    const message = buildScheduleMessage(group, day, allData);

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      ...Keyboards.refreshResult(group, day),
    });
  } catch (error: any) {
    if (error.description?.includes("message is not modified")) return;
    console.error(
      `[Error] Fetch failed for user ${ctx.from?.id}:`,
      error.message,
    );
    await ctx.editMessageText(UI_TEXT.error, {
      parse_mode: "Markdown",
      ...Keyboards.refreshResult(group, day),
    });
  }
});

bot.action("back_to_groups", (ctx) => {
  return ctx.editMessageText(UI_TEXT.welcome, {
    parse_mode: "Markdown",
    ...Keyboards.mainMenu(),
  });
});

// --- Production Launch ---
// ---Uncomment below to run the bot in a standalone mode
bot
  .launch()
  .then(() => console.log("Lviv Power Bot is live! 🚀"))
  .catch((err) => console.error("Critical Launch Error:", err));

// --- Exported Handler for Serverless Environments ---
// --- Uncomment below to use in serverless functions like AWS Lambda or Google Cloud Functions

// export const telegramBot = async (req: any, res: any) => {
//   // 1. Ensure we only process POST requests from Telegram
//   if (req.method !== 'POST') {
//     return res.status(403).send('Forbidden');
//   }

//   try {
//     // 2. Telegraf processes the body of the request
//     await bot.handleUpdate(req.body, res);
//   } catch (err) {
//     console.error("Error processing update:", err);
//     // Always return a 200 or 500 so Telegram knows the attempt is finished
//     res.status(500).send("Internal Error");
//   }
// };

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
