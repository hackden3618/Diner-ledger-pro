import { ImageSourcePropType } from "react-native";

export const SEEDED_MENU_IMAGES = {
  chapati: {
    key: "seed:chapati",
    label: "Chapati",
    legacyEmoji: "🫓",
    source: require("../../assets/images/MenuItemsImagesSeed/chapati_image.jpg"),
  },
  tea: {
    key: "seed:tea",
    label: "Tea",
    legacyEmoji: "☕",
    source: require("../../assets/images/MenuItemsImagesSeed/cup_of_tea.jpg"),
  },
} as const;

const SEEDED_BY_KEY = Object.values(SEEDED_MENU_IMAGES).reduce<
  Record<string, ImageSourcePropType>
>((acc, item) => {
  acc[item.key] = item.source;
  acc[item.legacyEmoji] = item.source;
  return acc;
}, {});

export function resolveMenuItemImageSource(
  image?: string,
  name?: string,
): ImageSourcePropType | undefined {
  if (image && SEEDED_BY_KEY[image]) return SEEDED_BY_KEY[image];

  const normalizedName = name?.trim().toLowerCase() || "";
  if (!image && normalizedName.includes("chapati")) {
    return SEEDED_MENU_IMAGES.chapati.source;
  }
  if (!image && (normalizedName.includes("tea") || normalizedName.includes("chai"))) {
    return SEEDED_MENU_IMAGES.tea.source;
  }

  if (
    image &&
    (image.startsWith("file://") ||
      image.startsWith("content://") ||
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:image/"))
  ) {
    return { uri: image };
  }

  return undefined;
}

export function isSeededMenuImageKey(value?: string) {
  return Boolean(value && SEEDED_BY_KEY[value]);
}
