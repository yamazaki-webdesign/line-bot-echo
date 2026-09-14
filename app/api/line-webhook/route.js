import { validateSignature, messagingApi } from "@line/bot-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function appendToSheet(userText, replyText) {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "A:C",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[new Date().toISOString(), userText, replyText]],
    },
  });
}

const SYSTEM_PROMPT =
  "あなたは『サンプルリフォーム』という会社のカスタマー対応AIです。営業時間は9:00〜18:00、定休日は水曜日、対応エリアは神奈川県全域、外壁塗装や水回りリフォームの相談を受け付けています。この情報をもとに丁寧に回答し、分からないことは正直に『担当者にご確認のうえご連絡します』と答えてください。";

async function generateReply(userText) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userText }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "担当者にご確認のうえご連絡します。";
}

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (
    !signature ||
    !validateSignature(body, process.env.LINE_CHANNEL_SECRET, signature)
  ) {
    return new Response("Invalid signature", { status: 400 });
  }

  const { events } = JSON.parse(body);

  await Promise.all(
    events.map(async (event) => {
      if (event.type === "message" && event.message.type === "text") {
        const userText = event.message.text;
        const replyText = await generateReply(userText);

        appendToSheet(userText, replyText).catch((error) => {
          console.error("Failed to append to Google Sheet:", error);
        });

        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: replyText }],
        });
      }
      return Promise.resolve();
    })
  );

  return new Response("OK", { status: 200 });
}
