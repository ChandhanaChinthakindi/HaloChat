import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const systemScheme = useColorScheme();
  const { themePreference } = useTheme();
  const scheme =
    themePreference === "system" ? (systemScheme ?? "light") : themePreference;
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as unknown as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
