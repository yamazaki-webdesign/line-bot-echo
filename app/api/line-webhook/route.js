import { validateSignature, messagingApi } from "@line/bot-sdk";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

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
    events.map((event) => {
      if (event.type === "message" && event.message.type === "text") {
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: event.message.text }],
        });
      }
      return Promise.resolve();
    })
  );

  return new Response("OK", { status: 200 });
}
