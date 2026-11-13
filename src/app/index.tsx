import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCarros } from '../api/useCarros';
import { ActionSheet, type SheetOption } from '../components/ActionSheet';
import { CarroCard } from '../components/CarroCard';
import type { Insignia } from '../components/CarroCard';
import { CatalogoSkeleton } from '../components/CatalogoSkeleton';
import { HeroBackdrop } from '../components/HeroBackdrop';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import {
  colors,
  ENTER_DOWN,
  ENTER_DOWN_FAST,
  ENTER_FADE,
  enterStagger,
  EXIT_DOWN,
  EXIT_FADE,
  EXIT_UP,
  LAYOUT_SPRING,
  radius,
  shadows,
  spacing,
  text,
  triggerHaptic,
} from '../theme';
import type { Carro } from '../types/carro';
import { contarVehiculos, formatearPrecio, mesActual, normalizarTexto } from '../utils/formato';

const TODOS = 'Todos';

type Orden = 'recientes' | 'menor-precio' | 'mayor-precio';

const ETIQUETA_ORDEN: Record<Orden, string> = {
  recientes: 'Más recientes',
  'menor-precio': 'Menor precio',
  'mayor-precio': 'Mayor precio',
};

/** Constructores de entrada escalonada en ámbito de módulo. */
const ENTER_BARRA = enterStagger(0, 45);
const ENTER_HERO = enterStagger(1, 45);
const ENTER_BUSCADOR = enterStagger(2, 45);
const ENTER_CHIPS = enterStagger(3, 45);
const ENTER_SECCION = enterStagger(4, 45);

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
  orden: Orden;
  onCrear: () => void;
  onOrdenar: () => void;
  onRecargar: () => void;
  refreshing: boolean;
  total: number;
};

