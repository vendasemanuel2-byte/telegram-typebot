import { Bot } from "grammy";
import axios from "axios";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TYPEBOT_ID = "g38gg26nuhlx7tvydaveudgw";

const bot = new Bot(TELEGRAM_TOKEN);
const sessions = new Map();

console.log("🚀 Bot iniciado");

bot.command("start", async (ctx) => {
  sessions.delete(ctx.chat.id);
  await ctx.reply("👋 Olá amor! Tentando conectar com a Daniela...");
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
        `https://typebot.io/api/v1/typebots/${TYPEBOT_ID}`,
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
      }
    }
  } catch (error) {
    console.error("ERRO:", error.response?.data || error.message);
    await ctx.reply("❌ Daniela está ocupada agora. Tente /reset mais tarde.");
  }
}

bot.on("message:text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;
  await handleTypebotMessage(ctx, ctx.message.text);
});

bot.start();
