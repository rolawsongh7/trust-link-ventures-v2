import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MiniLineChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export const MiniLineChart = ({ data, color = "hsl(var(--primary))", height = 32 }: MiniLineChartProps) => {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
