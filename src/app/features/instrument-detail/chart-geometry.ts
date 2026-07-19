export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartTick {
  position: number;
  label: string;
}

export const CHART = { width: 800, height: 300, left: 92, right: 24, top: 24, bottom: 58 };

export function timeX(timestamp: string, from: string, to: string): number {
  const start = Date.parse(from);
  const end = Date.parse(to);
  const value = Date.parse(timestamp);
  const width = CHART.width - CHART.left - CHART.right;
  return end === start
    ? CHART.left + width / 2
    : CHART.left + ((value - start) / (end - start)) * width;
}

export function utcTicks(from: string, to: string, compact: boolean): ChartTick[] {
  const count = compact ? 2 : 4;
  const start = Date.parse(from);
  const end = Date.parse(to);
  return Array.from({ length: count }, (_, index) => {
    const fraction = index / (count - 1);
    const timestamp = new Date(start + (end - start) * fraction);
    const crossesDays = end - start >= 86_400_000;
    return {
      position: CHART.left + (CHART.width - CHART.left - CHART.right) * fraction,
      label: new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        ...(crossesDays ? { month: 'short', day: 'numeric' } : {}),
      }).format(timestamp),
    };
  });
}

export function contextualDomain(values: number[]): [number, number] {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const magnitude = Math.max(Math.abs(minimum), Math.abs(maximum), 1);
  const visualRange = Math.max(maximum - minimum, magnitude * 0.005, 1);
  const center = (minimum + maximum) / 2;
  return [center - visualRange * 0.6, center + visualRange * 0.6];
}

export function yPosition(value: number, minimum: number, maximum: number): number {
  const height = CHART.height - CHART.top - CHART.bottom;
  return CHART.top + ((maximum - value) / (maximum - minimum)) * height;
}
