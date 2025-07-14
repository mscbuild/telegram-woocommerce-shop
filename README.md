# 🤖 Telegram store for WooCommerce

This project is a Telegram bot that connects to WooCommerce via REST API, displays products, allows you to collect a cart and place orders directly in Telegram.

## 🚀 Possibilities

- Getting a list of products from WooCommerce
- Adding items to cart
- Step-by-step ordering (name, phone, email)
- Sending Orders in WooCommerce
- Telegram Admin Notice

---

## ⚙️ Installation

### 1. Clone the project

```bash
git clone https://github.com/yourusername/telegram-woocommerce-shop.git
cd telegram-woocommerce-shop
~~~

### 2.Install dependencies

~~~bash
npm install
~~~
### 3.Mood

Create a `.env` file based on `.env.example` and add the keys:
~~~bash
TELEGRAM_BOT_TOKEN=xxx
ADMIN_CHAT_ID=123456789
WOOCOMMERCE_URL=https://yourstore.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxx
~~~

### 4. Launch the bot
~~~bash
npm start
~~~

📁 Structure
~~~bash
.
├── bot.js                # Basic logic of the bot
├── config.js             # Configuration (uses .env)
├── .env.example          # Configuration template
├── .gitignore            # Ignored files
├── package.json
└── README.md
~~~


