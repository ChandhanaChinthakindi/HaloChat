import { ImageSourcePropType } from "react-native";

export interface AvatarDef {
  id: string;
  gender: "female" | "male";
  label: string;
  source: ImageSourcePropType | null;
  // Add video after compressing your clips:
  // videoSource: number | null;  e.g. require("../assets/avatars/f1.mp4")
}

export const AVATARS: AvatarDef[] = [
  // ── Women ────────────────────────────────────────────────────────────────
  { id: "f1", gender: "female", label: "Woman 1", source: require("../assets/avatars/f1.png") },
  { id: "f2", gender: "female", label: "Woman 2", source: require("../assets/avatars/f2.png") },
  { id: "f3", gender: "female", label: "Woman 3", source: require("../assets/avatars/f3.png") },
  { id: "f4", gender: "female", label: "Woman 4", source: require("../assets/avatars/f4.png") },
  // ── Men ──────────────────────────────────────────────────────────────────
  { id: "m1", gender: "male",   label: "Man 1",   source: require("../assets/avatars/m1.png") },
  { id: "m2", gender: "male",   label: "Man 2",   source: require("../assets/avatars/m2.png") },
  { id: "m3", gender: "male",   label: "Man 3",   source: require("../assets/avatars/m3.png") },
  { id: "m4", gender: "male",   label: "Man 4",   source: require("../assets/avatars/m4.png") },
];

export function getAvatarById(id: string | undefined): AvatarDef | null {
  if (!id) return null;
  return AVATARS.find((a) => a.id === id) ?? null;
}

/** Female/male: strict filter. Non-binary or unset: all avatars. */
export function getAvatarsByGender(gender: "female" | "male" | "nonbinary" | null): AvatarDef[] {
  if (!gender || gender === "nonbinary") return AVATARS;
  return AVATARS.filter((a) => a.gender === gender);
}
