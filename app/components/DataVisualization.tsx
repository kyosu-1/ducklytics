// app/components/DataVisualization.tsx
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

interface DataVisualizationProps {
  data: {
    columns: string[];
    values: any[][];
  };
}

const DataVisualization: React.FC<DataVisualizationProps> = ({ data }) => {
  // データの型を分析
  const columnTypes = useMemo(() => {
    return data.columns.map((col, index) => {
      const values = data.values.map(row => row[index]);
      if (values.every(v => typeof v === 'number')) return 'number';
      if (values.every(v => !isNaN(Date.parse(v)))) return 'date';
      return 'string';
    });
  }, [data]);

  // 数値列のインデックスを取得
  const numericColumns = columnTypes
    .map((type, index) => type === 'number' ? index : -1)
    .filter(index => index !== -1);

  if (numericColumns.length === 0) {
    return <p>数値データが見つかりません。</p>;
  }

  // 最初の文字列列をラベルとして使用
  const labelColumnIndex = columnTypes.findIndex(type => type === 'string');
  const labels = labelColumnIndex !== -1 
    ? data.values.map(row => row[labelColumnIndex])
    : data.values.map((_, i) => `Row ${i + 1}`);

  // データセットの作成
  const datasets = numericColumns.map(colIndex => ({
    label: data.columns[colIndex],
    data: data.values.map(row => row[colIndex]),
    backgroundColor: `hsla(${(colIndex * 137) % 360}, 70%, 50%, 0.6)`,
    borderColor: `hsla(${(colIndex * 137) % 360}, 70%, 50%, 1)`,
  }));

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '数値データの可視化',
      },
    },
  };

  return (
    <div style={{ maxHeight: '500px' }}>
      <h2>データの可視化</h2>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default DataVisualization;
