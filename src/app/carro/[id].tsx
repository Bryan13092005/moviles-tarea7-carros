import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { carrosService } from '../../api/supabase.service';
import { useCarros } from '../../api/useCarros';
import { ActionAnimationOverlay } from '../../components/ActionAnimationOverlay';
import { CarroForm } from '../../components/CarroForm';
import { CatalogoSkeleton } from '../../components/CatalogoSkeleton';
import { Icon } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import {
  colors,
  ENTER_DOWN,
  EXIT_FADE,
  radius,
  spacing,
  text,
  triggerHaptic,
} from '../../theme';
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
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (!Number.isFinite(carroId)) {
        if (activo) {
          setError('El identificador del carro no es válido.');
          setLoading(false);
          triggerHaptic('error');
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
          triggerHaptic('error');
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
      setGuardadoExitoso(true);
    },
    [actualizarCarro, carroId],
  );

  const volverAlCatalogo = useCallback(() => {
    setGuardadoExitoso(false);
    router.back();
  }, [router]);

  const cancelar = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.centrado, { paddingTop: insets.top }]}>
        <CatalogoSkeleton
          mensaje="Cargando vehículo..."
          detalle="Recuperando la ficha técnica desde tu garaje."
        />
      </View>
    );
  }

  if (error || !carro) {
    return (
      <Animated.View
        entering={ENTER_DOWN}
        exiting={EXIT_FADE}
        style={[styles.centrado, { paddingTop: insets.top + spacing.xxl }]}
      >
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
        <PressableScale
          accessibilityRole="button"
          onPress={cancelar}
          haptic="light"
          contentStyle={styles.boton}
        >
          <Text style={text.button}>Volver</Text>
        </PressableScale>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CarroForm
        initialValues={carro}
        submitLabel="Guardar cambios"
        onSubmit={manejarEnvio}
        onCancel={cancelar}
      />

      <ActionAnimationOverlay
        visible={guardadoExitoso}
        variant="editar"
        onFinish={volverAlCatalogo}
      />
    </View>
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
});
