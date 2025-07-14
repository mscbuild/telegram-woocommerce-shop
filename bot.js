require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const config = require('./config');

const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });

const WooCommerce = new WooCommerceRestApi({
  url: config.WOOCOMMERCE_URL,
  consumerKey: config.WOOCOMMERCE_CONSUMER_KEY,
  consumerSecret: config.WOOCOMMERCE_CONSUMER_SECRET,
  version: 'wc/v3'
});

const carts = new Map();
const orderSteps = new Map();

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 Welcome to the store!\n\nWrite /products, to see the products\n/cart — view cart.");
});

// /products
bot.onText(/\/products/, async (msg) => {
  try {
    const res = await WooCommerce.get("products", { per_page: 5 });
    for (let product of res.data) {
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: `🛒 Add to cart (${product.price}₽)`, callback_data: `add_${product.id}` }]
          ]
        }
      };

      await bot.sendPhoto(msg.chat.id, product.images[0]?.src || '', {
        caption: `*${product.name}*\n${product.price}₽\n\n${product.short_description.replace(/<[^>]+>/g, '')}`,
        parse_mode: 'Markdown',
        ...opts
      });
    }
  } catch (e) {
    console.error(e);
    bot.sendMessage(msg.chat.id, "❌ Error while receiving goods.");
  }
});

// /cart
bot.onText(/\/cart/, (msg) => {
  const cart = carts.get(msg.chat.id) || [];
  if (cart.length === 0) return bot.sendMessage(msg.chat.id, "🧺 Your cart is empty.");

  let text = "🛒 Your Cart:\n\n";
  let total = 0;

  for (let item of cart) {
    text += `• ${item.name} x${item.quantity} — ${item.price * item.quantity}₽\n`;
    total += item.price * item.quantity;
  }

  text += `\n💰 Total: ${total}₽`;

  bot.sendMessage(msg.chat.id, text, {
    reply_markup: {
      inline_keyboard: [[{ text: "✅ Place an order", callback_data: "checkout" }]]
    }
  });
});

// Button handling
bot.on("callback_query", async (query) => {
  const msg = query.message;
  const chatId = msg.chat.id;
  const data = query.data;

  // Add to cart
  if (data.startsWith("add_")) {
    const id = data.split("_")[1];
    try {
      const product = (await WooCommerce.get(`products/${id}`)).data;
      let cart = carts.get(chatId) || [];
      const index = cart.findIndex(p => p.id == product.id);

      if (index > -1) cart[index].quantity += 1;
      else cart.push({ id: product.id, name: product.name, price: parseFloat(product.price), quantity: 1 });

      carts.set(chatId, cart);
      bot.answerCallbackQuery(query.id, { text: "✅ Added to cart" });
    } catch (err) {
      console.error(err);
      bot.answerCallbackQuery(query.id, { text: "❌ Error" });
    }
  }

  // Placing an order
  if (data === "checkout") {
    const cart = carts.get(chatId);
    if (!cart || cart.length === 0) {
      return bot.sendMessage(chatId, "🧺 Cart is empty.");
    }

    orderSteps.set(chatId, { step: "name", cart });
    bot.sendMessage(chatId, "📛 Please enter your *first and last name*:", {
      parse_mode: "Markdown",
      reply_markup: { force_reply: true }
    });
  }
});

// Collecting customer data
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const data = orderSteps.get(chatId);
  if (!data || msg.text.startsWith("/")) return;

  const text = msg.text.trim();

  if (data.step === "name") {
    data.name = text;
    data.step = "phone";
    return bot.sendMessage(chatId, "📞 Enter your *phone*:", {
      parse_mode: "Markdown", reply_markup: { force_reply: true }
    });
  }

  if (data.step === "phone") {
    data.phone = text;
    data.step = "email";
    return bot.sendMessage(chatId, "📧 Enter your *email* (or -):", {
      parse_mode: "Markdown", reply_markup: { force_reply: true }
    });
  }

  if (data.step === "email") {
    data.email = text === "-" ? "" : text;
    const { name, phone, email, cart } = data;

    const [first_name, last_name = ""] = name.split(" ");

    const order = {
      payment_method: "cod",
      payment_method_title: "Payment upon receipt",
      set_paid: false,
      billing: {
        first_name, last_name, address_1: "N/A", city: "Telegram", state: "TG",
        postcode: "00000", country: "LV", email, phone
      },
      shipping: {
        first_name, last_name, address_1: "N/A", city: "Telegram", state: "TG",
        postcode: "00000", country: "LV"
      },
      line_items: cart.map(i => ({ product_id: i.id, quantity: i.quantity }))
    };

    try {
      await WooCommerce.post("orders", order);
      bot.sendMessage(chatId, "✅ The order has been placed! We will contact you.");
      bot.sendMessage(config.ADMIN_CHAT_ID,
        `🛍 New order:\n👤 ${name}\n📞 ${phone}\n📧 ${email}\n\n` +
        cart.map(i => `• ${i.name} x${i.quantity}`).join("\n")
      );

      carts.delete(chatId);
      orderSteps.delete(chatId);
    } catch (err) {
      console.error(err.response?.data || err);
      bot.sendMessage(chatId, "❌ Error while placing your order.");
    }
  }
});
