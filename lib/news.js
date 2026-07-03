// Tin tức bóng đá trong ngày — nguồn RSS công khai của Tuổi Trẻ Online (miễn phí, không cần
// key). Khác VnExpress (chặn crawl trang bài viết, chỉ đọc được tóm tắt), trang chi tiết của
// Tuổi Trẻ mở crawl bình thường (div "detail-content" chứa toàn văn, có itemprop=articleBody)
// nên đọc được TOÀN VĂN bài viết ngay trong app, không chỉ tóm tắt.
// CHỈ gọi server-side. Parse bằng regex đơn giản (không cần thêm thư viện XML/HTML). Mọi lỗi
// nuốt gọn, trả rỗng để UI tự ẩn khối tương ứng.

const FEED_URL = "https://tuoitre.vn/rss/the-thao.rss";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const LIST_TTL = 1000 * 60 * 10; // 10 phút — danh sách tin
let listCache = { exp: 0, data: [] };

const ARTICLE_TTL = 1000 * 60 * 30; // 30 phút — nội dung bài viết (gần như tĩnh sau khi đăng)
const articleCache = new Map(); // url -> { exp, data }

const decodeEntities = (s) =>
  (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripCdata = (s) => (s || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");

function extract(tag, block) {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function parseItem(block) {
  const title = decodeEntities(stripCdata(extract("title", block) || ""));
  const link = decodeEntities(stripCdata(extract("link", block) || ""));
  const pubDate = extract("pubDate", block);
  const enclosureMatch = block.match(/<enclosure[^>]*url="([^"]+)"/);
  const image = enclosureMatch ? decodeEntities(enclosureMatch[1]) : null;

  let summary = stripCdata(extract("description", block) || "");
  summary = summary.replace(/<[^>]+>/g, " ");
  summary = decodeEntities(summary).replace(/\s+/g, " ").trim();

  if (!title || !link) return null;
  return { title, link, image, pubDate, summary };
}

/** Danh sách tin tức bóng đá mới nhất. Trả mảng rỗng nếu lỗi/hết hạn nguồn. */
export async function fetchFootballNews() {
  if (listCache.exp > Date.now()) return listCache.data;
  try {
    const res = await fetch(FEED_URL, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return listCache.data;
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const data = items.map(parseItem).filter(Boolean);
    listCache = { exp: Date.now() + LIST_TTL, data };
    return data;
  } catch {
    return listCache.data;
  }
}

// Thẻ nên loại bỏ HOÀN TOÀN (kể cả nội dung bên trong) khi trích xuất toàn văn — quảng cáo,
// script, box "xem thêm" gợi ý bài khác chèn giữa bài (không phải nội dung chính).
const STRIP_BLOCKS = [
  /<script[\s\S]*?<\/script>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /<figure[^>]*class="[^"]*video[^"]*"[\s\S]*?<\/figure>/gi,
];

/**
 * Toàn văn 1 bài viết Tuổi Trẻ, lấy trực tiếp từ trang bài viết (KHÔNG qua RSS, RSS chỉ có
 * tóm tắt). Trả { paragraphs: string[] } — mỗi phần tử là 1 đoạn text (đã bỏ hết thẻ HTML).
 * Trả paragraphs rỗng nếu không lấy được (UI tự fallback về tóm tắt RSS).
 */
export async function fetchArticleFullText(url) {
  const cached = articleCache.get(url);
  if (cached && cached.exp > Date.now()) return cached.data;

  const empty = { paragraphs: [] };
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return empty;
    const html = await res.text();

    const startIdx = html.indexOf('detail-content afcbc-body');
    if (startIdx === -1) return empty;
    // Vùng chèn không phải nội dung chính (box liên quan, tác giả, bình luận…) — Tuổi Trẻ chèn
    // NGAY TRONG luồng bài viết chứ không chỉ ở cuối, nên cắt bớt tới điểm sớm nhất gặp 1 trong
    // các mốc này thay vì cố tìm div đóng khớp (không khả thi với regex trên HTML lồng nhau).
    const STOP_MARKERS = ["kbwscwl-relatedbox", "box-author-detail", "detail-cmt", "VCObjectBoxRelatedNewsItemSapo"];
    let endIdx = startIdx + 20000; // giới hạn an toàn — bài viết hiếm khi dài hơn
    for (const marker of STOP_MARKERS) {
      const i = html.indexOf(marker, startIdx);
      if (i !== -1 && i < endIdx) endIdx = i;
    }
    let body = html.slice(startIdx, endIdx);
    for (const re of STRIP_BLOCKS) body = body.replace(re, "");

    // Mỗi <p>/<h2> KHÔNG có thuộc tính (đoạn văn thật) -> 1 đoạn; <p> có class/data-* là
    // caption ảnh hoặc box gợi ý chèn giữa bài, không phải nội dung chính — bỏ qua.
    const blocks = body.match(/<(p|h2)>[\s\S]*?<\/\1>/g) || [];
    const paragraphs = blocks
      .map((b) => decodeEntities(b.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 0);

    const data = { paragraphs };
    articleCache.set(url, { exp: Date.now() + ARTICLE_TTL, data });
    return data;
  } catch {
    return empty;
  }
}
