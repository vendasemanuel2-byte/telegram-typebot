import { Bot, InlineKeyboard } from "grammy";
import axios from "axios";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TYPEBOT_PUBLIC_ID = "g38gg26nuhlx7tvydaveudgw";   // ← Mude se for diferente

const bot = new Bot(TELEGRAM_TOKEN);
const sessions = new Map();

bot.command("start", async (ctx) => {
  sessions.delete(ctx.chat.id);
  await ctx.reply("👋 Olá amor! Iniciando conversa com a Daniela...");
  await handleTypebotMessage(ctx, "Oi");
});

bot.command("reset", async (ctx) => {
  sessions.delete(ctx.chat.id);
  await ctx.reply("🔄 Sessão resetada.");
});

async function handleTypebotMessage(ctx, userMessage) {
  const chatId = ctx.chat.id;
  let sessionId = sessions.get(chatId);

  try {
    if (!sessionId) {
      const startRes = await axios.post(
        `https://typebot.io/api/v1/typebots/${TYPEBOT_PUBLIC_ID}/startChat`,
        { isStreamEnabled: true }
      );
      sessionId = startRes.data.sessionId;
      sessions.set(chatId, sessionId);
    }

    const replyRes = await axios.post(
      `https://typebot.io/api/v1/sessions/${sessionId}`,
      { message: userMessage }
    );

    const messages = replyRes.data.messages || [];

    for (const msg of messages) {
      if (msg.type === "text") {
        await ctx.reply(msg.content?.text || msg.content || "❤️");
      } else if (msg.type === "image" && msg.content?.url) {
        await ctx.replyWithPhoto(msg.content.url);
      } else if (msg.type === "audio" && msg.content?.url) {
        await ctx.replyWithAudio(msg.content.url);
      } else if (msg.items?.length > 0) {
        const keyboard = new InlineKeyboard();
        msg.items.forEach(item => {
          const label = item.content || item;
          keyboard.text(label, `choice:${label}`).row();
        });
        await ctx.reply("Escolha uma opção:", { reply_markup: keyboard });
      }
    }
  } catch (error) {
    console.error("Erro:", error.response?.data || error.message);
    await ctx.reply("❌ Erro temporário. Use /reset");
  }
}

bot.on("message:text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;
  await handleTypebotMessage(ctx, ctx.message.text);
});

bot.on("callback_query:data", async (ctx) => {
  const choice = ctx.callbackQuery.data.replace("choice:", "");
  await ctx.answerCallbackQuery();
  await handleTypebotMessage(ctx, choice);
});

bot.start();
console.log("🚀 Bot rodando com ID:", TYPEBOT_PUBLIC_ID);
