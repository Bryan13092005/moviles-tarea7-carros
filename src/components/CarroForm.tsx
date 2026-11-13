import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { eliminarImagenPorUrl, subirImagenCarro } from '../api/storage.service';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import type { NuevoCarro } from '../types/carro';
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

function textoInicial(valor: number | string | undefined): string {
  if (valor === undefined || valor === null) return '';
  return String(valor);
}

export function CarroForm({ initialValues, submitLabel = 'Guardar', onSubmit, onCancel }: Props) {
  const [tipo, setTipo] = useState(textoInicial(initialValues?.tipo));
  const [marca, setMarca] = useState(textoInicial(initialValues?.marca));
  const [precio, setPrecio] = useState(textoInicial(initialValues?.precio));
  const [anio, setAnio] = useState(textoInicial(initialValues?.anio));

  // Imagen: `imagenLocal` es la recién elegida (aún sin subir) y `imagenRemota`
  // la que ya estaba guardada en el bucket.
  const [imagenLocal, setImagenLocal] = useState<string | null>(null);
  const [imagenLocalMime, setImagenLocalMime] = useState<string | null>(null);
  const [imagenRemota, setImagenRemota] = useState<string | null>(initialValues?.imgURL ?? null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [verificacion, setVerificacion] = useState<EstadoVerificacion>('sin-imagen');

  const [errores, setErrores] = useState<Errores>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
    console.log('Imagen seleccionada:', asset.uri);
    setImagenLocalMime(asset.mimeType ?? null);
    console.log('Mime type de la imagen:', asset.mimeType);
    setQuitarImagen(false);
    setVerificacion('analizando');
  }

  async function elegirDesdeGaleria() {
    if (ocupado) return;

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
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
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo abrir la galería.');
    } finally {
      setProcesandoImagen(false);
    }
  }

  async function tomarFoto() {
    if (ocupado) return;

    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
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

    if (!valores) return;

    // La subida al bucket se bloquea si la imagen no pasó la verificación.
    if (imagenLocal) {
      if (verificacion === 'analizando') {
        setErrorEnvio('Espera a que termine la verificación de la imagen.');
        return;
      }
      if (verificacion === 'borrosa') {
        setErrorEnvio('La imagen está borrosa: toma o elige otra para poder guardar.');
        return;
      }
    }

    let urlSubida: string | null = null;
    setEnviando(true);

    try {
      let imgURL: string | null;

      if (imagenLocal) {
        urlSubida = await subirImagenCarro(imagenLocal, imagenLocalMime);
        console.log('Imagen para subida:', urlSubida);
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
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.contenido, { paddingBottom: 16 + alturaTeclado }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.campo}>
          <Text style={styles.label}>Imagen del carro</Text>

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
                <Image source={{ uri: imagenVisible }} style={styles.imagen} contentFit="cover" />
              ) : (
                <View style={styles.imagenVacia}>
                  <Text style={styles.textoImagenVacia}>Sin imagen</Text>
                </View>
              )}

              {procesandoImagen ? (
                <View style={styles.cargandoImagen}>
                  <ActivityIndicator />
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.accionesImagen}>
            <Pressable
              accessibilityRole="button"
              onPress={elegirDesdeGaleria}
              disabled={ocupado}
              style={({ pressed }) => [
                styles.botonImagen,
                (pressed || ocupado) && styles.pressed,
              ]}
            >
              <Text style={styles.textoBotonImagen}>Galería</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={tomarFoto}
              disabled={ocupado}
              style={({ pressed }) => [
                styles.botonImagen,
                (pressed || ocupado) && styles.pressed,
              ]}
            >
              <Text style={styles.textoBotonImagen}>Cámara</Text>
            </Pressable>

            {imagenVisible ? (
              <Pressable
                accessibilityRole="button"
                onPress={quitar}
                disabled={ocupado}
                style={({ pressed }) => [
                  styles.botonImagen,
                  styles.botonQuitar,
                  (pressed || ocupado) && styles.pressed,
                ]}
              >
                <Text style={styles.textoQuitar}>Quitar</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View
          style={styles.campo}
          onLayout={(evento: LayoutChangeEvent) => {
            posiciones.current.marca = evento.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.label}>Marca</Text>
          <TextInput
            value={marca}
            onChangeText={setMarca}
            onFocus={() => enfocarCampo('marca')}
            placeholder="Ej. Toyota"
            autoCapitalize="words"
            style={[styles.input, errores.marca && styles.inputError]}
            editable={!ocupado}
          />
          {errores.marca ? <Text style={styles.error}>{errores.marca}</Text> : null}
        </View>

        <View
          style={styles.campo}
          onLayout={(evento: LayoutChangeEvent) => {
            posiciones.current.tipo = evento.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.label}>Tipo</Text>
          <TextInput
            value={tipo}
            onChangeText={setTipo}
            onFocus={() => enfocarCampo('tipo')}
            placeholder="Ej. Sedán"
            autoCapitalize="sentences"
            style={[styles.input, errores.tipo && styles.inputError]}
            editable={!ocupado}
          />
          {errores.tipo ? <Text style={styles.error}>{errores.tipo}</Text> : null}
        </View>

        <View
          style={styles.campo}
          onLayout={(evento: LayoutChangeEvent) => {
            posiciones.current.anio = evento.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.label}>Año</Text>
          <TextInput
            value={anio}
            onChangeText={setAnio}
            onFocus={() => enfocarCampo('anio')}
            placeholder="Ej. 2024"
            keyboardType="number-pad"
            maxLength={4}
            style={[styles.input, errores.anio && styles.inputError]}
            editable={!ocupado}
          />
          {errores.anio ? <Text style={styles.error}>{errores.anio}</Text> : null}
        </View>

        <View
          style={styles.campo}
          onLayout={(evento: LayoutChangeEvent) => {
            posiciones.current.precio = evento.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.label}>Precio</Text>
          <TextInput
            value={precio}
            onChangeText={setPrecio}
            onFocus={() => enfocarCampo('precio')}
            placeholder="Ej. 25000.00"
            keyboardType="decimal-pad"
            style={[styles.input, errores.precio && styles.inputError]}
            editable={!ocupado}
          />
          {errores.precio ? <Text style={styles.error}>{errores.precio}</Text> : null}
        </View>

        {errorEnvio ? <Text style={styles.errorEnvio}>{errorEnvio}</Text> : null}

        <View style={styles.acciones}>
          {onCancel ? (
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={ocupado}
              style={({ pressed }) => [
                styles.boton,
                styles.botonSecundario,
                (pressed || ocupado) && styles.pressed,
              ]}
            >
              <Text style={styles.textoSecundario}>Cancelar</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={manejarEnvio}
            disabled={ocupado}
            style={({ pressed }) => [
              styles.boton,
              styles.botonPrimario,
              (pressed || ocupado) && styles.pressed,
            ]}
          >
            <Text style={styles.textoPrimario}>
              {enviando ? 'Guardando...' : submitLabel}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  contenido: {
    padding: 16,
    gap: 14,
  },
  campo: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111111',
  },
  inputError: {
    borderColor: '#d1242f',
  },
  error: {
    fontSize: 13,
    color: '#d1242f',
  },
  errorEnvio: {
    fontSize: 14,
    color: '#d1242f',
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: '#f2b8bd',
    borderRadius: 8,
    padding: 10,
  },
  imagenContenedor: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#eeeeee',
  },
  imagenVacia: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
  },
  textoImagenVacia: {
    color: '#777777',
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  accionesImagen: {
    flexDirection: 'row',
    gap: 8,
  },
  botonImagen: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c4c4c4',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  botonQuitar: {
    borderColor: '#d1242f',
    backgroundColor: '#fff0f0',
  },
  textoBotonImagen: {
    color: '#333333',
    fontWeight: '600',
  },
  textoQuitar: {
    color: '#d1242f',
    fontWeight: '600',
  },
  acciones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  boton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  botonPrimario: {
    backgroundColor: '#1f6feb',
    borderColor: '#1f6feb',
  },
  botonSecundario: {
    backgroundColor: '#ffffff',
    borderColor: '#c4c4c4',
  },
  textoPrimario: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  textoSecundario: {
    color: '#333333',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.6,
  },
});
