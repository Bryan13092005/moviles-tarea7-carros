import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { colors } from '../theme';

export default function RootLayout() {
  const reducedMotion = useReducedMotion();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          animation: reducedMotion ? 'fade' : 'default',
          animationMatchesGesture: true,
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
    </GestureHandlerRootView>
  );
}
