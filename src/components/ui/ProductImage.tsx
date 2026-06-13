import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { resolveMenuItemImageSource } from "@/utils/menuItemImages";

interface ProductImageProps {
  image?: string;
  name: string;
  price: number;
  stock: number;
  size?: "small" | "medium" | "large" | "banner";
  onPress?: () => void;
}

export default function ProductImage({
  image,
  name,
  price,
  stock,
  size = "medium",
  onPress,
}: ProductImageProps) {
  const sizes = {
    small: { container: "w-16 h-16", icon: 28 },
    medium: { container: "w-20 h-20", icon: 32 },
    large: { container: "w-32 h-32", icon: 48 },
    banner: { container: "w-full h-[120px]", icon: 56 },
  };

  const getPlaceholderColor = (index: number) => {
    const colors = [
      "#FF6B6B", // Red
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#F7B731", // Gold
      "#5F27CD", // Purple
      "#00D2D3", // Cyan
      "#FF9FF3", // Pink
      "#54A0FF", // Light Blue
    ];
    return colors[index % colors.length];
  };

  const imageSource = resolveMenuItemImageSource(image, name);
  const color = getPlaceholderColor(name.charCodeAt(0));

  const content = (
    <View
      className={`${sizes[size].container} rounded-[12px] overflow-hidden border border-border-light bg-card items-center justify-center`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${color}15, ${color}05)`,
      }}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{
            width: "100%",
            height: "100%",
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="items-center justify-center"
          style={{ width: "100%", height: "100%" }}
        >
          {image ? (
            <Text style={{ fontSize: sizes[size].icon }}>{image}</Text>
          ) : (
            <Ionicons
              name="image-outline"
              size={sizes[size].icon}
              color={color}
            />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }

  return content;
}
