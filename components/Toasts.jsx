/** Glass toast notifications — top-right, auto-dismiss after 4s */
export default function Toasts({ toasts }) {
  return (
    <div className="fixed top-24 right-4 z-[60] space-y-2.5 w-[min(360px,calc(100vw-2rem))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in rounded-2xl px-4 py-3.5 text-sm font-semibold shadow-2xl"
          style={{
            fontFamily: "var(--font-jakarta)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            ...(t.type === "win"
              ? {
                  background: "rgba(98,242,192,0.12)",
                  border: "1px solid rgba(98,242,192,0.3)",
                  color: "#62F2C0",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(98,242,192,0.15)",
                }
              : t.type === "lose"
              ? {
                  background: "rgba(228,0,0,0.12)",
                  border: "1px solid rgba(228,0,0,0.3)",
                  color: "#ff7070",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(228,0,0,0.15)",
                }
              : {
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(240,244,255,0.9)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }),
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