function EncabezadoCatalogo({
  topInset,
  busqueda,
  onBuscar,
  chips,
  chipActivo,
  onChip,
  orden,
  onCrear,
  onOrdenar,
  onRecargar,
  refreshing,
  total,
}: EncabezadoProps) {
  const reducedMotion = useReducedMotion();
  const rotacion = useSharedValue(0);

  useEffect(() => {
    if (!refreshing || reducedMotion) {
      cancelAnimation(rotacion);
      rotacion.set(0);
      return;
    }

    rotacion.set(0);
    rotacion.set(
      withRepeat(
        withTiming(360, { duration: 750, easing: Easing.linear }),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(rotacion);
    };
  }, [refreshing, reducedMotion, rotacion]);

  const iconoGiroStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotacion.get()}deg` }],
  }));

  const ordenPersonalizado = orden !== 'recientes';

  return (
    <View style={[styles.hero, { paddingTop: topInset + spacing.sm }]}>
      <HeroBackdrop variant="hero" />

      <Animated.View entering={ENTER_BARRA} style={styles.barra}>
        <View style={styles.identidad}>
          <View style={styles.logo}>
            <Icon ios="car.fill" android="directions_car" size={19} color={colors.accent} />
          </View>
          <View style={styles.identidadTextos}>
            <Text style={text.barTitle}>Catálogo</Text>
            <View style={styles.pildoraMes}>
              <View style={styles.puntoVivo} />
              <Text style={styles.textoPildoraMes}>{mesActual()}</Text>
            </View>
          </View>
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Agregar vehículo"
          onPress={onCrear}
          scaleTo={0.95}
          haptic="light"
          hitSlop={6}
          contentStyle={styles.botonNuevo}
        >
          <View style={styles.iconoNuevoCirculo}>
            <Icon ios="plus" android="add" size={14} color={colors.onAccent} />
          </View>
          <Text style={styles.textoBotonNuevo}>Nuevo</Text>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={ENTER_HERO} style={styles.heroTexto}>
        <Text style={text.hero}>
          Tu próximo auto,{'\n'}
          <Text style={text.heroMuted}>sin rodeos.</Text>
        </Text>

        <Text style={text.lead}>
          Vehículos verificados, precios transparentes y una experiencia diseñada para decidir
          mejor.
        </Text>
      </Animated.View>

      <Animated.View entering={ENTER_BUSCADOR} style={styles.filaBuscador}>
        <View style={styles.buscador}>
          <Icon ios="magnifyingglass" android="search" size={19} color={colors.inkMuted} />
          <TextInput
            value={busqueda}
            onChangeText={onBuscar}
            placeholder="Buscar por marca o carrocería…"
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
            <Animated.View entering={ENTER_FADE} exiting={EXIT_FADE}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Borrar búsqueda"
                onPress={() => onBuscar('')}
                scaleTo={0.9}
                haptic="selection"
                hitSlop={6}
                contentStyle={styles.botonLimpiar}
              >
                <Icon ios="xmark.circle.fill" android="cancel" size={18} color={colors.inkSubtle} />
              </PressableScale>
            </Animated.View>
          ) : null}
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Ordenar vehículos. Actual: ${ETIQUETA_ORDEN[orden]}`}
          onPress={onOrdenar}
          scaleTo={0.94}
          haptic="light"
          contentStyle={styles.botonOrden}
        >
          <Icon ios="slider.horizontal.3" android="tune" size={20} color={colors.onInk} />
          {ordenPersonalizado ? <View style={styles.puntoOrdenActivo} /> : null}
        </PressableScale>
      </Animated.View>

      <Animated.View entering={ENTER_CHIPS}>
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
              <PressableScale
                key={chip}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                onPress={() => onChip(chip)}
                scaleTo={0.95}
                haptic="selection"
                hapticOn="pressIn"
                hitSlop={4}
                contentStyle={[styles.chip, activo && styles.chipActivo]}
              >
                <Text style={[text.chip, activo && text.chipActive]}>{chip}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </Animated.View>

      <Animated.View entering={ENTER_SECCION} style={styles.seccionFila}>
        <View style={styles.seccion}>
          <View style={styles.filaTituloSeccion}>
            <Text style={text.sectionTitle} selectable>
              {contarVehiculos(total)}
            </Text>
            <View style={styles.pildoraOrdenActual}>
              <Text style={styles.textoOrdenActual}>{ETIQUETA_ORDEN[orden]}</Text>
            </View>
          </View>
        </View>

        <View style={styles.accionesSeccion}>
          {refreshing ? (
            <Animated.View
              entering={ENTER_FADE}
              exiting={EXIT_FADE}
              style={styles.pildoraRecarga}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.textoRecarga}>Actualizando</Text>
            </Animated.View>
          ) : null}

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={refreshing ? 'Actualizando catálogo' : 'Recargar catálogo'}
            accessibilityState={{ busy: refreshing }}
            onPress={onRecargar}
            disabled={refreshing}
            scaleTo={0.92}
            haptic="light"
            hitSlop={8}
            contentStyle={styles.botonRecarga}
          >
            <Animated.View style={iconoGiroStyle}>
              <Icon
                ios="arrow.clockwise"
                android="autorenew"
                size={17}
                color={refreshing ? colors.ink : colors.inkMuted}
              />
            </Animated.View>
          </PressableScale>
        </View>
      </Animated.View>
    </View>
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
    <Animated.View entering={ENTER_DOWN} exiting={EXIT_DOWN} style={styles.estado}>
      <View style={styles.estadoIcono}>
        <Icon ios={ios} android={android} size={24} color={colors.inkMuted} />
      </View>
      <Text style={text.sectionTitle}>{titulo}</Text>
      <Text style={[text.body, styles.estadoMensaje]} selectable>
        {mensaje}
      </Text>
      <PressableScale
        accessibilityRole="button"
        onPress={onAccion}
        haptic="light"
        contentStyle={styles.botonAccion}
      >
        <Text style={text.button}>{accion}</Text>
      </PressableScale>
    </Animated.View>
  );
}

