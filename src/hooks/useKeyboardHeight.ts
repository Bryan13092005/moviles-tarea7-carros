import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura actual del teclado en puntos (0 cuando está oculto).
 *
 * Se usa en lugar de `KeyboardAvoidingView` porque con edge-to-edge en Android
 * la ventana ya no se redimensiona y ese componente calcula un solapamiento de
 * cero, así que el contenido queda debajo del teclado.
 */
export function useKeyboardHeight(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    const eventoMostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const eventoOcultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const alMostrar = Keyboard.addListener(eventoMostrar, (evento) => {
      setAltura(evento.endCoordinates.height);
    });
    const alOcultar = Keyboard.addListener(eventoOcultar, () => setAltura(0));

    return () => {
      alMostrar.remove();
      alOcultar.remove();
    };
  }, []);

  return altura;
}
