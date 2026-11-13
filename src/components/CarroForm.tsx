import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { eliminarImagenPorUrl, subirImagenCarro } from '../api/storage.service';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import {
  colors,
  EASE_OUT,
  ENTER_DOWN_FAST,
  ENTER_FADE,
  enterStagger,
  EXIT_FADE,
  EXIT_UP,
  LAYOUT_SPRING,
  radius,
  spacing,
  SPRING_SNAP,
  text,
  triggerHaptic,
} from '../theme';
import type { NuevoCarro } from '../types/carro';
import { PressableScale } from './PressableScale';
import { VerificarIMG } from './VerificarIMG';

type Props = {
  initialValues?: Partial<NuevoCarro>;
  submitLabel?: string;
  onSubmit: (values: NuevoCarro) => Promise<void> | void;
  onCancel?: () => void;
};

type Errores = Partial<Record<keyof NuevoCarro, string>>;
type CamposBase = Omit<NuevoCarro, 'imgURL'>;
type EstadoVerificacion = 'sin-imagen' | 'analizando' | 'nitida' | 'borrosa' | 'error';

const ANIO_MIN = 1900;
const ANIO_MAX = 2100;

/** Límites de texto alineados con el ancho de la tarjeta del catálogo. */
const LIMITE_MARCA = 60;
const LIMITE_TIPO = 60;
const LIMITE_PRECIO = 12;

/** Constructores de entrada escalonada en ámbito de módulo. */
const ENTER_CAMPO_0 = enterStagger(0);
const ENTER_CAMPO_1 = enterStagger(1);
const ENTER_CAMPO_2 = enterStagger(2);
const ENTER_CAMPO_3 = enterStagger(3);
const ENTER_CAMPO_4 = enterStagger(4);
const ENTER_ACCIONES = enterStagger(5);

function textoInicial(valor: number | string | undefined): string {
  if (valor === undefined || valor === null) return '';
  return String(valor);
}

