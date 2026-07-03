"use client";

import { useEffect, useState } from "react";

/** "3 giờ trước" / "Hôm qua" / "12/06" — tương đối gọn, không cần chính xác tới giây. */
function timeAgo(pubDate) {
  if (!pubDate) return "";
  const d = new Date(pubDate).getTime();
  if (isNaN(d)) return "";
  const diffMin = Math.floor((Date.now() - d) / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Hôm qua";
  if (diffD < 7) return `${diffD} ngày trước`;
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

/** Đọc toàn văn NGAY trong app (Tuổi Trẻ không chặn crawl trang bài viết) — tự tải khi mở,
 * fallback về tóm tắt RSS + link ra ngoài nếu lần này không lấy được toàn văn. */
function ArticleOverlay({ article, onClose }) {
  const [full, setFull] = useState(null);
  const [loadingFull, setLoadingFull] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/news/article?url=${encodeURIComponent(article.link)}`)
      .then((r) => r.json())
      .then((j) => alive && setFull(j.paragraphs?.length ? j.paragraphs : null))
      .catch(() => {})
      .finally(() => alive && setLoadingFull(false));
    return () => {
      alive = false;
    };
  }, [article.link]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col bg-[#161a45] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {article.image && (
            <img src={article.image} alt="" className="w-full h-56 object-cover bg-white/10" />
          )}
          <div className="p-5 space-y-3">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              {timeAgo(article.pubDate)} · Tuổi Trẻ
            </span>
            <h2 className="text-lg font-black text-white leading-snug">{article.title}</h2>

            {loadingFull ? (
              <div className="space-y-2 pt-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-3.5 rounded bg-white/10 animate-pulse" style={{ width: `${85 - i * 10}%` }} />
                ))}
              </div>
            ) : full ? (
              <div className="space-y-3 pt-1">
                {full.map((p, i) => (
                  <p key={i} className="text-sm text-white/80 leading-relaxed">{p}</p>
                ))}
              </div>
            ) : (
              article.summary && <p className="text-sm text-white/70 leading-relaxed">{article.summary}</p>
            )}

            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center mt-4 py-3 rounded-xl text-xs font-bold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
            >
              {full ? "Xem bài gốc trên Tuổi Trẻ ↗" : "Đọc toàn bộ trên Tuổi Trẻ ↗"}
            </a>
          </div>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-sm transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/** Trang "Tin tức" — tổng hợp tin bóng đá trong ngày (nguồn RSS Tuổi Trẻ, xem lib/news.js). */
export default function NewsView({ onClose }) {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/news")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.news || j.news.length === 0) setError(true);
        else setNews(j.news);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
        >
          ‹
        </button>
        <h2 className="text-sm font-black text-white">📰 Tin tức bóng đá</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : error || !news ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📰</div>
          <p className="text-xs text-white/50 font-medium">Không tải được tin tức lúc này.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((n) => (
            <button
              key={n.link}
              onClick={() => setSelected(n)}
              className="w-full flex gap-3 p-3 rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/[0.12] transition-colors text-left"
            >
              {n.image && (
                <img
                  src={n.image}
                  alt=""
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover shrink-0 bg-white/10"
                />
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{n.title}</h3>
                {n.summary && (
                  <p className="text-xs text-white/55 leading-snug line-clamp-2">{n.summary}</p>
                )}
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  {timeAgo(n.pubDate)} · Tuổi Trẻ
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <ArticleOverlay article={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
