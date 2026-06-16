import { useEffect, useState } from "react";
import { getSetting, updateSetting } from "@/database/db";
import { useApp } from "@/database/AppContext";
import { useCustomAlert } from "@/context/AlertContext";
import * as Notifications from "expo-notifications";

export function useAutoDayClose() {
    const { activeBusinessDay } = useApp();
    const { showAlert } = useCustomAlert();
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (hasChecked || !activeBusinessDay) return;

        const checkForgottenClose = async () => {
            setHasChecked(true);
            const activeStartStr = new Date(activeBusinessDay.startTime).toDateString();
            const todayStr = new Date().toDateString();

            if (activeStartStr !== todayStr) {
                // The active business day started on a previous literal day
                const lastPrompted = getSetting("last_forgotten_close_prompt");

                if (lastPrompted !== todayStr) {
                    updateSetting("last_forgotten_close_prompt", todayStr);

                    // Show in-app alert
                    showAlert(
                        "Business Day Open",
                        `You did not close the previous business day (${activeStartStr}). Please review and close it from Settings to keep your records accurate.`,
                        [
                            { text: "Dismiss", style: "cancel" },
                        ]
                    );

                    // Push a local notification
                    try {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: "Business Day Not Closed",
                                body: "You forgot to close the previous business day. Please review and close it.",
                                sound: true,
                            },
                            trigger: null, // immediate
                        });
                    } catch (e) {
                        console.warn("Failed to schedule notification", e);
                    }
                }
            }
        };

        checkForgottenClose();
    }, [activeBusinessDay, hasChecked, showAlert]);
}
