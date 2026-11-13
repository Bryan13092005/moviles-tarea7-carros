import { Stack } from 'expo-router';

import { colors } from '../theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Atrás',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontSize: 17, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Catálogo', headerShown: false }} />
      <Stack.Screen name="carro/crear" options={{ title: 'Nuevo carro' }} />
      <Stack.Screen name="carro/[id]" options={{ title: 'Editar carro' }} />
    </Stack>
  );
}