function ResumenCarroSheet({ carro }: { carro: Carro }) {
  const marca = carro.marca?.trim() || 'Sin marca';
  const tipo = carro.tipo?.trim() || 'Vehículo';
  const anio = Number.isFinite(carro.anio) && carro.anio > 0 ? String(carro.anio) : 's/a';
  const precio = formatearPrecio(carro.precio);

  return (
    <View style={styles.resumenCarro}>
      <View style={styles.resumenMiniatura}>
        {carro.imgURL ? (
          <Image
            source={{ uri: carro.imgURL }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Icon ios="car.fill" android="directions_car" size={20} color={colors.inkSubtle} />
        )}
      </View>

      <View style={styles.resumenTextos}>
        <Text style={text.cardBrand} numberOfLines={1}>
          {marca} · {anio}
        </Text>
        <Text style={styles.resumenTipo} numberOfLines={1}>
          {tipo}
        </Text>
      </View>

      <View style={styles.resumenPrecioPildora}>
        <Text style={styles.resumenPrecioTexto}>{precio}</Text>
      </View>
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
  const [menuOrdenAbierto, setMenuOrdenAbierto] = useState(false);
  const [carroAcciones, setCarroAcciones] = useState<Carro | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

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

  const abrirAcciones = useCallback((carro: Carro) => {
    setConfirmandoEliminar(false);
    setErrorAccion(null);
    setCarroAcciones(carro);
  }, []);

  const cerrarAcciones = useCallback(() => {
    if (eliminando) return;
    setCarroAcciones(null);
    setConfirmandoEliminar(false);
    setErrorAccion(null);
  }, [eliminando]);

  const manejarEliminarConfirmado = useCallback(async () => {
    if (!carroAcciones || eliminando) return;

    setEliminando(true);
    setErrorAccion(null);
    try {
      await eliminarCarro(carroAcciones.id);
      triggerHaptic('success');
      setCarroAcciones(null);
      setConfirmandoEliminar(false);
    } catch (e) {
      triggerHaptic('error');
      setErrorAccion(
        e instanceof Error ? e.message : 'No se pudo eliminar el vehículo. Inténtalo de nuevo.',
      );
    } finally {
      setEliminando(false);
    }
  }, [carroAcciones, eliminarCarro, eliminando]);

  const abrirOrden = useCallback(() => {
    setMenuOrdenAbierto(true);
  }, []);

  const opcionesOrden = useMemo<SheetOption[]>(
    () => [
      {
        id: 'recientes',
        label: 'Más recientes',
        description: 'Últimos vehículos registrados en el catálogo',
        ios: 'clock.fill',
        android: 'schedule',
        active: orden === 'recientes',
        onPress: () => {
          setOrden('recientes');
          setMenuOrdenAbierto(false);
        },
      },
      {
        id: 'menor-precio',
        label: 'Menor precio',
        description: 'Ordena de las opciones más accesibles a mayor valor',
        ios: 'arrow.down.right',
        android: 'south_east',
        active: orden === 'menor-precio',
        onPress: () => {
          setOrden('menor-precio');
          setMenuOrdenAbierto(false);
        },
      },
      {
        id: 'mayor-precio',
        label: 'Mayor precio',
        description: 'Muestra los vehículos de gama más alta primero',
        ios: 'arrow.up.right',
        android: 'north_east',
        active: orden === 'mayor-precio',
        onPress: () => {
          setOrden('mayor-precio');
          setMenuOrdenAbierto(false);
        },
      },
    ],
    [orden],
  );

  const opcionesCarro = useMemo<SheetOption[]>(() => {
    if (!carroAcciones || confirmandoEliminar) return [];

    return [
      {
        id: 'editar',
        label: 'Editar vehículo',
        description: 'Modificar marca, modelo, año, precio o fotografía',
        ios: 'pencil',
        android: 'edit',
        onPress: () => {
          const objetivo = carroAcciones;
          setCarroAcciones(null);
          irAEditar(objetivo);
        },
      },
      {
        id: 'eliminar',
        label: 'Eliminar del catálogo',
        description: 'Borrar permanentemente este vehículo y su imagen',
        ios: 'trash',
        android: 'delete',
        destructive: true,
        onPress: () => {
          setErrorAccion(null);
          setConfirmandoEliminar(true);
        },
      },
    ];
  }, [carroAcciones, confirmandoEliminar, irAEditar]);

  const limpiarFiltros = useCallback(() => {
    setBusqueda('');
    setTipoActivo(TODOS);
  }, []);

  const manejarRecarga = useCallback(() => {
    triggerHaptic('light');
    void refrescar();
  }, [refrescar]);

  const cargando = loading && carros.length === 0;
  const errorSinDatos = !loading && !carros.length && error !== null;

  const hayFiltros = busqueda.trim().length > 0 || chipActivo !== TODOS;

  return (
    <SafeAreaView style={styles.pantalla} edges={['left', 'right']}>
      <StatusBar style="dark" />

      <Animated.FlatList<Carro>
        data={cargando || errorSinDatos ? [] : visibles}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.fila}
        itemLayoutAnimation={LAYOUT_SPRING}
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
              orden={orden}
              onCrear={irACrear}
              onOrdenar={abrirOrden}
              onRecargar={manejarRecarga}
              refreshing={refreshing}
              total={visibles.length}
            />

            {error && carros.length > 0 ? (
              <Animated.View entering={ENTER_DOWN_FAST} exiting={EXIT_UP} style={styles.aviso}>
                <Icon
                  ios="exclamationmark.triangle.fill"
                  android="warning"
                  size={15}
                  color={colors.danger}
                />
                <Text style={styles.avisoTexto} selectable>
                  {error}
                </Text>
              </Animated.View>
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
            onRefresh={manejarRecarga}
            tintColor={colors.inkMuted}
            colors={[colors.ink]}
          />
        }
      />

      {/* Hoja de estilo para ordenar y filtrar el catálogo */}
      <ActionSheet
        visible={menuOrdenAbierto}
        title="Ordenar vehículos"
        subtitle="Elige el orden en el que quieres explorar el catálogo disponible."
        options={opcionesOrden}
        cancelLabel="Listo"
        onClose={() => setMenuOrdenAbierto(false)}
      />

      {/* Hoja de estilo para las acciones de cada tarjeta (...) y confirmación de borrado */}
      <ActionSheet
        visible={carroAcciones !== null}
        title={confirmandoEliminar ? '¿Eliminar este vehículo?' : 'Opciones del vehículo'}
        subtitle={
          confirmandoEliminar && carroAcciones
            ? `El ${carroAcciones.marca} ${carroAcciones.tipo} (${carroAcciones.anio}) se borrará del catálogo de forma permanente.`
            : 'Selecciona una acción rápida para esta unidad.'
        }
        header={carroAcciones ? <ResumenCarroSheet carro={carroAcciones} /> : undefined}
        options={opcionesCarro}
        onClose={cerrarAcciones}
      >
        {confirmandoEliminar ? (
          <View style={styles.confirmacionContenedor}>
            {errorAccion ? (
              <Animated.View entering={ENTER_DOWN_FAST} exiting={EXIT_UP} style={styles.avisoModal}>
                <Icon
                  ios="exclamationmark.triangle.fill"
                  android="warning"
                  size={15}
                  color={colors.danger}
                />
                <Text style={styles.avisoTexto} selectable>
                  {errorAccion}
                </Text>
              </Animated.View>
            ) : null}

            <View style={styles.confirmacionBotones}>
              <PressableScale
                accessibilityRole="button"
                onPress={() => {
                  setErrorAccion(null);
                  setConfirmandoEliminar(false);
                }}
                disabled={eliminando}
                haptic="selection"
                style={styles.botonModalWrapper}
                contentStyle={styles.botonModalSecundario}
              >
                <Text style={styles.textoModalSecundario}>Volver</Text>
              </PressableScale>

              <PressableScale
                accessibilityRole="button"
                onPress={() => void manejarEliminarConfirmado()}
                disabled={eliminando}
                accessibilityState={{ disabled: eliminando, busy: eliminando }}
                haptic="medium"
                style={styles.botonModalWrapper}
                contentStyle={styles.botonModalPeligro}
              >
                <View style={styles.filaBotonPeligro}>
                  {eliminando ? (
                    <ActivityIndicator size="small" color={colors.onInk} />
                  ) : (
                    <Icon ios="trash" android="delete" size={16} color={colors.onInk} />
                  )}
                  <Text style={styles.textoModalPeligro}>
                    {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                  </Text>
                </View>
              </PressableScale>
            </View>
          </View>
        ) : null}
      </ActionSheet>
    </SafeAreaView>
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

  // Hero / encabezado con composición orgánica SVG
  hero: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    position: 'relative',
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
    gap: spacing.sm + 2,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.md + 2,
    borderCurve: 'continuous',
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.soft,
  },
  identidadTextos: {
    gap: 2,
  },
  pildoraMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  puntoVivo: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accentInk,
  },
  textoPildoraMes: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  botonNuevo: {
    height: 44,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.md + 2,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    boxShadow: shadows.soft,
  },
  iconoNuevoCirculo: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonNuevo: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.onInk,
  },
  heroTexto: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    maxWidth: 520,
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
    borderWidth: 1,
    borderColor: colors.heroBorder,
    boxShadow: shadows.searchDock,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: text.search.fontSize,
    fontWeight: text.search.fontWeight,
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
    boxShadow: shadows.searchDock,
  },
  puntoOrdenActivo: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
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
    borderColor: colors.heroBorder,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActivo: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  seccionFila: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  seccion: {
    flex: 1,
  },
  filaTituloSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pildoraOrdenActual: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.heroBorder,
  },
  textoOrdenActual: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  accionesSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pildoraRecarga: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.heroBorder,
  },
  textoRecarga: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  botonRecarga: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.heroBorder,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Cabecera y confirmación dentro de ActionSheet
  resumenCarro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resumenMiniatura: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resumenTextos: {
    flex: 1,
    gap: 2,
  },
  resumenTipo: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  resumenPrecioPildora: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resumenPrecioTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  confirmacionContenedor: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  avisoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  confirmacionBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonModalWrapper: {
    flex: 1,
  },
  botonModalSecundario: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonModalPeligro: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaBotonPeligro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  textoModalSecundario: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  textoModalPeligro: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onInk,
  },
});
