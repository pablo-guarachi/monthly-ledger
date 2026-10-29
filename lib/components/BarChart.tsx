import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { Txt } from './Txt';
import { useTheme } from '@/lib/theme/ThemeContext';
import { fonts, space } from '@/lib/theme/tokens';

export type Bar = { label: string; value: number; muted?: boolean; highlight?: boolean };

type Props = {
  bars: Bar[];
  height?: number;
  /** formats the value for the top label of the highlighted bar(s), the average and the a11y summary */
  format: (v: number) => string;
  /** words for the legend: solid vs faded bars */
  legend?: { solid: string; muted: string };
};

/**
 * Minimal vertical bar chart (react-native-svg).
 * Solid bars = recorded, outlined dashed bars = projected, filled accent = highlighted (current) bar.
 * Projected bars are outlined rather than just paler so the difference survives low contrast screens.
 */
export function BarChart({ bars, height = 170, format, legend }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const max = Math.max(1, ...bars.map((b) => b.value));
  const padTop = 24;
  const padBottom = 22;
  const chartH = height - padTop - padBottom;
  const n = bars.length || 1;
  const slot = width / n;
  const barW = Math.max(8, Math.min(22, slot * 0.62));
  const avg = bars.length ? bars.reduce((s, b) => s + b.value, 0) / bars.length : 0;
  const avgY = padTop + chartH - (avg / max) * chartH;
  const hi = bars.find((b) => b.highlight);
  const summary = bars.length
    ? `Bar chart, ${bars.length} months. Average ${format(avg)}.${hi ? ` Current month ${format(hi.value)}.` : ''} Highest ${format(max)}.`
    : 'No data';

  return (
    <View style={{ gap: space.sm }}>
      <View onLayout={onLayout} style={{ width: '100%', height }} accessible accessibilityRole="image" accessibilityLabel={summary}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={padTop + chartH} y2={padTop + chartH} stroke={t.border} strokeWidth={1} />
            {avg > 0 ? (
              <Line x1={0} x2={width} y1={avgY} y2={avgY} stroke={t.muted} strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />
            ) : null}
            {bars.map((b, i) => {
              const h = Math.max((b.value / max) * chartH, 2);
              const x = i * slot + (slot - barW) / 2;
              const y = padTop + chartH - h;
              const projected = !!b.muted && !b.highlight;
              const fill = b.highlight ? t.accent : projected ? 'transparent' : t.ink2;
              return (
                <G key={`${b.label}-${i}`}>
                  <Rect
                    x={projected ? x + 0.75 : x}
                    y={projected ? y + 0.75 : y}
                    width={projected ? barW - 1.5 : barW}
                    height={projected ? Math.max(h - 1.5, 1) : h}
                    rx={4}
                    fill={fill}
                    opacity={!b.highlight && !projected ? 0.55 : 1}
                    stroke={projected ? t.muted : undefined}
                    strokeWidth={projected ? 1.5 : 0}
                    strokeDasharray={projected ? '3 3' : undefined}
                  />
                  {b.highlight ? (
                    <SvgText
                      // the current month is usually the last bar: right-align its label so it is never clipped
                      x={i === n - 1 ? width - 1 : x + barW / 2}
                      y={y - 8}
                      fontSize={11}
                      fontFamily={fonts.monoBold}
                      fill={t.ink}
                      textAnchor={i === n - 1 ? 'end' : 'middle'}
                    >
                      {format(b.value)}
                    </SvgText>
                  ) : null}
                  <SvgText
                    x={x + barW / 2}
                    y={height - 6}
                    fontSize={10}
                    fontFamily={b.highlight ? fonts.bold : fonts.medium}
                    fill={b.highlight ? t.ink : t.muted}
                    textAnchor="middle"
                  >
                    {b.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs }} importantForAccessibility="no-hide-descendants">
        <LegendSwatch kind="solid" label={legend?.solid ?? 'Recorded'} />
        <LegendSwatch kind="muted" label={legend?.muted ?? 'Projected'} />
        {avg > 0 ? <LegendSwatch kind="avg" label={`Average ${format(avg)}`} /> : null}
      </View>
    </View>
  );
}

function LegendSwatch({ kind, label }: { kind: 'solid' | 'muted' | 'avg'; label: string }) {
  const t = useTheme();
  const swatch =
    kind === 'avg' ? (
      <View style={{ width: 14, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: t.muted }} />
    ) : (
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          backgroundColor: kind === 'solid' ? t.ink2 : 'transparent',
          opacity: kind === 'solid' ? 0.55 : 1,
          borderWidth: kind === 'muted' ? 1.5 : 0,
          borderStyle: 'dashed',
          borderColor: t.muted,
        }}
      />
    );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {swatch}
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
    </View>
  );
}
