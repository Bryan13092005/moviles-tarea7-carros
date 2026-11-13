import { useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { CarroCard } from '../../components/CarroCard';
import { colors, radius, spacing, text } from '../../theme';
import type { Carro } from '../../types/carro';

/**
 * Ruta de desarrollo (no enlazada en la app). Regresión visual de `break-ui`:
 * alterna el catálogo entre datos amables y el peor caso realista para
 * comprobar nombres largos, cifras grandes, campos vacíos y listas enormes.
 *
 * Abre `/dev/break` en el navegador o en un build de desarrollo.
 */

const DEMO: Carro[] = [
  { id: 1, marca: 'Toyota', tipo: 'Sedán', precio: 128900, anio: 2026, imgURL: null },
  { id: 2, marca: 'BMW', tipo: 'Coupé', precio: 245000, anio: 2024, imgURL: null },
  { id: 3, marca: 'Chevrolet', tipo: 'Pickup', precio: 189000, anio: 2025, imgURL: null },
];

const PEOR: Carro[] = [
  {
    id: 1,
    marca: 'Aleksandra Wiśniewska-Kowalczyk',
    tipo: 'Christopher Alexander Montgomery III',
    precio: 12345678.9,
    anio: 2026,
    imgURL: null,
  },
  {
    id: 2,
    marca: 'Konstantin Oberhauser-Wettstein',
    tipo: 'Ólafur Darri Ólafsson',
    precio: 0,
    anio: 1900,
    imgURL: null,
  },
  { id: 3, marca: '王秀英', tipo: 'Đặng Thị Ngọc Hân', precio: 1, anio: 2024, imgURL: null },
  {
    id: 4,
    marca: 'Jo',
    tipo: 'dana',
    precio: 999999999,
    anio: 2025,
    imgURL: 'https://example.com/no-existe.jpg',
  },
  { id: 5, marca: '', tipo: '', precio: Number.NaN, anio: 0, imgURL: null },
  {
    id: 6,
    marca: 'María José de la Cruz y Fernández',
    tipo: 'Camioneta Pick-Up 4x4 Doble Cabina',
    precio: 12345678.9,
    anio: 2023,
    imgURL: null,
  },
];

const UNO: Carro[] = [DEMO[0]];

const MUCHOS: Carro[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  marca: `Marca ${i + 1}`,
  tipo: `Modelo ${i + 1}`,
  precio: 100000 + i,
  anio: 2000 + (i % 26),
  imgURL: null,
}));

const ESTADOS = [
  { clave: 'demo', etiqueta: 'Demo', datos: DEMO },
  { clave: 'peor', etiqueta: 'Peor caso', datos: PEOR },
  { clave: 'uno', etiqueta: 'Uno', datos: UNO },
  { clave: 'vacio', etiqueta: 'Vacío', datos: [] as Carro[] },
  { clave: 'muchos', etiqueta: '1.000', datos: MUCHOS },
] as const;

export default function BreakScreen() {
  const { width } = useWindowDimensions();
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]['clave']>('demo');

  const ancho = Math.max(120, (width - spacing.lg * 2 - spacing.md) / 2);
  const actual = ESTADOS.find((e) => e.clave === estado) ?? ESTADOS[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={actual.datos}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, marginBottom: spacing.md }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => <CarroCard carro={item} ancho={ancho} onEditar={() => {}} onAcciones={() => {}} />}
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, gap: spacing.sm }}>
            <Text style={text.sectionTitle}>Sin vehículos</Text>
            <Text style={text.body}>Este es el estado vacío del catálogo.</Text>
          </View>
        }
      />

      <View style={styles.toggle}>
        {ESTADOS.map((e) => {
          const activo = e.clave === estado;
          return (
            <Pressable
              key={e.clave}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              onPress={() => setEstado(e.clave)}
              style={[styles.segmento, activo && styles.segmentoActivo]}
            >
              <Text style={[styles.textoSegmento, activo && styles.textoSegmentoActivo]}>
                {e.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = {
  toggle: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 28,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 2,
    padding: 3,
    marginHorizontal: 24,
    borderRadius: radius.full,
    backgroundColor: '#D9DBD6',
  },
  segmento: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    minHeight: 36,
    justifyContent: 'center' as const,
  },
  segmentoActivo: {
    backgroundColor: '#FFFFFF',
  },
  textoSegmento: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#41443F',
  },
  textoSegmentoActivo: {
    color: '#101010',
  },
};