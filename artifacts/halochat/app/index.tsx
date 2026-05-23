import { Redirect } from "expo-router";
import { useCompanions } from "@/context/CompanionContext";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { hasOnboarded, isLoaded } = useCompanions();
  const colors = useColors();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/" />;
}
