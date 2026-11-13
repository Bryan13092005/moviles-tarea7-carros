import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
      <Stack.Screen name="index" options={{ title: 'Catálogo', headerShown: false }} />
      <Stack.Screen name="carro/crear" options={{ title: 'Nuevo carro' }} />
      <Stack.Screen name="carro/[id]" options={{ title: 'Editar carro' }} />
    </Stack>
  );
}
