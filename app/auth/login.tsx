import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { login } from "../../services/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Mohon isi email dan password");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        Alert.alert("Success", "Login berhasil!", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      } else {
        Alert.alert(
          "Login Gagal",
          result.message || "Email atau password salah"
        );
      }
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Terjadi kesalahan saat login";

      if (error.message === "Network error or server unavailable") {
        errorMessage =
          "Tidak dapat terhubung ke server, periksa koneksi internet Anda";
      } else if (error.message.includes("fetch")) {
        errorMessage = "Tidak dapat terhubung ke server";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-12">
            <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-4">
              <Image
                source={require("../../assets/images/logo.png")}
                style={{ width: 64, height: 64 }}
                contentFit="contain"
                onLoad={() => {
                  console.log("✅ Logo loaded successfully");
                  setLogoLoaded(true);
                }}
                onError={(error) => {
                  console.log("❌ Logo failed to load:", error);
                  setLogoLoaded(false);
                }}
              />
              {!logoLoaded && (
                <View className="absolute inset-0 items-center justify-center">
                  <Ionicons name="storefront" size={40} color="white" />
                </View>
              )}
            </View>
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              Selamat Datang
            </Text>
            <Text className="text-gray-500 text-center">
              Masuk ke akun Anda untuk melanjutkan
            </Text>
          </View>

          <View className="space-y-4 mb-8">
            <View>
              <Text className="text-gray-700 mb-2 font-medium">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Masukkan email Anda"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-white p-4 rounded-xl border border-gray-200"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2 font-medium">Password</Text>
              <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-4">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Masukkan password Anda"
                  secureTextEntry={!showPassword}
                  className="flex-1 py-4 text-gray-900"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={24}
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Button
            title="Masuk"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
          />

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Belum punya akun? </Text>
            <Text
              className="text-primary font-medium"
              onPress={() => router.push("/auth/register")}
            >
              Daftar Sekarang
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
