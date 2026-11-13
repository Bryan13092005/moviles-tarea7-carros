import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { carrosService } from '../../api/supabase.service';
import { useCarros } from '../../api/useCarros';
import { CarroForm } from '../../components/CarroForm';
import { Icon } from '../../components/Icon';
import { colors, radius, spacing, text } from '../../theme';
import type { Carro, NuevoCarro } from '../../types/carro';

export default function EditarCarroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View style={[styles.centrado, { paddingTop: insets.top + spacing.xxl }]}>
        <ActivityIndicator size="large" color={colors.inkMuted} />
        <Text style={[text.body, styles.ayuda]}>Cargando carro...</Text>
      </View>
    );
  }

  if (error || !carro) {
    return (
      <View style={[styles.centrado, { paddingTop: insets.top + spacing.xxl }]}>
        <View style={styles.estadoIcono}>
          <Icon
            ios="exclamationmark.triangle.fill"
            android="warning"
            size={24}
            color={colors.danger}
          />
        </View>
        <Text style={[text.sectionTitle, styles.errorTitulo]}>No pudimos abrir el carro</Text>
        <Text style={[text.body, styles.errorMensaje]} selectable>
          {error ?? 'No se encontró el carro.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={cancelar}
          style={({ pressed }) => [styles.boton, pressed && styles.pressed]}
        >
          <Text style={text.button}>Volver</Text>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  estadoIcono: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorTitulo: {
    textAlign: 'center',
  },
  errorMensaje: {
    textAlign: 'center',
    maxWidth: 300,
    color: colors.danger,
  },
  ayuda: {
    color: colors.inkMuted,
  },
  boton: {
    marginTop: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});