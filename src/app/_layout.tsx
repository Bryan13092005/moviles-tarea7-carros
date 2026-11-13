import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HeroBackdrop } from '../components/HeroBackdrop';
import { colors } from '../theme';

export default function RootLayout() {
  const reducedMotion = useReducedMotion();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack
          screenOptions={{
            animation: reducedMotion ? 'fade' : 'default',
            animationMatchesGesture: true,
            headerBackTitle: 'Atrás',
            headerStyle: { backgroundColor: colors.heroWash },
            headerBackground: () => <HeroBackdrop variant="header" />,
            headerTintColor: colors.ink,
            headerTitleStyle: {
              fontSize: 17,
              fontWeight: '700',
              color: colors.ink,
            },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Catálogo', headerShown: false }} />
          <Stack.Screen name="carro/crear" options={{ title: 'Nuevo vehículo' }} />
          <Stack.Screen name="carro/[id]" options={{ title: 'Editar vehículo' }} />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
