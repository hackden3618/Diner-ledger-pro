import { useEffect } from "react";
import { getSetting, updateSetting, closeDay as dbCloseDay, getTransactions } from "@/database/db";
import { useApp } from "@/database/AppContext";
import { useCalculations } from "@/database/CalculationsContext";

export function useAutoDayClose() {
    const { refreshAll, recordCollection } = useApp();

    const {
        mpesaAvailableToday,
        openingBalanceToday,
        cashAvailableToday,
        moneyInHouse,
        totalSalesToday,
        expensesToday,
    } = useCalculations();

    // Auto Close Day Logic
    useEffect(() => {
        const checkAutoClose = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // Check if past 23:50
            if (hours === 23 && minutes >= 50) {
                const lastCloseSetting = getSetting("last_auto_close_date");
                const todayStr = now.toDateString();

                if (lastCloseSetting !== todayStr) {
                    // Trigger close day
                    try {
                        const todayTx = getTransactions().filter(
                            (t) => new Date(t.date).toDateString() === todayStr,
                        );

                        // Only auto-close if there were actually transactions today, or if we haven't closed yet
                        const hasClosedToday = todayTx.some(t => t.type === 'day_close');

                        if (!hasClosedToday) {

                            dbCloseDay(openingBalanceToday, totalSalesToday, expensesToday, moneyInHouse, "System (Auto)", undefined);
                            if (moneyInHouse > 0) {
                                recordCollection(
                                    cashAvailableToday,
                                    mpesaAvailableToday,
                                    "management",
                                    "System (Auto)"
                                );
                            }
                            updateSetting("last_auto_close_date", todayStr);
                            refreshAll();
                        } else {
                            // Already closed manually, just mark the setting
                            updateSetting("last_auto_close_date", todayStr);
                        }
                    } catch (error) {
                        console.error("Auto close day failed", error);
                    }
                }
            }
        };

        // Check immediately and then every minute
        checkAutoClose();
        const interval = setInterval(checkAutoClose, 60 * 1000);
        return () => clearInterval(interval);
    }, [
        mpesaAvailableToday,
        openingBalanceToday,
        cashAvailableToday,
        moneyInHouse,
        totalSalesToday,
        expensesToday,
        refreshAll,
        recordCollection
    ]);
}
