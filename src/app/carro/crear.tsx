import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useCarros } from '../../api/useCarros';
import { CarroForm } from '../../components/CarroForm';
import type { NuevoCarro } from '../../types/carro';

export default function CrearCarroScreen() {
  const router = useRouter();
  const { crearCarro } = useCarros({ autoLoad: false });

  const manejarEnvio = useCallback(
    async (values: NuevoCarro) => {
      await crearCarro(values);
      router.back();
    },
    [crearCarro, router],
  );

  const cancelar = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <CarroForm
      submitLabel="Crear carro"
      onSubmit={manejarEnvio}
      onCancel={cancelar}
    />
  );
}
