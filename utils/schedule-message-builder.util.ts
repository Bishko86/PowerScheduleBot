import { UI_TEXT } from "../consts/ui-text.const.js";
import type { DayData } from "./data-fetch.util.js";

const kyivTimeFormatter = new Intl.DateTimeFormat("uk-UA", {
  timeZone: "Europe/Kyiv",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const kyivDateFormatter = new Intl.DateTimeFormat("uk-UA", {
  timeZone: "Europe/Kyiv",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function buildScheduleMessage(
  group: string,
  day: "today" | "tomorrow",
  dayData: DayData | null,
): string {
  const status = dayData?.schedule?.[group];
  const statusText = !status
    ? UI_TEXT.noData
    : `${status.includes("Електроенергія є") ? "🟢" : "🔴"} ${status}`;

  const checkTime = kyivTimeFormatter.format(new Date());

  // Calculate the target date (today or tomorrow)
  const targetDate = new Date();
  if (day === "tomorrow") {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  const formattedDate = kyivDateFormatter.format(targetDate);

  const powerData = dayData?.updateTime
    ? `🕒 _Дані: ${dayData.updateTime}_\n`
    : "";

  return (
    `📅 **Графік: ${day === "today" ? "Сьогодні" : "Завтра"}** (${formattedDate})\n` +
    `👥 **Група: ${group}**\n\n` +
    `${statusText}\n\n` +
    `${powerData}` +
    `♻️ _Перевірено: ${checkTime}_`
  );
}
