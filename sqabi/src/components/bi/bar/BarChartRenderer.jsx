import React from "react";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList,
  ComposedChart
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function BarChartRenderer({ data, config }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        Nenhum dado disponível
      </div>
    );
  }

  if (!config?.xAxis || !config?.values || config.values.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        Configure o Eixo X e pelo menos um Valor
      </div>
    );
  }

  // Extrair nome do campo do xAxis
  const xAxisField = typeof config.xAxis === 'string' ? config.xAxis : config.xAxis.name;

  // Processar dados: agrupar por categoria e agregar valores
  const grouped = {};
  
  data.forEach(record => {
    const category = record[xAxisField];
    if (!category) return;
    
    if (!grouped[category]) {
      grouped[category] = { name: String(category) };
      config.values.forEach(vf => {
        const fieldName = typeof vf === 'string' ? vf : vf.name;
        grouped[category][fieldName] = 0;
      });
    }
    
    // Somar valores
    config.values.forEach(vf => {
      const fieldName = typeof vf === 'string' ? vf : vf.name;
      const value = parseFloat(record[fieldName]) || 0;
      grouped[category][fieldName] += value;
    });
  });

  // Converter para array
  let chartData = Object.values(grouped);

  // Aplicar ordenação
  if (config.sortBy && config.sortBy !== 'none') {
    chartData.sort((a, b) => {
      const aVal = a[config.sortBy];
      const bVal = b[config.sortBy];
      
      if (aVal === undefined || bVal === undefined) return 0;
      
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return config.sortDirection === 'desc' ? -comparison : comparison;
    });
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        Nenhum dado para exibir
      </div>
    );
  }

  // Formatação de números
  const formatNumber = (value) => {
    if (value == null || isNaN(value)) return '0';
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatFullNumber = (value) => {
    if (value == null || isNaN(value)) return '0';
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 0
    }).format(value);
  };

  // Custom label para mostrar valores no topo das barras
  const CustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    
    if (!config.showDataLabels) return null;
    
    return (
      <text 
        x={x + width / 2} 
        y={y - 5} 
        fill="#64748b" 
        textAnchor="middle" 
        fontSize="11"
        fontWeight="600"
      >
        {formatNumber(value)}
      </text>
    );
  };

  // Decidir qual componente usar baseado se tem linhas ou não
  const ChartComponent = config.showLines ? ComposedChart : RechartsBarChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent 
        data={chartData}
        margin={{ top: 30, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="#e2e8f0" 
          vertical={config.showGridLines !== false}
          horizontal={config.showGridLines !== false}
        />
        
        <XAxis 
          dataKey="name"
          stroke="#64748b"
          tick={{ fill: '#475569', fontSize: 12 }}
          angle={config.xAxisAngle || -45}
          textAnchor="end"
          height={80}
        />
        
        <YAxis 
          stroke="#64748b"
          tick={{ fill: '#475569', fontSize: 12 }}
          tickFormatter={formatNumber}
        />
        
        <Tooltip 
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
          }}
          labelStyle={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '8px' }}
          itemStyle={{ color: '#fff', padding: '4px 0' }}
          formatter={(value) => formatFullNumber(value)}
          cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
        />
        
        {config.showLegend !== false && (
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
        )}
        
        {config.values.map((valueField, index) => {
          const fieldName = typeof valueField === 'string' ? valueField : valueField.name;
          const color = (typeof valueField === 'object' && valueField.color) || COLORS[index % COLORS.length];
          const displayType = (typeof valueField === 'object' && valueField.displayType) || 'bar';
          
          if (displayType === 'line') {
            return (
              <Line
                key={fieldName}
                type="monotone"
                dataKey={fieldName}
                stroke={color}
                strokeWidth={3}
                dot={{ fill: color, r: 5 }}
                activeDot={{ r: 7 }}
              >
                {config.showDataLabels && <LabelList content={CustomLabel} />}
              </Line>
            );
          }
          
          return (
            <Bar
              key={fieldName}
              dataKey={fieldName}
              fill={color}
              radius={[8, 8, 0, 0]}
              maxBarSize={config.maxBarSize || 80}
              stackId={config.stacked ? 'stack' : undefined}
            >
              {config.showDataLabels && <LabelList content={CustomLabel} />}
            </Bar>
          );
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}