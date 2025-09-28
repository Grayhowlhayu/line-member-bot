import { Client, validateSignature } from "@line/bot-sdk";
 
// ---- 環境変数（Vercelに設定します）----
const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
});
 
// ---- メンバー情報（サンプル6人分：あとで置き換えOK）----
const members = [
  {
    keys: ["山田太郎","やまだたろう","yamada taro","taro yamada","山田 太郎"],
    name: "山田 太郎",
    title: "営業リーダー",
    image: "https://example.com/yamada.jpg",
    desc: "法人営業担当。SaaSとB2Bアライアンスが得意。",
    link: "https://example.com/yamada"
  },
  {
    keys: ["佐藤花子","さとうはなこ","satoh hanako","hanako sato","佐藤 花子"],
    name: "佐藤 花子",
    title: "カスタマーサクセス",
    image: "https://example.com/sato.jpg",
    desc: "導入支援とオンボーディングを担当。ヘルススコア設計が得意。",
    link: "https://example.com/sato"
  },
  // 残り4人も同じ形式で追加できます
];
 
// ---- 名前検索用のユーティリティ ----
const toHalf = (s) => s.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
const normalize = (s="") => toHalf(s).trim().toLowerCase().replace(/\s+/g,"");
const findMember = (q) => {
  const n = normalize(q);
  const exact = members.find(m => m.keys.some(k => normalize(k) === n));
  return exact || members.find(m => normalize(m.name).includes(n));
};
 
// ---- Flexメッセージ作成 ----
const flexFor = (m) => ({
  type: "flex",
  altText: `${m.name}の詳細`,
  contents: {
    type: "bubble",
    hero: m.image ? { type: "image", url: m.image, size: "full", aspectRatio: "20:13", aspectMode: "cover" } : undefined,
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: m.name, weight: "bold", size: "lg" },
        ...(m.title ? [{ type: "text", text: m.title, size: "sm", color: "#888888", wrap: true }] : []),
        { type: "separator", margin: "md" },
        ...(m.desc ? [{ type: "text", text: m.desc, wrap: true, margin: "md" }] : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        ...(m.link ? [{ type: "button", style: "primary", action: { type: "uri", label: "プロフィールを見る", uri: m.link } }] : []),
      ]
    }
  }
});
 
// ---- Vercel用エントリポイント ----
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
 
  const signature = req.headers["x-line-signature"];
  const body = JSON.stringify(req.body || {});
  if (!validateSignature(body, process.env.CHANNEL_SECRET, signature)) {
    return res.status(401).send("Invalid signature");
  }
 
  const events = req.body.events || [];
  await Promise.all(events.map(async (event) => {
    if (event.type === "message" && event.message.type === "text") {
      const hit = findMember(event.message.text);
      if (hit) {
        await client.replyMessage(event.replyToken, flexFor(hit));
      } else {
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "該当メンバーが見つかりませんでした。\nフルネームで送るか「メンバー一覧」と入力してください。"
        });
      }
    }
  }));
 
  res.status(200).send("OK");
}
