import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { addCustomerAddress } from "../../services/api";
import { verifyToken } from "../../services/auth";
import { AddressCreateData } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

const AddAddressScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AddressCreateData>({
    label: "",
    nama_penerima: "",
    telepon_penerima: "",
    alamat_lengkap: "",
    kota: "",
    provinsi: "",
    kode_pos: "",
    is_default: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label.trim()) {
      newErrors.label = "Label alamat wajib diisi";
    }

    if (!formData.nama_penerima.trim()) {
      newErrors.nama_penerima = "Nama penerima wajib diisi";
    }

    if (!formData.telepon_penerima.trim()) {
      newErrors.telepon_penerima = "Telepon penerima wajib diisi";
    } else if (!/^[\d+\-\s()]{8,}$/.test(formData.telepon_penerima.trim())) {
      newErrors.telepon_penerima = "Format telepon tidak valid";
    }

    if (!formData.alamat_lengkap.trim()) {
      newErrors.alamat_lengkap = "Alamat lengkap wajib diisi";
    }

    if (!formData.kota.trim()) {
      newErrors.kota = "Kota wajib diisi";
    }

    if (!formData.provinsi.trim()) {
      newErrors.provinsi = "Provinsi wajib diisi";
    }

    if (!formData.kode_pos.trim()) {
      newErrors.kode_pos = "Kode pos wajib diisi";
    } else if (!/^\d{5}$/.test(formData.kode_pos.trim())) {
      newErrors.kode_pos = "Kode pos harus 5 digit angka";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Error", "Mohon lengkapi semua field dengan benar");
      return;
    }

    setLoading(true);

    try {
      const isValidToken = await verifyToken();

      if (!isValidToken) {
        Alert.alert(
          "Error",
          "Sesi Anda telah berakhir, akan diarahkan ke halaman login"
        );
        await handleAuthError({ message: "Token expired or invalid" });
        return;
      }

      await addCustomerAddress(formData);

      Alert.alert("Berhasil!", "Alamat berhasil ditambahkan", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error adding address:", error);
      const isAuthError = await handleAuthError(error);
      if (!isAuthError) {
        Alert.alert("Error", getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (
    field: keyof AddressCreateData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <Navbar title="Tambah Alamat Baru" showBackButton={true} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Address Label */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Label Alamat *
            </Text>
            <TextInput
              value={formData.label}
              onChangeText={(value) => updateFormData("label", value)}
              placeholder="Contoh: Rumah, Kantor, Kos"
              className={`border rounded-xl px-4 py-3 text-gray-900 ${
                errors.label ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.label && (
              <Text className="text-red-500 text-sm mt-1">{errors.label}</Text>
            )}
          </View>

          {/* Recipient Name */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Nama Penerima *
            </Text>
            <TextInput
              value={formData.nama_penerima}
              onChangeText={(value) => updateFormData("nama_penerima", value)}
              placeholder="Nama lengkap penerima"
              className={`border rounded-xl px-4 py-3 text-gray-900 ${
                errors.nama_penerima ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.nama_penerima && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.nama_penerima}
              </Text>
            )}
          </View>

          {/* Recipient Phone */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Telepon Penerima *
            </Text>
            <TextInput
              value={formData.telepon_penerima}
              onChangeText={(value) =>
                updateFormData("telepon_penerima", value)
              }
              placeholder="Contoh: 08123456789"
              keyboardType="phone-pad"
              className={`border rounded-xl px-4 py-3 text-gray-900 ${
                errors.telepon_penerima ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.telepon_penerima && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.telepon_penerima}
              </Text>
            )}
          </View>

          {/* Full Address */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Alamat Lengkap *
            </Text>
            <TextInput
              value={formData.alamat_lengkap}
              onChangeText={(value) => updateFormData("alamat_lengkap", value)}
              placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className={`border rounded-xl px-4 py-3 text-gray-900 ${
                errors.alamat_lengkap ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.alamat_lengkap && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.alamat_lengkap}
              </Text>
            )}
          </View>

          {/* City */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Kota/Kabupaten *
            </Text>
            <TextInput
              value={formData.kota}
              onChangeText={(value) => updateFormData("kota", value)}
              placeholder="Contoh: Jakarta Selatan"
              className={`border rounded-xl px-4 py-3 text-gray-900 ${
                errors.kota ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.kota && (
              <Text className="text-red-500 text-sm mt-1">{errors.kota}</Text>
            )}
          </View>

          {/* Province */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Provinsi *</Text>
            <TextInput
              value={formData.provinsi}
              onChangeText={(value) => updateFormData("provinsi", value)}
              placeholder="Contoh: DKI Jakarta"
              className={`border rounded-xl px-4 py-3 text-gray-900 ${
                errors.provinsi ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.provinsi && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.provinsi}
              </Text>
            )}
          </View>

          {/* Postal Code */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Kode Pos *</Text>
            <TextInput
              value={formData.kode_pos}
              onChangeText={(value) => updateFormData("kode_pos", value)}
              placeholder="Contoh: 12345"
              keyboardType="numeric"
              maxLength={5}
              className={`border rounded-xl px-4 py-3 text-gray-900 ${
                errors.kode_pos ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.kode_pos && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.kode_pos}
              </Text>
            )}
          </View>

          {/* Set as Default */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4">
              <View className="flex-1">
                <Text className="text-gray-900 font-medium">
                  Jadikan Alamat Utama
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Alamat ini akan digunakan sebagai alamat default
                </Text>
              </View>
              <Switch
                value={formData.is_default}
                onValueChange={(value) => updateFormData("is_default", value)}
                trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
                thumbColor={formData.is_default ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>
          </View>

          {/* Required fields note */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm">
              * Field yang wajib diisi
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className="p-4 bg-white border-t border-gray-200">
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          className={`bg-primary rounded-xl py-4 items-center ${
            loading ? "opacity-50" : ""
          }`}
        >
          <View className="flex-row items-center">
            {loading && (
              <View className="mr-2">
                <Ionicons name="refresh" size={16} color="white" />
              </View>
            )}
            <Text className="text-white font-semibold text-lg">
              {loading ? "Menyimpan..." : "Simpan Alamat"}
            </Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default AddAddressScreen;
