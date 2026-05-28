import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useCompanions } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { hasOnboarded, isLoaded } = useCompanions();
  const colors = useColors();

  if (isAuthLoading || (isAuthenticated && !isLoaded)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
