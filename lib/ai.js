import Anthropic from "@anthropic-ai/sdk";

// Helper gọi Claude (CHỈ server). Cần env ANTHROPIC_API_KEY.
// Model mặc định claude-opus-4-8 (đổi qua ANTHROPIC_MODEL nếu muốn rẻ hơn, vd claude-haiku-4-5).
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export const aiReady = () => Boolean(KEY);

const client = KEY ? new Anthropic({ apiKey: KEY }) : null;

async function jsonCall({ system, user, schema, maxTokens = 1024 }) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    output_config: { format: { type: "json_schema", schema }, effort: "low" },
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content.find((b) => b.type === "text")?.text || "{}";
  return JSON.parse(text);
}

const COMMON_SYSTEM =
  "Bạn là chuyên gia phân tích bóng đá World Cup 2026. Viết tiếng Việt, ngắn gọn, khách quan, không cá cược tiền thật. " +
  "Đây là NHẬN ĐỊNH THAM KHẢO của AI dựa trên dữ liệu được cung cấp + kiến thức bóng đá, KHÔNG phải số liệu chính thức.";

/** Nhận định + gợi ý tỉ số cho một trận. */
export async function analyzeMatch(m) {
  const schema = {
    type: "object",
    properties: {
      analysis: { type: "string" },
      predictedHome: { type: "integer" },
      predictedAway: { type: "integer" },
      confidence: { type: "string", enum: ["Thấp", "Trung bình", "Cao"] },
      keyFactors: { type: "array", items: { type: "string" } },
    },
    required: ["analysis", "predictedHome", "predictedAway", "confidence", "keyFactors"],
    additionalProperties: false,
  };
  const fmtForm = (f) => (f?.length ? f.join(" ") : "chưa có");
  const user =
    `Trận đấu: ${m.home} vs ${m.away}${m.stage ? ` (${m.stage})` : ""}\n` +
    `Hạng FIFA: ${m.home} #${m.homeFifa ?? "?"}, ${m.away} #${m.awayFifa ?? "?"}\n` +
    `Hạng bảng: ${m.home} ${m.homeRank || "?"}, ${m.away} ${m.awayRank || "?"}\n` +
    `Phong độ gần đây: ${m.home} [${fmtForm(m.homeForm)}], ${m.away} [${fmtForm(m.awayForm)}]\n\n` +
    `Hãy đưa ra: nhận định ngắn (2-3 câu), tỉ số dự đoán hợp lý, mức độ tự tin, và 2-3 yếu tố then chốt.`;
  return jsonCall({ system: COMMON_SYSTEM, user, schema });
}

/** Nhận định một bảng đấu + dự đoán 2 đội đi tiếp. */
export async function analyzeGroup(g) {
  const schema = {
    type: "object",
    properties: {
      analysis: { type: "string" },
      qualifiers: { type: "array", items: { type: "string" } },
    },
    required: ["analysis", "qualifiers"],
    additionalProperties: false,
  };
  const teams = (g.teams || [])
    .map((t) => `${t.name} (FIFA #${t.fifa ?? "?"})`)
    .join(", ");
  const user =
    `Bảng ${g.letter} World Cup 2026 gồm: ${teams}.\n\n` +
    `Hãy nhận định ngắn (2-3 câu) về cục diện bảng và dự đoán 2 đội nhiều khả năng đi tiếp nhất (điền tên vào qualifiers).`;
  return jsonCall({ system: COMMON_SYSTEM, user, schema });
}
