import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { getLvivPowerData } from "./utils/data-fetch.util.js";

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
    "🔴 Дані на цей день ще не оприлюднені або сайт обленерго недоступний.",
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

    const allData = await getLvivPowerData();
    if (!allData || !allData[day]) {
      return ctx.reply(UI_TEXT.noData);
    }

    const dayData = allData[day]!;
    const status = dayData.schedule[group] || "Інформація відсутня";
    const statusEmoji = status.includes("є") ? "🟢" : "🔴";
    const checkTime = new Date().toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const message =
      `📅 **Графік: ${day === "today" ? "Сьогодні" : "Завтра"}**\n` +
      `👥 **Група: ${group}**\n\n` +
      `${statusEmoji} ${status}\n\n` +
      `🕒 _Дані: ${dayData.updateTime}_\n` +
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
    return ctx.reply(UI_TEXT.error);
  }
});

bot.action("back_to_groups", (ctx) => {
  return ctx.editMessageText(UI_TEXT.welcome, {
    parse_mode: "Markdown",
    ...Keyboards.mainMenu(),
  });
});

// --- Production Launch ---
bot
  .launch()
  .then(() => console.log("Lviv Power Bot is live! 🚀"))
  .catch((err) => console.error("Critical Launch Error:", err));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
