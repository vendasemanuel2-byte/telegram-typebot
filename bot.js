import { Bot, InlineKeyboard } from "grammy";
import axios from "axios";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TYPEBOT_ID = "g38gg26nuhlx7tvydaveudgw";

const bot = new Bot(TELEGRAM_TOKEN);
const sessions = new Map();

console.log("🚀 Bot iniciado - Typebot ID:", TYPEBOT_ID);

bot.command("start", async (ctx) => {
  sessions.delete(ctx.chat.id);
  await ctx.reply("👋 Olá amor! Iniciando conversa com a Daniela...");
  await handleTypebotMessage(ctx, "Oi");
});

bot.command("reset", async (ctx) => {
  sessions.delete(ctx.chat.id);
  await ctx.reply("🔄 Sessão resetada. Digite algo para continuar.");
});

async function handleTypebotMessage(ctx, userMessage) {
  const chatId = ctx.chat.id;
  let sessionId = sessions.get(chatId);

  try {
    console.log(`📨 Mensagem de ${chatId}: ${userMessage}`);

    if (!sessionId) {
      console.log("🔄 Iniciando nova sessão no Typebot...");
      const startRes = await axios.post(
        `https://typebot.io/api/v1/typebots/${TYPEBOT_ID}`,
        { isStreamEnabled: true },
        { timeout: 10000 }
      );
      sessionId = startRes.data.sessionId;
      sessions.set(chatId, sessionId);
      console.log("✅ Sessão criada:", sessionId);
    }

    console.log("📤 Enviando para Typebot...");
    const replyRes = await axios.post(
      `https://typebot.io/api/v1/sessions/${sessionId}`,
      { message: userMessage },
      { timeout: 10000 }
    );

    const messages = replyRes.data.messages || [];
    console.log(`📥 Recebido ${messages.length} mensagens do Typebot`);

    for (const msg of messages) {
      if (msg.type === "text") {
        await ctx.reply(msg.content.text || msg.content);
      } else if (msg.type === "image") {
        await ctx.replyWithPhoto(msg.content.url);
      } else if (msg.type === "audio") {
        await ctx.replyWithAudio(msg.content.url);
      } else if (msg.items) {
        const keyboard = new InlineKeyboard();
        msg.items.forEach(item => {
          const label = item.content || item;
          keyboard.text(label, `choice:${label}`).row();
        });
        await ctx.reply("Escolha uma opção:", { reply_markup: keyboard });
      }
    }
  } catch (error) {
    console.error("❌ Erro completo:", error.response?.data || error.message);
    await ctx.reply("❌ Erro ao conectar com a Daniela. Use /reset e tente novamente.");
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
console.log("✅ Bot rodando e esperando mensagens...");
