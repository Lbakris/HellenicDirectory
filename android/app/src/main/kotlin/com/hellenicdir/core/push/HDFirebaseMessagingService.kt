package com.hellenicdir.core.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Firebase Cloud Messaging service.
 *
 * Handles incoming push notifications for new directory messages and
 * invitation events. Must be declared in AndroidManifest.xml to avoid a
 * runtime crash when Firebase tries to bind the service.
 */
class HDFirebaseMessagingService : FirebaseMessagingService() {

    /**
     * Called when a new FCM token is generated (first launch, token rotation,
     * or reinstall). The token should be sent to the backend so the server can
     * address push notifications to this device.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // TODO: Send token to backend via /account/fcm-token once endpoint is ready.
    }

    /**
     * Called when a notification is received while the app is in the foreground.
     * Background notifications are handled automatically by the Firebase SDK and
     * shown as system notifications with the app's default icon.
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        // TODO: Show a local notification using NotificationManager when the app
        // is in the foreground and the message contains a "data" payload.
    }
}
