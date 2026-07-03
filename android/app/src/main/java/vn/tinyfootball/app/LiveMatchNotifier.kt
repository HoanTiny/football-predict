package vn.tinyfootball.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import java.net.HttpURLConnection
import java.net.URL

/**
 * Xây/cập nhật notification "live" cho 1 trận đấu — tương đương iOS Live Activity (khung tỉ
 * số nổi trên Dynamic Island). LiveMatchMessagingService gọi thẳng vào đây khi nhận data
 * message từ FCM — KHÔNG qua lớp JS/React, nên hoạt động cả khi app đã bị đóng hẳn.
 *
 * Giao diện tuỳ chỉnh (logo 2 đội + tỉ số + thanh tiến trình) — xem
 * res/layout/notification_live_match.xml.
 */
object LiveMatchNotifier {
    private const val CHANNEL_ID = "live_matches"
    private const val CHANNEL_NAME = "Trận đang diễn ra"
    private const val BRAND_COLOR = "#262a7c"
    private const val LOGO_TIMEOUT_MS = 3000

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            // LOW: không âm thanh/không heads-up mỗi lần tick (cron gửi mỗi phút) — chỉ cập
            // nhật im lặng, đúng cảm giác "live activity" thay vì spam thông báo.
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Tỉ số & phút thi đấu cập nhật trực tiếp cho trận bạn đã cược"
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)
    }

    /** ID ổn định theo matchId — cùng 1 trận luôn UPDATE, không tạo notification mới mỗi lần. */
    private fun notificationId(matchId: String): Int = matchId.hashCode()

    /**
     * Tải logo đội qua URL, đồng bộ (FCM đã chạy sẵn trên background thread nên an toàn).
     * Timeout ngắn + nuốt mọi lỗi → trả null để layout tự dùng ảnh placeholder, không bao giờ
     * làm hỏng/làm chậm việc hiển thị notification vì mạng chập chờn.
     */
    private fun loadBitmap(urlString: String?): Bitmap? {
        if (urlString.isNullOrBlank()) return null
        return try {
            val connection = (URL(urlString).openConnection() as HttpURLConnection).apply {
                connectTimeout = LOGO_TIMEOUT_MS
                readTimeout = LOGO_TIMEOUT_MS
                doInput = true
            }
            connection.connect()
            connection.inputStream.use { BitmapFactory.decodeStream(it) }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * data (từ FCM, mọi field là String): matchId, home, away, homeScore, awayScore,
     * minute ("0".."90"), status ("LIVE" | "FINISHED"), homeLogo?, awayLogo? (URL).
     */
    fun showOrUpdate(context: Context, data: Map<String, String>) {
        val matchId = data["matchId"] ?: return
        val home = data["home"] ?: "?"
        val away = data["away"] ?: "?"
        val homeScore = data["homeScore"] ?: "0"
        val awayScore = data["awayScore"] ?: "0"
        val minute = (data["minute"] ?: "0").toIntOrNull()?.coerceIn(0, 90) ?: 0
        val finished = data["status"] == "FINISHED"

        ensureChannel(context)

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            matchId.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Layout tuỳ chỉnh: logo 2 đội + tên + tỉ số + phút/trạng thái + progress bar.
        val views = RemoteViews(context.packageName, R.layout.notification_live_match).apply {
            setTextViewText(R.id.home_name, home)
            setTextViewText(R.id.away_name, away)
            setTextViewText(R.id.score_text, "$homeScore - $awayScore")
            setTextViewText(R.id.status_text, if (finished) "Kết thúc" else "Phút $minute'")

            loadBitmap(data["homeLogo"])?.let { setImageViewBitmap(R.id.home_crest, it) }
            loadBitmap(data["awayLogo"])?.let { setImageViewBitmap(R.id.away_crest, it) }

            if (finished) {
                setViewVisibility(R.id.progress_bar, View.GONE)
            } else {
                setViewVisibility(R.id.progress_bar, View.VISIBLE)
                setProgressBar(R.id.progress_bar, 90, minute, false)
            }
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_live)
            .setColor(Color.parseColor(BRAND_COLOR))
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(views)
            .setCustomBigContentView(views)
            .setOnlyAlertOnce(true) // im lặng ở các lần update sau — chỉ báo (nếu có) lần đầu
            .setOngoing(!finished) // ongoing = không vuốt tắt được trong lúc trận đang đá
            .setAutoCancel(finished)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(notificationId(matchId), builder.build())
    }
}
