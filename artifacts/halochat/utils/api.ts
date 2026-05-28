import { Platform } from "react-native";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;

export const API_BASE = DOMAIN
  ? `${DOMAIN}/api`
  : Platform.OS === "web"
  ? "/api"
  : "http://localhost:3000/api";
