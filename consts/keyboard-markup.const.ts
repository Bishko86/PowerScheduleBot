import { Markup } from "telegraf";
import { POWER_GROUPS } from "./groups-list.const.js";

// --- Keyboard Factories ---

export const Keyboards = {
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