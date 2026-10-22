import { Stack } from "expo-router";

/**
 * Grup auth Zovora. Layar-layar baru (`onboarding`, `forgot-password`,
 * `verify-code`, `reset-password`) hidup berdampingan dengan route lama
 * `login` + `register` supaya semua tautan lama (services/api.ts,
 * httpClient.ts, utils/auth.ts, ProfileScreen) tetap valid.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-code" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