export function CarroForm({ initialValues, submitLabel = 'Guardar', onSubmit, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const [tipo, setTipo] = useState(textoInicial(initialValues?.tipo));
  const [marca, setMarca] = useState(textoInicial(initialValues?.marca));
  const [precio, setPrecio] = useState(textoInicial(initialValues?.precio));
  const [anio, setAnio] = useState(textoInicial(initialValues?.anio));

  // Imagen: `imagenLocal` es la recién elegida (aún sin subir) y `imagenRemota`
  // la que ya estaba guardada en el bucket.
  const [imagenLocal, setImagenLocal] = useState<string | null>(null);
  const [imagenLocalMime, setImagenLocalMime] = useState<string | null>(null);
  const [imagenRemota] = useState<string | null>(initialValues?.imgURL ?? null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [verificacion, setVerificacion] = useState<EstadoVerificacion>('sin-imagen');

  const [errores, setErrores] = useState<Errores>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Sacudida horizontal en el UI thread cuando falla la validación o el envío.
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.get() }],
  }));

  function dispararSacudidaError() {
    triggerHaptic('error');
    if (reducedMotion) return;
    shakeX.set(
      withSequence(
        withTiming(-7, { duration: 55, easing: EASE_OUT }),
        withTiming(7, { duration: 55, easing: EASE_OUT }),
        withTiming(-4, { duration: 50, easing: EASE_OUT }),
        withSpring(0, SPRING_SNAP),
      ),
    );
  }

  // Desplazamiento del formulario: se guarda la posición de cada campo para
  // poder subirlo por encima del teclado al enfocarlo.
  const scroll = useRef<ScrollView>(null);
  const posiciones = useRef<Record<string, number>>({});
  const alturaTeclado = useKeyboardHeight();
  const [campoEnfocado, setCampoEnfocado] = useState<string | null>(null);

  function desplazarAlCampo(clave: string) {
    // El precio es el último campo: se ancla al fondo para que también se vean
    // los botones de Cancelar / Guardar por encima del teclado.
    if (clave === 'precio') {
      scroll.current?.scrollToEnd({ animated: true });
      return;
    }

    const y = posiciones.current[clave];
    if (y === undefined) return;
    scroll.current?.scrollTo({ y: Math.max(0, y - 96), animated: true });
  }

  function enfocarCampo(clave: string) {
    setCampoEnfocado(clave);
    desplazarAlCampo(clave);
  }

  // El espacio reservado al teclado se aplica después del foco: al cambiar la
  // altura se vuelve a desplazar para que el campo quede visible.
  useEffect(() => {
    if (!campoEnfocado || alturaTeclado === 0) return;

    const id = setTimeout(() => desplazarAlCampo(campoEnfocado), 80);
    return () => clearTimeout(id);
  }, [alturaTeclado, campoEnfocado]);

  const imagenVisible = imagenLocal ?? (quitarImagen ? null : imagenRemota);
  const ocupado = enviando || procesandoImagen;

  function validar(): { valores?: CamposBase; errores: Errores } {
    const nuevosErrores: Errores = {};

    const tipoLimpio = tipo.trim();
    const marcaLimpia = marca.trim();
    const precioLimpio = precio.trim().replace(',', '.');
    const anioLimpio = anio.trim();

    if (!tipoLimpio) nuevosErrores.tipo = 'El tipo es obligatorio.';
    if (!marcaLimpia) nuevosErrores.marca = 'La marca es obligatoria.';

    if (!precioLimpio) {
      nuevosErrores.precio = 'El precio es obligatorio.';
    } else {
      const precioNumero = Number(precioLimpio);
      if (!Number.isFinite(precioNumero) || precioNumero < 0) {
        nuevosErrores.precio = 'Ingresa un precio numérico válido.';
      }
    }

    if (!anioLimpio) {
      nuevosErrores.anio = 'El año es obligatorio.';
    } else {
      const anioNumero = Number(anioLimpio);
      if (!Number.isInteger(anioNumero) || anioNumero < ANIO_MIN || anioNumero > ANIO_MAX) {
        nuevosErrores.anio = `Ingresa un año entre ${ANIO_MIN} y ${ANIO_MAX}.`;
      }
    }

    if (Object.keys(nuevosErrores).length > 0) {
      return { errores: nuevosErrores };
    }

    return {
      errores: {},
      valores: {
        tipo: tipoLimpio,
        marca: marcaLimpia,
        precio: Number(precioLimpio),
        anio: Number(anioLimpio),
      },
    };
  }

  function aplicarSeleccion(asset: ImagePicker.ImagePickerAsset) {
    setImagenLocal(asset.uri);
    setImagenLocalMime(asset.mimeType ?? null);
    setQuitarImagen(false);
    setVerificacion('analizando');
  }

  async function elegirDesdeGaleria() {
    if (ocupado) return;

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      triggerHaptic('warning');
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para elegir una imagen.');
      return;
    }

    setProcesandoImagen(true);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!resultado.canceled) aplicarSeleccion(resultado.assets[0]);
    } catch (e) {
      triggerHaptic('error');
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo abrir la galería.');
    } finally {
      setProcesandoImagen(false);
    }
  }

  async function tomarFoto() {
    if (ocupado) return;

    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      triggerHaptic('warning');
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar una foto.');
      return;
    }

    setProcesandoImagen(true);
    try {
      const resultado = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!resultado.canceled) aplicarSeleccion(resultado.assets[0]);
    } catch (e) {
      triggerHaptic('error');
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo abrir la cámara.');
    } finally {
      setProcesandoImagen(false);
    }
  }

  function quitar() {
    setImagenLocal(null);
    setImagenLocalMime(null);
    setQuitarImagen(true);
    setVerificacion('sin-imagen');
  }

  async function manejarEnvio() {
    if (ocupado) return;

    const { valores, errores: erroresValidacion } = validar();
    setErrores(erroresValidacion);
    setErrorEnvio(null);

    if (!valores) {
      dispararSacudidaError();
      return;
    }

    // La subida al bucket se bloquea si la imagen no pasó la verificación.
    if (imagenLocal) {
      if (verificacion === 'analizando') {
        setErrorEnvio('Espera a que termine la verificación de la imagen.');
        dispararSacudidaError();
        return;
      }
      if (verificacion === 'borrosa') {
        setErrorEnvio('La imagen está borrosa: toma o elige otra para poder guardar.');
        dispararSacudidaError();
        return;
      }
    }

    let urlSubida: string | null = null;
    setEnviando(true);

    try {
      let imgURL: string | null;

      if (imagenLocal) {
        urlSubida = await subirImagenCarro(imagenLocal, imagenLocalMime);
        imgURL = urlSubida;
      } else if (quitarImagen) {
        imgURL = null;
      } else {
        imgURL = imagenRemota;
      }

      await onSubmit({ ...valores, imgURL });
    } catch (e) {
      // Si la imagen se subió pero el guardado falló, se evita dejarla huérfana.
      if (urlSubida) {
        void eliminarImagenPorUrl(urlSubida).catch(() => undefined);
      }
      setErrorEnvio(e instanceof Error ? e.message : 'No se pudo guardar el carro.');
      dispararSacudidaError();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.contenido,
          { paddingBottom: 16 + alturaTeclado + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={process.env.EXPO_OS === 'ios' ? 'interactive' : 'on-drag'}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={ENTER_CAMPO_0} style={styles.campo}>
          <Text style={text.label}>Imagen del carro</Text>

          {imagenLocal ? (
            <VerificarIMG
              uri={imagenLocal}
              onResultado={(resultado) =>
                setVerificacion(resultado.esBorrosa ? 'borrosa' : 'nitida')
              }
              onError={() => setVerificacion('error')}
            />
          ) : (
            <View style={styles.imagenContenedor}>
              {imagenVisible ? (
                <Image
                  source={{ uri: imagenVisible }}
                  style={styles.imagen}
                  contentFit="cover"
                  transition={180}
                />
              ) : (
                <View style={styles.imagenVacia}>
                  <Text style={styles.textoImagenVacia}>Sin imagen</Text>
                </View>
              )}

              {procesandoImagen ? (
                <Animated.View
                  entering={ENTER_FADE}
                  exiting={EXIT_FADE}
                  style={styles.cargandoImagen}
                >
                  <ActivityIndicator color={colors.inkMuted} />
                </Animated.View>
              ) : null}
            </View>
          )}

          <Animated.View layout={LAYOUT_SPRING} style={styles.accionesImagen}>
            <PressableScale
              accessibilityRole="button"
              onPress={() => void elegirDesdeGaleria()}
              disabled={ocupado}
              haptic="selection"
              style={styles.botonImagenWrapper}
              contentStyle={styles.botonImagen}
            >
              <Text style={styles.textoBotonImagen}>Galería</Text>
            </PressableScale>

            <PressableScale
              accessibilityRole="button"
              onPress={() => void tomarFoto()}
              disabled={ocupado}
              haptic="selection"
              style={styles.botonImagenWrapper}
              contentStyle={styles.botonImagen}
            >
              <Text style={styles.textoBotonImagen}>Cámara</Text>
            </PressableScale>

            {imagenVisible ? (
              <Animated.View
                entering={ENTER_FADE}
                exiting={EXIT_FADE}
                style={styles.botonImagenWrapper}
              >
                <PressableScale
                  accessibilityRole="button"
                  onPress={quitar}
                  disabled={ocupado}
                  haptic="medium"
                  contentStyle={[styles.botonImagen, styles.botonQuitar]}
                >
                  <Text style={styles.textoQuitar}>Quitar</Text>
                </PressableScale>
              </Animated.View>
            ) : null}
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={ENTER_CAMPO_1}
          style={styles.campo}
          onLayout={(evento: LayoutChangeEvent) => {
            posiciones.current.marca = evento.nativeEvent.layout.y;
          }}
        >
          <Text style={text.label}>Marca</Text>
          <TextInput
            value={marca}
            onChangeText={setMarca}
            onFocus={() => enfocarCampo('marca')}
            onBlur={() => setCampoEnfocado(null)}
            placeholder="Ej. Toyota"
            placeholderTextColor={colors.inkSubtle}
            selectionColor={colors.ink}
            autoCapitalize="words"
            maxLength={LIMITE_MARCA}
            style={[
              text.input,
              styles.input,
              campoEnfocado === 'marca' && styles.inputEnfocado,
              errores.marca && styles.inputError,
            ]}
            editable={!ocupado}
          />
          {errores.marca ? (
            <Animated.Text
              entering={ENTER_DOWN_FAST}
              exiting={EXIT_UP}
              style={text.errorText}
              accessibilityLiveRegion="polite"
            >
              {errores.marca}
            </Animated.Text>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={ENTER_CAMPO_2}
          style={styles.campo}
          onLayout={(evento: LayoutChangeEvent) => {
            posiciones.current.tipo = evento.nativeEvent.layout.y;
          }}
        >
          <Text style={text.label}>Tipo</Text>
          <TextInput
            value={tipo}
            onChangeText={setTipo}
            onFocus={() => enfocarCampo('tipo')}
            onBlur={() => setCampoEnfocado(null)}
            placeholder="Ej. Sedán"
            placeholderTextColor={colors.inkSubtle}
            selectionColor={colors.ink}
            autoCapitalize="sentences"
            maxLength={LIMITE_TIPO}
            style={[
              text.input,
              styles.input,
              campoEnfocado === 'tipo' && styles.inputEnfocado,
              errores.tipo && styles.inputError,
            ]}
            editable={!ocupado}
          />
          {errores.tipo ? (
            <Animated.Text
              entering={ENTER_DOWN_FAST}
              exiting={EXIT_UP}
              style={text.errorText}
              accessibilityLiveRegion="polite"
            >
              {errores.tipo}
            </Animated.Text>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={ENTER_CAMPO_3}
          style={styles.campo}
          onLayout={(evento: LayoutChangeEvent) => {
            posiciones.current.anio = evento.nativeEvent.layout.y;
          }}
        >
          <Text style={text.label}>Año</Text>
          <TextInput
            value={anio}
            onChangeText={setAnio}
            onFocus={() => enfocarCampo('anio')}
            onBlur={() => setCampoEnfocado(null)}
            placeholder="Ej. 2024"
            placeholderTextColor={colors.inkSubtle}
            selectionColor={colors.ink}
            keyboardType="number-pad"
            maxLength={4}
            style={[
              text.input,
              styles.input,
              campoEnfocado === 'anio' && styles.inputEnfocado,
              errores.anio && styles.inputError,
            ]}
            editable={!ocupado}
          />
          {errores.anio ? (
            <Animated.Text
              entering={ENTER_DOWN_FAST}
              exiting={EXIT_UP}
              style={text.errorText}
              accessibilityLiveRegion="polite"
            >
              {errores.anio}
            </Animated.Text>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={ENTER_CAMPO_4}
          style={styles.campo}
          onLayout={(evento: LayoutChangeEvent) => {
            posiciones.current.precio = evento.nativeEvent.layout.y;
          }}
        >
          <Text style={text.label}>Precio</Text>
          <TextInput
            value={precio}
            onChangeText={setPrecio}
            onFocus={() => enfocarCampo('precio')}
            onBlur={() => setCampoEnfocado(null)}
            placeholder="Ej. 25000.00"
            placeholderTextColor={colors.inkSubtle}
            selectionColor={colors.ink}
            keyboardType="decimal-pad"
            maxLength={LIMITE_PRECIO}
            style={[
              text.input,
              styles.input,
              campoEnfocado === 'precio' && styles.inputEnfocado,
              errores.precio && styles.inputError,
            ]}
            editable={!ocupado}
          />
          {errores.precio ? (
            <Animated.Text
              entering={ENTER_DOWN_FAST}
              exiting={EXIT_UP}
              style={text.errorText}
              accessibilityLiveRegion="polite"
            >
              {errores.precio}
            </Animated.Text>
          ) : null}
        </Animated.View>

        {errorEnvio ? (
          <Animated.Text
            entering={ENTER_DOWN_FAST}
            exiting={EXIT_UP}
            style={styles.errorEnvio}
            accessibilityLiveRegion="assertive"
            selectable
          >
            {errorEnvio}
          </Animated.Text>
        ) : null}

        <Animated.View entering={ENTER_ACCIONES}>
          <Animated.View style={[styles.acciones, shakeStyle]}>
            {onCancel ? (
              <PressableScale
                accessibilityRole="button"
                onPress={onCancel}
                disabled={ocupado}
                haptic="selection"
                style={styles.botonWrapper}
                contentStyle={[styles.boton, styles.botonSecundario]}
              >
                <Text style={styles.textoSecundario}>Cancelar</Text>
              </PressableScale>
            ) : null}

            <PressableScale
              accessibilityRole="button"
              onPress={() => void manejarEnvio()}
              disabled={ocupado}
              accessibilityState={{ disabled: ocupado, busy: enviando }}
              haptic="light"
              style={styles.botonWrapper}
              contentStyle={[styles.boton, styles.botonPrimario]}
            >
              <View style={styles.filaPrimario}>
                {enviando ? <ActivityIndicator size="small" color={colors.onInk} /> : null}
                <Text style={styles.textoPrimario}>
                  {enviando ? 'Guardando...' : submitLabel}
                </Text>
              </View>
            </PressableScale>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  campo: {
    gap: spacing.xs + 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  inputEnfocado: {
    borderColor: colors.ink,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorEnvio: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: spacing.md,
  },
  imagenContenedor: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceMuted,
  },
  imagenVacia: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  textoImagenVacia: {
    color: colors.inkMuted,
    fontSize: 14,
  },
  cargandoImagen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  accionesImagen: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonImagenWrapper: {
    flex: 1,
  },
  botonImagen: {
    minHeight: 44,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonQuitar: {
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSoft,
  },
  textoBotonImagen: {
    color: colors.inkSoft,
    fontWeight: '600',
    fontSize: 15,
  },
  textoQuitar: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 15,
  },
  acciones: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  botonWrapper: {
    flex: 1,
  },
  boton: {
    minHeight: 50,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  botonPrimario: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  botonSecundario: {
    backgroundColor: colors.surface,
    borderColor: colors.fieldBorder,
  },
  filaPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  textoPrimario: {
    color: colors.onInk,
    fontWeight: '600',
    fontSize: 16,
  },
  textoSecundario: {
    color: colors.inkSoft,
    fontWeight: '600',
    fontSize: 16,
  },
});
