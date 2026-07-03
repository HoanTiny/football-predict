package vn.tinyfootball.app

import com.capacitorjs.plugins.pushnotifications.MessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Kế thừa MessagingService gốc của @capacitor/push-notifications để KHÔNG mất hành vi mặc
 * định (routing token mới/message cho lớp JS khi app đang mở) — chỉ thêm nhánh riêng cho
 * live-update tỉ số (data message có key "liveMatch" = "1", gửi từ app/api/cron/route.js).
 *
 * Đăng ký THAY THẾ service gốc trong AndroidManifest.xml (tools:node="remove" trên service
 * gốc + khai lại với class này) — 2 service cùng bắt 1 intent-filter sẽ xung đột.
 */
class LiveMatchMessagingService : MessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        val data = remoteMessage.data
        if (data["liveMatch"] == "1") {
            LiveMatchNotifier.showOrUpdate(applicationContext, data)
        }
    }
}
