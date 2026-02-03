# Lviv Power Bot ⚡️

A Telegram bot that provides real-time scheduled power outage information for Lviv, Ukraine (LOE - Lviv Oblast Energy).

---

## 🎯 Features

- 📊 View power outage schedules by group (1.1 - 6.2)
- 📅 Check schedules for today and tomorrow
- 🔄 Real-time data updates from LOE API
- 🇺🇦 Ukrainian language interface
- ☁️ Supports both standalone and serverless deployment

---

## ⚙️ Prerequisites

- **Node.js** 22.x or higher
- **npm** or **yarn**
- **Telegram Bot Token** (obtain from [@BotFather](https://t.me/BotFather))
- Internet access to the LOE API

---

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone 
cd lviv-power-bot
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your bot token:
```bash
cp .env.example .env
```

Edit `.env`:
```env
BOT_TOKEN=your_telegram_bot_token_here
```

### 3. Run Locally

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm start
```

> **Note:** For local development, ensure `bot.launch()` is uncommented in `index.ts` to run in polling mode.

---

## 📖 Usage

1. Start a chat with your bot on Telegram
2. Send `/start` to begin
3. Select your power group (1.1 - 6.2)
4. Choose the day: "Сьогодні" (Today) or "Завтра" (Tomorrow)
5. View the schedule and use 🔄 to refresh data

---

## 📁 Project Structure
```
lviv-power-bot/
├── index.ts                              # Main bot logic and handlers
├── consts
|   ├── groups-list.const.ts              # list of available groups
|   ├── keyboard-markup.const.ts          # client markup
|   └── ui-text.const.ts                  # ui text
├── utils/
│   ├── data-fetch.util.ts                # LOE API fetching and parsing
│   └── schedule-message-builder.util.ts  # Message formatting
├── .env.example                          # Environment variables template
├── package.json                          # Dependencies and scripts
└── tsconfig.json                         # TypeScript configuration
```

---

## ☁️ Deployment

### Option 1: Google Cloud Functions (Serverless)

#### Prerequisites
- Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- Authenticate: `gcloud auth login`
- Set your project: `gcloud config set project YOUR_PROJECT_ID`

#### Deploy Function
```bash
gcloud functions deploy telegramBot \
  --runtime nodejs22 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point telegramBot \
  --set-env-vars BOT_TOKEN=YOUR_BOT_TOKEN \
  --region europe-west3
```

#### Set Webhook

After deployment, Google Cloud will provide a function URL. Set it as your Telegram webhook:
```bash
curl -X POST "https://api.telegram.org/bot/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://europe-west3-PROJECT_ID.cloudfunctions.net/telegramBot"}'
```

Verify webhook status:
```bash
curl "https://api.telegram.org/bot/getWebhookInfo"
```

> **Important:** Before deploying, uncomment the `telegramBot` export and comment out `bot.launch()` in `index.ts`.

### Option 2: Standalone Server

Keep these lines uncommented:
`bot.launch()`
`process.once("SIGINT", () => bot.stop("SIGINT"));`
`process.once("SIGTERM", () => bot.stop("SIGTERM"));`

Run on any server with Node.js:
```bash
npm run build
cd dist
npm start
```
---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | ✅ Yes | - | Telegram bot token from @BotFather |
| `API_URL_BASE` | No | `https://api.loe.lviv.ua/api/menu_items` | LOE API base URL |

### Hardcoded IDs (in `data-fetch.util.ts`)
```typescript
const TODAY_ID = 238;
const TOMORROW_ID = 256;
```

> ⚠️ **Warning:** These IDs may change. Consider moving them to environment variables or implementing dynamic ID discovery.

---

## 📝 Development Notes

### Known Limitations

- **Static IDs:** `TODAY_ID` and `TOMORROW_ID` are hardcoded and may become outdated
- **No data validation:** Assumes LOE API always returns expected HTML structure
- **Limited error handling:** Network failures could be more gracefully handled

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).

---

**Created with ⚡️ for Ukraine residents**