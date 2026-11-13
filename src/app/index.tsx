import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCarros } from '../api/useCarros';
import { CarroCard } from '../components/CarroCard';
import type { Insignia } from '../components/CarroCard';
import { CatalogoSkeleton } from '../components/CatalogoSkeleton';
import { Icon } from '../components/Icon';
import { colors, radius, shadows, spacing, text } from '../theme';
import type { Carro } from '../types/carro';
import { contarVehiculos, mesActual, normalizarTexto } from '../utils/formato';

const TODOS = 'Todos';

type Orden = 'recientes' | 'menor-precio' | 'mayor-precio';

function ordenarCarros(lista: Carro[], orden: Orden): Carro[] {
  if (orden === 'recientes') return lista;

  const copia = [...lista];
  if (orden === 'menor-precio') return copia.sort((a, b) => a.precio - b.precio);
  return copia.sort((a, b) => b.precio - a.precio);
}

/**
 * Insignias de la tarjeta. La tabla `carros` no tiene un campo de destacado,
 * así que se derivan del propio catálogo: el más caro es DESTACADO y el del
 * año más reciente es NUEVO.
 */
function calcularInsignias(carros: Carro[]): Map<number, Insignia> {
  const insignias = new Map<number, Insignia>();
  if (carros.length < 2) return insignias;

  const masCaro = carros.reduce((a, b) => (b.precio > a.precio ? b : a));
  const masNuevo = carros.reduce((a, b) => (b.anio > a.anio ? b : a));

  insignias.set(masCaro.id, 'DESTACADO');
  if (!insignias.has(masNuevo.id)) insignias.set(masNuevo.id, 'NUEVO');

  return insignias;
}

type EncabezadoProps = {
  topInset: number;
  busqueda: string;
  onBuscar: (valor: string) => void;
  chips: string[];
  chipActivo: string;
  onChip: (chip: string) => void;
  onCrear: () => void;
  onOrdenar: () => void;
  total: number;
};

