import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import { useAuth } from "@/context/AuthContext";

export const FREE_DAILY_LIMIT = 20;
const DAILY_KEY_PREFIX = "halochat_daily_msgs_";

function todayKey(userId: string) {
  return `${DAILY_KEY_PREFIX}${userId}_${new Date().toISOString().slice(0, 10)}`;
}

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  dailyCount: number;
  dailyLimit: number;
  remaining: number;
  canSendMessage: boolean;
  incrementMessageCount: () => Promise<void>;
  offerings: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be inside SubscriptionProvider");
  return ctx;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? "anonymous";
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyCount, setDailyCount] = useState(0);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    const apiKey =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ""
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

    const init = async () => {
      const count = parseInt(
        (await AsyncStorage.getItem(todayKey(userId))) ?? "0",
        10
      );
      setDailyCount(isNaN(count) ? 0 : count);

      if (!apiKey) {
        setIsLoading(false);
        return;
      }

      try {
        Purchases.configure({ apiKey });
        const [info, offeringsResult] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        setIsPro(info.entitlements.active["pro"] != null);
        setOfferings(offeringsResult.current);
      } catch {
        // RevenueCat not configured yet — runs as free
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [userId]);

  const refreshStatus = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPro(info.entitlements.active["pro"] != null);
    } catch {}
  }, []);

  const incrementMessageCount = useCallback(async () => {
    if (isPro) return;
    const next = dailyCount + 1;
    setDailyCount(next);
    await AsyncStorage.setItem(todayKey(userId), String(next));
  }, [dailyCount, isPro, userId]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const nowPro = customerInfo.entitlements.active["pro"] != null;
      setIsPro(nowPro);
      return nowPro;
    } catch (e: any) {
      if (e?.userCancelled) return false;
      throw e;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      const nowPro = info.entitlements.active["pro"] != null;
      setIsPro(nowPro);
      return nowPro;
    } catch {
      return false;
    }
  }, []);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - dailyCount);
  const canSendMessage = isPro || dailyCount < FREE_DAILY_LIMIT;

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        isLoading,
        dailyCount,
        dailyLimit: FREE_DAILY_LIMIT,
        remaining,
        canSendMessage,
        incrementMessageCount,
        offerings,
        purchasePackage,
        restorePurchases,
        refreshStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
