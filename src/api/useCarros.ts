import { useCallback, useEffect, useRef, useState } from 'react';

import { carrosService } from './supabase.service';
import type { ActualizarCarro, Carro, NuevoCarro } from '../types/carro';

type OpcionesUseCarros = {
  /** Si es `false`, el hook no dispara la carga inicial (útil en pantallas de formulario). */
  autoLoad?: boolean;
};

type ModoCarga = 'inicial' | 'refresco';

function mensajeDeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

export function useCarros({ autoLoad = true }: OpcionesUseCarros = {}) {
  const [carros, setCarros] = useState<Carro[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evita actualizar estado si el componente ya se desmontó.
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async (modo: ModoCarga = 'inicial') => {
    if (modo === 'inicial') setLoading(true);
    else setRefreshing(true);

    setError(null);

    try {
      const data = await carrosService.getAll();
      if (montado.current) setCarros(data);
    } catch (e) {
      if (montado.current) setError(mensajeDeError(e));
    } finally {
      if (montado.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    // La carga inicial es un fetch on-mount intencional; el setState diferido
    // que exige la regla no aporta nada aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (autoLoad) void cargar('inicial');
  }, [autoLoad, cargar]);

  /** Recarga mostrando el indicador de carga principal. */
  const refetch = useCallback(() => cargar('inicial'), [cargar]);

  /** Recarga en segundo plano (pull-to-refresh o al volver a la pantalla). */
  const refrescar = useCallback(() => cargar('refresco'), [cargar]);

  const crearCarro = useCallback(async (nuevo: NuevoCarro): Promise<Carro> => {
    try {
      const creado = await carrosService.create(nuevo);
      setCarros((prev) => [creado, ...prev]);
      setError(null);
      return creado;
    } catch (e) {
      setError(mensajeDeError(e));
      throw e;
    }
  }, []);

  const actualizarCarro = useCallback(
    async (id: number, cambios: ActualizarCarro): Promise<Carro> => {
      try {
        const actualizado = await carrosService.update(id, cambios);
        setCarros((prev) =>
          prev.map((carro) => (carro.id === id ? actualizado : carro)),
        );
        setError(null);
        return actualizado;
      } catch (e) {
        setError(mensajeDeError(e));
        throw e;
      }
    },
    [],
  );

  const eliminarCarro = useCallback(async (id: number): Promise<void> => {
    try {
      await carrosService.remove(id);
      setCarros((prev) => prev.filter((carro) => carro.id !== id));
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
      throw e;
    }
  }, []);

  return {
    carros,
    loading,
    refreshing,
    error,
    refetch,
    refrescar,
    crearCarro,
    actualizarCarro,
    eliminarCarro,
  };
}
