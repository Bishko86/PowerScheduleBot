import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { getLvivPowerData } from "./utils/data-fetch.util.js";
import { stat } from "node:fs";

dotenv.config();

// --- Configuration & Constants ---
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing in .env");

const bot = new Telegraf(BOT_TOKEN);

const POWER_GROUPS = [
  ["1.1", "1.2"],
  ["2.1", "2.2"],
  ["3.1", "3.2"],
  ["4.1", "4.2"],
  ["5.1", "5.2"],
  ["6.1", "6.2"],
];

const UI_TEXT = {
  welcome:
    "👋 Вітаємо! Я допоможу вам швидко перевірити графік відключень.\n\n**Виберіть свою групу:**",
  selectDay: (group: string) =>
    `Ви обрали групу **${group}**. На який день показати графік?`,
  noData:
    "🟡 Дані на цей день ще не оприлюднені або сайт обленерго недоступний.",
  error: "⚠️ Сталася помилка при отриманні даних. Спробуйте пізніше.",
  refreshing: "Оновлюю дані... 🔄",
};

// --- Keyboard Factories ---
const Keyboards = {
  mainMenu: () =>
    Markup.inlineKeyboard(
      POWER_GROUPS.map((pair) =>
        pair.map((g) => Markup.button.callback(`Група ${g}`, `select_${g}`)),
      ),
    ),
  daySelection: (group: string) =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Сьогодні", `date_${group}_today`),
        Markup.button.callback("Завтра", `date_${group}_tomorrow`),
      ],
      [Markup.button.callback("⬅️ Назад до груп", "back_to_groups")],
    ]),
  refreshResult: (group: string, day: string) =>
    Markup.inlineKeyboard([
      [Markup.button.callback("🔄 Оновити", `date_${group}_${day}`)],
      [
        Markup.button.callback("Сьогодні", `date_${group}_today`),
        Markup.button.callback("Завтра", `date_${group}_tomorrow`),
      ],
      [Markup.button.callback("⬅️ Назад", "back_to_groups")],
    ]),
};

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

bot.action(/date_(.+)_(.+)/, async (ctx) => {
  const group = ctx.match[1];
  const day = ctx.match[2] as "today" | "tomorrow";

  try {
    await ctx.answerCbQuery(UI_TEXT.refreshing);

    const isToday = day === "today";

    const allData = await getLvivPowerData(isToday);

    const dayData = allData?.[day];
    const status = dayData?.schedule?.[group];
    let statusText = "";

    if (!status) {
      statusText = UI_TEXT.noData;
    } else {
      const statusEmoji = status.includes("Електроенергія є") ? "🟢" : "🔴";
      statusText = `${statusEmoji} ${status}`;
    }

    // Use the correct IANA zone name and call .format(new Date())
    const checkTimeFormatter = new Intl.DateTimeFormat("uk-UA", {
      timeZone: "Europe/Kyiv", // use Europe/Kyiv (not Europe/Kiev)
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const checkTime = checkTimeFormatter.format(new Date());
    const powerData = dayData?.updateTime
      ? `🕒 _Дані: ${dayData.updateTime}_\n`
      : "";

    const message =
      `📅 **Графік: ${isToday ? "Сьогодні" : "Завтра"}**\n` +
      `👥 **Група: ${group}**\n\n` +
      `${statusText}\n\n` +
      `${powerData}` +
      `♻️ _Перевірено: ${checkTime}_`;

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
