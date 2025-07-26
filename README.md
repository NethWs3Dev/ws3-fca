# 🚘 ws3-fca

![Image](wiegine.png)
# Fully Mqtt
### Remodified by Johnsteve Costaños
**ws3-fca** is a fully refactored Facebook Chat API (FCA) client built for **reliable**, **real-time**, and **modular** interaction with Facebook Messenger. Designed with modern bot development in mind, it offers full control over Messenger automation through a clean, stable interface.

---

## 📚 Documentation & Feedback

Full documentation and advanced examples:
[https://exocore-dev-docs-exocore.hf.space](https://exocore-dev-docs-exocore.hf.space)

If you encounter issues or want to give feedback, feel free to message us via Facebook:

* [@Kenneth Aceberos](https://www.facebook.com/Neth.Aceb07/)
* [@Johnsteve Costaños](https://www.facebook.com/johnstevecostanos2025/)
* [@Jonell Magallanes 󱢏](https://www.facebook.com/ccprojectsjonell10/)

---

## ✨ Features

* 🔐 **Precise Login Mechanism**
  Dynamically scrapes Facebook's login form and submits tokens for secure authentication.

* 💬 **Real-time Messaging**
  Send and receive messages (text, attachments, stickers, replies).

* 📝 **Message Editing**
  Edit your bot’s messages in-place.

* ✍️ **Typing Indicators**
  Detect and send typing status.

* ✅ **Message Status Handling**
  Mark messages as delivered, read, or seen.

* 📂 **Thread Management**

  * Retrieve thread details
  * Load thread message history
  * Get lists with filtering
  * Pin/unpin messages

* 👤 **User Info Retrieval**
  Access name, ID, profile picture, and mutual context.

* 🖼️ **Sticker API**
  Search stickers, list packs, fetch store data, AI-stickers.

* 💬 **Post Interaction**
  Comment and reply to public Facebook posts.

* ➕ **Follow/Unfollow Users**
  Automate social interactions.

* 🌐 **Proxy Support**
  Full support for custom proxies.

* 🧱 **Modular Architecture**
  Organized into pluggable models for maintainability.

* 🛡️ **Robust Error Handling**
  Retry logic, consistent logging, and graceful failovers.

---

## ⚙️ Installation

> Requires **Node.js v20+**

```bash
npm install ws3-fca
```

---

## 🚀 Getting Started

### 1. Generate `appstate.json`

This file contains your Facebook session cookies.
Use a browser extension (e.g. "C3C FbState", "CookieEditor") to export cookies after logging in, and save them in this format:

```json
[
  {
    "key": "c_user",
    "value": "your-id"
  }
]
```

If you don't know how to get cookie, you can follow this tutorial **[here](https://appstate-tutorial-ws3.pages.dev)**.

Place this file in the root directory as `appstate.json`.

---

### 2. Basic Usage Example

```js
const fs = require("fs");
const path = require("path");
const { login } = require("ws3-fca");

let credentials;
try {
  credentials = { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) };
} catch (err) {
  console.error("❌ appstate.json is missing or malformed.", err);
  process.exit(1);
}

console.log("Logging in...");

login(credentials, {
  online: true,
  updatePresence: true,
  selfListen: false,
  randomUserAgent: false
}, async (err, api) => {
  if (err) return console.error("LOGIN ERROR:", err);

  console.log(`✅ Logged in as: ${api.getCurrentUserID()}`);

  const commandsDir = path.join(__dirname, "modules", "commands");
  api.commands = new Map();

  if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir, { recursive: true });

  for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith(".js"))) {
    const command = require(path.join(commandsDir, file));
    if (command.name && typeof command.execute === "function") {
      api.commands.set(command.name, command);
      console.log(`🔧 Loaded command: ${command.name}`);
    }
  }

  api.listenMqtt(async (err, event) => {
    if (err || !event.body || event.type !== "message") return;

    const prefix = "/";
    if (!event.body.startsWith(prefix)) return;

    const args = event.body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = api.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute({ api, event, args });
    } catch (error) {
      console.error(`Error executing ${commandName}:`, error);
      api.sendMessageMqtt("❌ An error occurred while executing the command.", event.threadID, event.messageID);
    }
  });
});
```

---

## 🙌 Credits

* 🔧 **@NethWs3Dev (Kenneth Aceberos)** – Main developer, equal maintainer, feature and patch contributions.
* 💧 **@ChoruOfficial** – Lead developer, refactor of original FCA code, Fully Setup Mqtt.
* 🔮 **@CommunityExocore** – Foundational core design and architecture.

> Copyright (c) 2015
> Avery, Benjamin, David, Maude

---

## 📊 License

**MIT** – Free to use, modify, and distribute. Attribution appreciated.
