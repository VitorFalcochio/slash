export const TAG_COLORS = [
  { id: "gray", name: "Cinza", value: "#8e8d91" },
  { id: "red", name: "Vermelho", value: "#ef5f5f" },
  { id: "orange", name: "Laranja", value: "#f2994a" },
  { id: "yellow", name: "Amarelo", value: "#e2b93b" },
  { id: "green", name: "Verde", value: "#46b37f" },
  { id: "teal", name: "Turquesa", value: "#2fb3ad" },
  { id: "blue", name: "Azul", value: "#4a8fe7" },
  { id: "purple", name: "Roxo", value: "#9b6dd6" },
  { id: "pink", name: "Rosa", value: "#e46aa7" },
] as const;

export type TagColor = (typeof TAG_COLORS)[number]["id"];

export function tagColorValue(color: string) {
  return TAG_COLORS.find((c) => c.id === color)?.value ?? TAG_COLORS[0].value;
}

export function randomTagColor(): TagColor {
  return TAG_COLORS[1 + Math.floor(Math.random() * (TAG_COLORS.length - 1))].id;
}
