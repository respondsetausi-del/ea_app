import React from 'react';
import Svg, { G, Line, Rect } from 'react-native-svg';

interface CandleLogoProps {
  size?: number;
  color?: string;
  coreColor?: string;
}

// Three candlesticks on a 64×64 grid: [wick x, wick top/bottom, body x/y/w/h]
const CANDLES = [
  { cx: 19.5, wickTop: 19, wickBottom: 53, bx: 15, by: 26, bw: 9, bh: 20 },
  { cx: 32, wickTop: 4, wickBottom: 60, bx: 27, by: 13.5, bw: 10, bh: 37 },
  { cx: 44.5, wickTop: 16, wickBottom: 52, bx: 40, by: 23, bw: 9, bh: 21.5 },
];

/**
 * EA NAPTUNE mark — three neon candlesticks.
 * Drawn in three passes (soft halo → bright body → pale core) so the strokes
 * read as lit-from-within neon on a dark tile, matching the brand artwork.
 */
export function CandleLogo({ size = 96, color = '#0A84FF', coreColor = '#DCEBFF' }: CandleLogoProps) {
  const layer = (stroke: string, sw: number, opacity: number) => (
    <G stroke={stroke} strokeWidth={sw} strokeOpacity={opacity} fill="none">
      {CANDLES.map((c, i) => (
        <React.Fragment key={i}>
          <Line x1={c.cx} y1={c.wickTop} x2={c.cx} y2={c.wickBottom} />
          <Rect x={c.bx} y={c.by} width={c.bw} height={c.bh} />
        </React.Fragment>
      ))}
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {layer(color, 5, 0.28)}
      {layer(color, 3, 1)}
      {layer(coreColor, 1.2, 1)}
    </Svg>
  );
}
