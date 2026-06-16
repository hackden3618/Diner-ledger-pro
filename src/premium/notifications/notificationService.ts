import { getSetting, updateSetting } from "@/database/db";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const notificationsApiBaseUrl =
  process.env.EXPO_PUBLIC_NOTIFICATIONS_API_URL ||
  (Constants.expoConfig?.extra?.notificationsApiBaseUrl as string | undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushRegistrationResult =
  | { status: "registered"; token: string }
  | { status: "skipped"; reason: string };

export async function configureNotificationChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("business-alerts", {
    name: "Business Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#31CE78",
  });
}

export async function registerForPushNotificationsAsync(
  businessName: string,
): Promise<PushRegistrationResult> {
  await configureNotificationChannels();

  if (!Device.isDevice) {
    return { status: "skipped", reason: "Push notifications require a physical device." };
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus = existing.status === "granted"
    ? existing.status
    : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== "granted") {
    return { status: "skipped", reason: "Notification permission was not granted." };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  updateSetting("push_token", token);

  if (notificationsApiBaseUrl) {
    // Backend endpoint contract:
    // POST /notifications/register-device
    // Body: { token, businessName, platform }
    // Store this token server-side and use Expo's push API for remote alerts.
    const response = await fetch(`${notificationsApiBaseUrl.replace(/\/$/, "")}/notifications/register-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, businessName, platform: Platform.OS }),
    });

    if (!response.ok) {
      throw new Error("Failed to register device with backend.");
    }
  }

  return { status: "registered", token };
}

export async function scheduleLocalBusinessAlert(
  key: string,
  title: string,
  body: string,
  minHoursBetweenAlerts = 12,
) {
  const now = new Date();
  const settingKey = `business_notification_${key}_last_sent`;
  const lastSent = getSetting(settingKey);
  if (lastSent) {
    const hoursSinceLast = (now.getTime() - new Date(lastSent).getTime()) / (60 * 60 * 1000);
    if (hoursSinceLast < minHoursBetweenAlerts) return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      badge: 1,
    },
    trigger: null,
  });
  updateSetting(settingKey, now.toISOString());
}