function EncabezadoCatalogo({
  topInset,
  busqueda,
  onBuscar,
  chips,
  chipActivo,
  onChip,
  onCrear,
  onOrdenar,
  total,
}: EncabezadoProps) {
  return (
    <LinearGradient
      colors={[colors.heroWash, colors.background]}
      locations={[0, 0.9]}
      style={[styles.hero, { paddingTop: topInset + spacing.sm }]}
    >
      <View style={styles.barra}>
        <View style={styles.identidad}>
          <View style={styles.logo}>
            <Icon ios="car.fill" android="directions_car" size={20} color={colors.onInk} />
          </View>
          <View>
            <Text style={text.eyebrow}>Movilidad</Text>
            <Text style={text.barTitle}>Catálogo</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Agregar vehículo"
          onPress={onCrear}
          hitSlop={6}
          style={({ pressed }) => [styles.botonRedondo, pressed && styles.presionado]}
        >
          <Icon ios="plus" android="add" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.heroTexto}>
        <View style={styles.filaEyebrow}>
          <Icon ios="sparkles" android="auto_awesome" size={13} color={colors.accentInk} />
          <Text style={text.eyebrow}>Selección curada · {mesActual()}</Text>
        </View>

        <Text style={text.hero}>
          Tu próximo auto,{'\n'}
          <Text style={text.heroMuted}>sin rodeos.</Text>
        </Text>

        <Text style={text.lead}>
          Vehículos verificados, precios transparentes y una experiencia diseñada para decidir
          mejor.
        </Text>
      </View>

      <View style={styles.filaBuscador}>
        <View style={styles.buscador}>
          <Icon ios="magnifyingglass" android="search" size={19} color={colors.inkMuted} />
          <TextInput
            value={busqueda}
            onChangeText={onBuscar}
            placeholder="Marca, modelo o tipo"
            placeholderTextColor={colors.inkSubtle}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            selectionColor={colors.ink}
            accessibilityLabel="Buscar vehículos por marca o tipo"
            style={styles.input}
          />
          {busqueda ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
              onPress={() => onBuscar('')}
              hitSlop={6}
              style={styles.botonLimpiar}
            >
              <Icon ios="xmark.circle.fill" android="cancel" size={18} color={colors.inkSubtle} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ordenar vehículos"
          onPress={onOrdenar}
          style={({ pressed }) => [styles.botonOrden, pressed && styles.presionado]}
        >
          <Icon ios="slider.horizontal.3" android="tune" size={20} color={colors.onInk} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.chipsDesborde}
        contentContainerStyle={styles.chips}
      >
        {chips.map((chip) => {
          const activo = chip === chipActivo;

          return (
            <Pressable
              key={chip}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              onPress={() => onChip(chip)}
              style={({ pressed }) => [
                styles.chip,
                activo && styles.chipActivo,
                pressed && styles.presionado,
              ]}
            >
              <Text style={[text.chip, activo && text.chipActive]}>{chip}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.seccion}>
        <Text style={text.eyebrow}>Catálogo disponible</Text>
        <Text style={text.sectionTitle}>{contarVehiculos(total)}</Text>
      </View>
    </LinearGradient>
  );
}

type EstadoProps = {
  ios: 'car.fill' | 'magnifyingglass' | 'exclamationmark.triangle.fill';
  android: 'directions_car' | 'search' | 'warning';
  titulo: string;
  mensaje: string;
  accion: string;
  onAccion: () => void;
};

function EstadoCatalogo({ ios, android, titulo, mensaje, accion, onAccion }: EstadoProps) {
  return (
    <View style={styles.estado}>
      <View style={styles.estadoIcono}>
        <Icon ios={ios} android={android} size={24} color={colors.inkMuted} />
      </View>
      <Text style={text.sectionTitle}>{titulo}</Text>
      <Text style={[text.body, styles.estadoMensaje]} selectable>
        {mensaje}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAccion}
        style={({ pressed }) => [styles.botonAccion, pressed && styles.presionado]}
      >
        <Text style={text.button}>{accion}</Text>
      </Pressable>
    </View>
  );
}

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { carros, loading, refreshing, error, refetch, refrescar, eliminarCarro } = useCarros();

  const [busqueda, setBusqueda] = useState('');
  const [tipoActivo, setTipoActivo] = useState(TODOS);
  const [orden, setOrden] = useState<Orden>('recientes');
  const esPrimerFoco = useRef(true);

  const anchoTarjeta = Math.max(120, (width - spacing.lg * 2 - spacing.md) / 2);

  // Al volver de crear/editar, refresca sin mostrar el spinner principal.
  useFocusEffect(
    useCallback(() => {
      if (esPrimerFoco.current) {
        esPrimerFoco.current = false;
        return;
      }
      void refrescar();
    }, [refrescar]),
  );

  const chips = useMemo(() => {
    const tipos = Array.from(
      new Set(carros.map((carro) => carro.tipo.trim()).filter((tipo) => tipo.length > 0)),
    ).sort((a, b) => a.localeCompare(b, 'es'));

    return [TODOS, ...tipos];
  }, [carros]);

  // Si el tipo filtrado desapareció del catálogo, se vuelve a "Todos".
  const chipActivo = chips.includes(tipoActivo) ? tipoActivo : TODOS;

  const visibles = useMemo(() => {
    const consulta = normalizarTexto(busqueda);
    const tipoBuscado = normalizarTexto(chipActivo);

    const filtrados = carros.filter((carro) => {
      const coincideTipo = chipActivo === TODOS || normalizarTexto(carro.tipo) === tipoBuscado;
      if (!coincideTipo) return false;
      if (!consulta) return true;

      return normalizarTexto(`${carro.marca} ${carro.tipo}`).includes(consulta);
    });

    return ordenarCarros(filtrados, orden);
  }, [busqueda, carros, chipActivo, orden]);

  const insignias = useMemo(() => calcularInsignias(carros), [carros]);

  const irACrear = useCallback(() => {
    router.push('/carro/crear');
  }, [router]);

  const irAEditar = useCallback(
    (carro: Carro) => {
      router.push({ pathname: '/carro/[id]', params: { id: String(carro.id) } });
    },
    [router],
  );

  const manejarEliminar = useCallback(
    async (carro: Carro) => {
      try {
        await eliminarCarro(carro.id);
      } catch (e) {
        Alert.alert(
          'No se pudo eliminar',
          e instanceof Error ? e.message : 'Ocurrió un error inesperado.',
        );
      }
    },
    [eliminarCarro],
  );

  const confirmarEliminar = useCallback(
    (carro: Carro) => {
      Alert.alert(
        'Eliminar vehículo',
        `¿Deseas eliminar el ${carro.marca} ${carro.tipo} ${carro.anio}? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void manejarEliminar(carro);
            },
          },
        ],
      );
    },
    [manejarEliminar],
  );

  const abrirAcciones = useCallback(
    (carro: Carro) => {
      Alert.alert(`${carro.marca} ${carro.tipo}`, `Año ${carro.anio}`, [
        { text: 'Editar', onPress: () => irAEditar(carro) },
        { text: 'Eliminar', style: 'destructive', onPress: () => confirmarEliminar(carro) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    },
    [confirmarEliminar, irAEditar],
  );

  // Se mantienen tres opciones para que el diálogo nativo funcione igual en Android.
  const abrirOrden = useCallback(() => {
    Alert.alert('Ordenar vehículos', 'Elige el criterio del catálogo.', [
      { text: 'Más recientes', onPress: () => setOrden('recientes') },
      { text: 'Menor precio', onPress: () => setOrden('menor-precio') },
      { text: 'Mayor precio', onPress: () => setOrden('mayor-precio') },
    ]);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setBusqueda('');
    setTipoActivo(TODOS);
  }, []);

  const cargando = loading && carros.length === 0;
  const errorSinDatos = !loading && !carros.length && error !== null;

  const hayFiltros = busqueda.trim().length > 0 || chipActivo !== TODOS;

  return (
    <View style={styles.pantalla}>
      <StatusBar style="dark" />

      <FlatList<Carro>
        data={cargando || errorSinDatos ? [] : visibles}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.fila}
        renderItem={({ item }) => (
          <CarroCard
            carro={item}
            insignia={insignias.get(item.id)}
            ancho={anchoTarjeta}
            onEditar={irAEditar}
            onAcciones={abrirAcciones}
          />
        )}
        ListHeaderComponent={
          <>
            <EncabezadoCatalogo
              topInset={insets.top}
              busqueda={busqueda}
              onBuscar={setBusqueda}
              chips={chips}
              chipActivo={chipActivo}
              onChip={setTipoActivo}
              onCrear={irACrear}
              onOrdenar={abrirOrden}
              total={visibles.length}
            />

            {error && carros.length > 0 ? (
              <View style={styles.aviso}>
                <Icon
                  ios="exclamationmark.triangle.fill"
                  android="warning"
                  size={15}
                  color={colors.danger}
                />
                <Text style={styles.avisoTexto} selectable>
                  {error}
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          cargando ? (
            <CatalogoSkeleton ancho={anchoTarjeta} />
          ) : errorSinDatos ? (
            <EstadoCatalogo
              ios="exclamationmark.triangle.fill"
              android="warning"
              titulo="No pudimos cargar el catálogo"
              mensaje={error}
              accion="Reintentar"
              onAccion={() => void refetch()}
            />
          ) : (
            <EstadoCatalogo
              ios={hayFiltros ? 'magnifyingglass' : 'car.fill'}
              android={hayFiltros ? 'search' : 'directions_car'}
              titulo={hayFiltros ? 'Sin resultados' : 'Aún no hay vehículos'}
              mensaje={
                hayFiltros
                  ? 'Ningún vehículo coincide con la búsqueda o el filtro seleccionado.'
                  : 'Agrega tu primer vehículo para verlo aquí en formato de tarjeta.'
              }
              accion={hayFiltros ? 'Limpiar filtros' : 'Agregar vehículo'}
              onAccion={hayFiltros ? limpiarFiltros : irACrear}
            />
          )
        }
        contentContainerStyle={[
          styles.contenido,
          { paddingBottom: spacing.xxl + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refrescar()}
            tintColor={colors.inkMuted}
            colors={[colors.ink]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  fila: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  // Hero / encabezado
  hero: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  identidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonRedondo: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.soft,
  },
  heroTexto: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  filaEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filaBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  buscador: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    boxShadow: shadows.soft,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: text.search.fontSize,
    color: colors.ink,
  },
  botonOrden: {
    width: 54,
    height: 54,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonLimpiar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsDesborde: {
    marginHorizontal: -spacing.lg,
    marginTop: spacing.md,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  chip: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActivo: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  seccion: {
    marginTop: spacing.lg,
    gap: spacing.xxs,
  },

  // Estados
  estado: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  estadoIcono: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadoMensaje: {
    textAlign: 'center',
    maxWidth: 280,
  },
  botonAccion: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  presionado: {
    opacity: 0.6,
  },
});
