import { Link } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Image, Pressable, Text, View } from "react-native";
import { Banner } from "../services/api";

const { width } = Dimensions.get("window");

interface BannerSliderProps {
  banners: Banner[];
  loading?: boolean;
}

const BannerSlider: React.FC<BannerSliderProps> = ({
  banners,
  loading = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (banners.length > 1) {
      timerRef.current = setInterval(() => {
        setActiveIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [banners.length]);

  if (loading) {
    return <View className="h-48 w-full bg-gray-200 rounded-xl" />;
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <View className="w-full">
      <View className="relative">
        {banners.map((banner, index) => (
          <Link
            key={banner.id}
            href={(banner.link_tujuan || "#") as any}
            asChild
          >
            <Pressable>
              <View
                className={`${index === activeIndex ? "opacity-100" : "opacity-0"} absolute top-0 left-0 right-0`}
                style={{ height: width * 0.5 }}
              >
                <Image
                  source={{
                    uri:
                      banner.gambar_url ||
                      "https://via.placeholder.com/800x400?text=Banner",
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 12,
                  }}
                  resizeMode="cover"
                  // onLoad={() => console.log('✅ Banner loaded:', banner.judul_banner)}
                  // onError={() => console.log('❌ Banner failed:', banner.judul_banner, banner.gambar_url)}
                />
                <View className="absolute bottom-0 left-0 right-0 bg-black/40 p-3 rounded-b-xl">
                  <Text className="text-white font-bold text-lg">
                    {banner.judul_banner}
                  </Text>
                  {banner.deskripsi ? (
                    <Text className="text-white text-sm" numberOfLines={1}>
                      {banner.deskripsi}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>

      <View
        className="flex-row justify-center mt-2 space-x-2"
        style={{ height: width * 0.5 }}
      >
        {banners.map((_, index) => (
          <View
            key={index}
            className={`h-2 w-2 rounded-full ${
              index === activeIndex ? "bg-primary" : "bg-gray-300"
            }`}
          />
        ))}
      </View>
    </View>
  );
};

export default BannerSlider;
