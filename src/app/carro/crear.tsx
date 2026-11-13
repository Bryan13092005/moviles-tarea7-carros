import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useCarros } from '../../api/useCarros';
import { ActionAnimationOverlay } from '../../components/ActionAnimationOverlay';
import { CarroForm } from '../../components/CarroForm';
import { colors } from '../../theme';
import type { NuevoCarro } from '../../types/carro';

export default function CrearCarroScreen() {
  const router = useRouter();
  const { crearCarro } = useCarros({ autoLoad: false });
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const manejarEnvio = useCallback(
    async (values: NuevoCarro) => {
      await crearCarro(values);
      setGuardadoExitoso(true);
    },
    [crearCarro],
  );

  const volverAlCatalogo = useCallback(() => {
    setGuardadoExitoso(false);
    router.back();
  }, [router]);

  const cancelar = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CarroForm
        submitLabel="Crear carro"
        onSubmit={manejarEnvio}
        onCancel={cancelar}
      />

      <ActionAnimationOverlay
        visible={guardadoExitoso}
        variant="crear"
        onFinish={volverAlCatalogo}
      />
    </View>
  );
}
