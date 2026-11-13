import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { carrosService } from '../../api/supabase.service';
import { useCarros } from '../../api/useCarros';
import { CarroForm } from '../../components/CarroForm';
import type { Carro, NuevoCarro } from '../../types/carro';

export default function EditarCarroScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const carroId = Number(id);

  const { actualizarCarro } = useCarros({ autoLoad: false });

  const [carro, setCarro] = useState<Carro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (!Number.isFinite(carroId)) {
        if (activo) {
          setError('El identificador del carro no es válido.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await carrosService.getById(carroId);
        if (activo) setCarro(data);
      } catch (e) {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar el carro.');
        }
      } finally {
        if (activo) setLoading(false);
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, [carroId]);

  const manejarEnvio = useCallback(
    async (values: NuevoCarro) => {
      await actualizarCarro(carroId, values);
      router.back();
    },
    [actualizarCarro, carroId, router],
  );

  const cancelar = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" />
        <Text style={styles.ayuda}>Cargando carro...</Text>
      </View>
    );
  }

  if (error || !carro) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error ?? 'No se encontró el carro.'}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={cancelar}
          style={({ pressed }) => [styles.boton, pressed && styles.pressed]}
        >
          <Text style={styles.textoBoton}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CarroForm
      initialValues={carro}
      submitLabel="Guardar cambios"
      onSubmit={manejarEnvio}
      onCancel={cancelar}
    />
  );
}

const styles = StyleSheet.create({
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#f7f7f7',
  },
  ayuda: {
    fontSize: 15,
    color: '#555555',
  },
  error: {
    fontSize: 15,
    color: '#d1242f',
    textAlign: 'center',
  },
  boton: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  textoBoton: {
    color: '#ffffff',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
