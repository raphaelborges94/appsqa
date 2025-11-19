
import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// ✅ NOVA FUNÇÃO: Aplicar apelido (field alias) ao nome do campo
const getDisplayName = (fieldName, aliases = {}) => {
  return aliases[fieldName] || fieldName;
};

const formatNumber = (value, decimals = 0) => {
  if (value == null || isNaN(value)) return '-';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatPercent = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return '-';
  return `${value.toFixed(decimals)}%`;
};

// Função auxiliar para buscar valor de campo case-insensitive
const getFieldValue = (record, fieldName) => {
  if (!record || !fieldName) return null;

  // Tentar o nome exacto primeiro
  if (record[fieldName] !== undefined) {
    return record[fieldName];
  }

  // Tentar case-insensitive
  const fieldNameLower = fieldName.toLowerCase();
  const matchingKey = Object.keys(record).find(key => key.toLowerCase() === fieldNameLower);

  if (matchingKey) {
    return record[matchingKey];
  }

  return null;
};

// Função para interpolar cor entre duas cores
const interpolateColor = (color1, color2, factor) => {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;

  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Função para aplicar formatação condicional
const applyConditionalFormatting = (value, fieldName, fieldType, allValues, formatRules, rowKey, colKey, isRowHeader, isColHeader) => {
  if (!formatRules || formatRules.length === 0) return {};

  const applicableRules = formatRules.filter(rule => {
    if (!rule.enabled) return false;

    // Verificar se a regra se aplica ao tipo de campo (values, rows, columns)
    if (isRowHeader && rule.applyToTarget !== 'rows') return false;
    if (isColHeader && rule.applyToTarget !== 'columns') return false;
    if (!isRowHeader && !isColHeader && rule.applyToTarget !== 'values') return false;

    // Verificar se a regra se aplica ao campo específico
    if (rule.applyTo !== 'all' && rule.applyTo !== fieldName) return false;

    return true;
  });

  let cellStyles = {};
  let content = null;
  let rowStylesForThisCell = {}; // Styles that apply to the cell if a row-scoped rule is met
  let colStylesForThisCell = {}; // Styles that apply to the cell if a column-scoped rule is met

  applicableRules.forEach(rule => {
    let targetStyle = cellStyles;

    // Determine which style object to modify based on scope
    if (rule.scope === 'row') {
      targetStyle = rowStylesForThisCell;
    } else if (rule.scope === 'column') {
      targetStyle = colStylesForThisCell;
    }

    // Escala de cores (apenas para números)
    if (rule.formatType === 'colorScale' && fieldType === 'number') {
      const numericValues = allValues.filter(v => v != null && !isNaN(v));
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const range = max - min;

      if (range > 0 && value != null && !isNaN(value)) {
        const normalized = (parseFloat(value) - min) / range;

        let backgroundColor;
        if (rule.colorScaleType === '3color') {
          if (normalized <= 0.5) {
            backgroundColor = interpolateColor(rule.minColor, rule.midColor, normalized * 2);
          } else {
            backgroundColor = interpolateColor(rule.midColor, rule.maxColor, (normalized - 0.5) * 2);
          }
        } else {
          backgroundColor = interpolateColor(rule.minColor, rule.maxColor, normalized);
        }

        targetStyle.backgroundColor = backgroundColor;

        const rgb = parseInt(backgroundColor.slice(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        targetStyle.color = brightness > 128 ? '#000000' : '#ffffff';
      }
    }

    // Barras de dados (apenas para números e scope='cell')
    if (rule.formatType === 'dataBar' && fieldType === 'number' && rule.scope === 'cell') {
      const numericValues = allValues.filter(v => v != null && !isNaN(v));
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const range = max - min;

      if (range > 0 && value != null && !isNaN(value)) {
        const percentage = ((parseFloat(value) - min) / range) * 100;
        content = (
          <div className="relative h-full flex items-center">
            <div
              className="absolute inset-0 opacity-30 rounded"
              style={{
                width: `${percentage}%`,
                backgroundColor: rule.dataBarColor,
              }}
            />
            {rule.showValue && (
              <span className="relative z-10 px-1">{formatNumber(parseFloat(value), 0)}</span>
            )}
          </div>
        );
      }
    }

    // Conjunto de ícones (apenas para números e scope='cell')
    if (rule.formatType === 'iconSet' && fieldType === 'number' && rule.scope === 'cell') {
      const numericValues = allValues.filter(v => v != null && !isNaN(v)).map(v => parseFloat(v));
      const sortedValues = [...numericValues].sort((a, b) => a - b);
      const len = sortedValues.length;

      if (len > 0 && value != null && !isNaN(value)) {
        const numericValue = parseFloat(value);
        const index = sortedValues.indexOf(numericValue);
        const normalized = index / (len - 1 || 1);

        const iconSets = {
          arrows: ['↓', '→', '↑'],
          traffic: ['🔴', '🟡', '🟢'],
          flags: ['⚐', '🏳️', '🚩'],
          stars: ['☆', '⚝', '⭐'],
          circles: ['🔴', '🟡', '🟢'],
        };

        const icons = iconSets[rule.iconSet] || iconSets.arrows;
        let icon;
        if (normalized < 0.33) icon = icons[0];
        else if (normalized < 0.67) icon = icons[1];
        else icon = icons[2];

        content = (
          <div className="flex items-center gap-1">
            <span className="text-base">{icon}</span>
            {rule.showValue && <span>{formatNumber(numericValue, 0)}</span>}
          </div>
        );
      }
    }

    // Cor de fundo baseada em regra
    if (rule.formatType === 'background') {
      if (checkCondition(value, rule, allValues, fieldType)) {
        targetStyle.backgroundColor = rule.color;

        const rgb = parseInt(rule.color.slice(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        targetStyle.color = brightness > 128 ? '#000000' : '#ffffff';
      }
    }

    // Cor do texto baseada em regra
    if (rule.formatType === 'text') {
      if (checkCondition(value, rule, allValues, fieldType)) {
        targetStyle.color = rule.color;
        targetStyle.fontWeight = 'bold';
      }
    }
  });

  return { cellStyles, content, rowStylesForThisCell, colStylesForThisCell };
};

// Função auxiliar para calcular estilos de linha completa baseados nas regras de formatação
const getRowStyles = (rowKey, rowValues, valueFields, flatData, columns, formatRules, allValuesForFormatting, config) => {
  if (!formatRules || formatRules.length === 0) return {};

  let rowStyles = {};

  // 1. Verificar regras que aplicam a VALUES com scope='row'
  columns.forEach(col => {
    valueFields?.forEach(valueField => {
      const cellKey = `${rowKey}___${col}`;
      const value = flatData.values[cellKey]?.[valueField.name];

      const { rowStylesForThisCell } = applyConditionalFormatting(
        value,
        valueField.name,
        valueField.type || 'number',
        allValuesForFormatting[valueField.name] || [],
        formatRules,
        rowKey,
        col,
        false,
        false
      );

      if (Object.keys(rowStylesForThisCell).length > 0) {
        rowStyles = { ...rowStyles, ...rowStylesForThisCell };
      }
    });
  });

  // 2. Verificar regras que aplicam a ROWS (cabeçalhos de linha) com scope='row'
  config.rows?.forEach((rowField, idx) => {
    const rowValue = rowValues[idx];

    const { rowStylesForThisCell } = applyConditionalFormatting(
      rowValue,
      rowField.name,
      rowField.type || 'string',
      allValuesForFormatting[rowField.name] || [],
      formatRules,
      rowKey,
      null,
      true, // isRowHeader = true
      false
    );

    if (Object.keys(rowStylesForThisCell).length > 0) {
      rowStyles = { ...rowStyles, ...rowStylesForThisCell };
    }
  });

  return rowStyles;
};


// Função para verificar condições
const checkCondition = (value, rule, allValues, fieldType) => {
  if (value == null) return false;

  // Para números
  if (fieldType === 'number') {
    const numValue = parseFloat(value);
    const val1 = parseFloat(rule.value1);
    const val2 = parseFloat(rule.value2);

    if (isNaN(numValue)) return false;

    switch (rule.conditionType) {
      case 'greaterThan':
        return !isNaN(val1) && numValue > val1;
      case 'lessThan':
        return !isNaN(val1) && numValue < val1;
      case 'equals':
        return !isNaN(val1) && numValue === val1;
      case 'between':
        return !isNaN(val1) && !isNaN(val2) && numValue >= val1 && numValue <= val2;
      case 'aboveAverage': {
        const numericValues = allValues.filter(v => v != null && !isNaN(v)).map(v => parseFloat(v));
        if (numericValues.length === 0) return false;
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        return numValue > avg;
      }
      case 'belowAverage': {
        const numericValues = allValues.filter(v => v != null && !isNaN(v)).map(v => parseFloat(v));
        if (numericValues.length === 0) return false;
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        return numValue < avg;
      }
      case 'topN': {
        const numericValues = allValues.filter(v => v != null && !isNaN(v)).map(v => parseFloat(v));
        const sorted = [...numericValues].sort((a, b) => b - a);
        const n = parseInt(val1) || 0;
        return sorted.slice(0, n).includes(numValue);
      }
      case 'bottomN': {
        const numericValues = allValues.filter(v => v != null && !isNaN(v)).map(v => parseFloat(v));
        const sorted = [...numericValues].sort((a, b) => a - b);
        const n = parseInt(val1) || 0;
        return sorted.slice(0, n).includes(numValue);
      }
      case 'topPercent': {
        const numericValues = allValues.filter(v => v != null && !isNaN(v)).map(v => parseFloat(v));
        const sorted = [...numericValues].sort((a, b) => b - a);
        const count = Math.ceil(sorted.length * (parseFloat(val1) / 100));
        return sorted.slice(0, count).includes(numValue);
      }
      case 'bottomPercent': {
        const numericValues = allValues.filter(v => v != null && !isNaN(v)).map(v => parseFloat(v));
        const sorted = [...numericValues].sort((a, b) => a - b);
        const count = Math.ceil(sorted.length * (parseFloat(val1) / 100));
        return sorted.slice(0, count).includes(numValue);
      }
      default:
        return false;
    }
  }

  // Para strings
  if (fieldType === 'string') {
    const strValue = String(value).toLowerCase();
    const strRule = String(rule.value1 || '').toLowerCase();

    switch (rule.conditionType) {
      case 'equals':
        return strValue === strRule;
      case 'notEquals':
        return strValue !== strRule;
      case 'contains':
        return strValue.includes(strRule);
      case 'notContains':
        return !strValue.includes(strRule);
      case 'startsWith':
        return strValue.startsWith(strRule);
      case 'endsWith':
        return strValue.endsWith(strRule);
      default:
        return false;
    }
  }

  // Para datas
  if (fieldType === 'date') {
    const dateValue = new Date(value);
    const date1 = new Date(rule.value1);
    const date2 = new Date(rule.value2);

    if (isNaN(dateValue.getTime())) return false;

    switch (rule.conditionType) {
      case 'equals':
        return dateValue.toDateString() === date1.toDateString(); // Compare just date part
      case 'before':
        return dateValue < date1;
      case 'after':
        return dateValue > date1;
      case 'between':
        return dateValue >= date1 && dateValue <= date2;
      default:
        return false;
    }
  }

  return false;
};

// Função melhorada para aplicar filtros com suporte completo a todos os operadores
const applyFilters = (data, filters) => {
  if (!filters || filters.length === 0) return data;

  // Filtrar apenas filtros habilitados E que NÃO sejam playground
  // Filtros playground são apenas para o usuário final no dashboard
  const activeFilters = filters.filter(f => f.enabled !== false && f.isPlayground !== true);
  
  if (activeFilters.length === 0) return data;

  return data.filter(record => {
    return activeFilters.every(filter => {
      // Buscar valor do campo case-insensitive
      const fieldValue = getFieldValue(record, filter.field);
      
      // Tratar operadores que não precisam de valor
      if (filter.operator === 'isEmpty') {
        return fieldValue == null || String(fieldValue).trim() === '';
      }
      
      if (filter.operator === 'isNotEmpty') {
        return fieldValue != null && String(fieldValue).trim() !== '';
      }

      // Para strings
      if (filter.type === 'string') {
        const strValue = String(fieldValue || '').toLowerCase();
        const filterValue = String(filter.value || '').toLowerCase();

        switch (filter.operator) {
          case 'equals':
            return strValue === filterValue;
          case 'notEquals':
            return strValue !== filterValue;
          case 'contains':
            return strValue.includes(filterValue);
          case 'notContains':
            return !strValue.includes(filterValue);
          case 'startsWith':
            return strValue.startsWith(filterValue);
          case 'endsWith':
            return strValue.endsWith(filterValue);
          default:
            return true;
        }
      }

      // Para números
      if (filter.type === 'number') {
        const numValue = parseFloat(fieldValue);
        const filterNum = parseFloat(filter.value);
        const filterNum2 = parseFloat(filter.value2);

        // Se o valor do campo não é um número válido, filtrar
        if (isNaN(numValue)) return false;

        switch (filter.operator) {
          case 'equals':
            return !isNaN(filterNum) && numValue === filterNum;
          case 'notEquals':
            return !isNaN(filterNum) && numValue !== filterNum;
          case 'greaterThan':
            return !isNaN(filterNum) && numValue > filterNum;
          case 'greaterThanOrEqual':
            return !isNaN(filterNum) && numValue >= filterNum;
          case 'lessThan':
            return !isNaN(filterNum) && numValue < filterNum;
          case 'lessThanOrEqual':
            return !isNaN(filterNum) && numValue <= filterNum;
          case 'between':
            return !isNaN(filterNum) && !isNaN(filterNum2) && numValue >= filterNum && numValue <= filterNum2;
          default:
            return true;
        }
      }

      // Para datas
      if (filter.type === 'date') {
        const dateValue = new Date(fieldValue);
        
        // Se não é uma data válida, filtrar
        if (isNaN(dateValue.getTime())) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Operadores de data relativa (não precisam de valor)
        switch (filter.operator) {
          case 'today': {
            const recordDate = new Date(dateValue);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === today.getTime();
          }
          
          case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const recordDate = new Date(dateValue);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === yesterday.getTime();
          }
          
          case 'thisWeek': {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return dateValue >= startOfWeek && dateValue <= endOfWeek;
          }
          
          case 'thisMonth': {
            return dateValue.getMonth() === today.getMonth() && 
                   dateValue.getFullYear() === today.getFullYear();
          }
          
          case 'thisYear': {
            return dateValue.getFullYear() === today.getFullYear();
          }
          
          case 'lastNDays': {
            const n = parseInt(filter.value) || 0;
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - n);
            return dateValue >= startDate && dateValue <= today;
          }
        }

        // Operadores de data absoluta (precisam de valor)
        const filterDate = new Date(filter.value);
        const filterDate2 = new Date(filter.value2);

        if (isNaN(filterDate.getTime()) && !['today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear', 'lastNDays'].includes(filter.operator)) {
          return true; // Se não há data válida no filtro, não filtrar
        }

        switch (filter.operator) {
          case 'equals': {
            const d1 = new Date(dateValue);
            const d2 = new Date(filterDate);
            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);
            return d1.getTime() === d2.getTime();
          }
          case 'notEquals': {
            const d1 = new Date(dateValue);
            const d2 = new Date(filterDate);
            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);
            return d1.getTime() !== d2.getTime();
          }
          case 'before':
            return dateValue < filterDate;
          case 'after':
            return dateValue > filterDate;
          case 'between':
            return !isNaN(filterDate2.getTime()) && dateValue >= filterDate && dateValue <= filterDate2;
          default:
            return true;
        }
      }

      // Tipo desconhecido, não filtrar
      return true;
    });
  });
};

const aggregateData = (data, aggregation = 'sum') => {
  if (!data || data.length === 0) return null;

  const numericData = data.filter(v => v != null && !isNaN(parseFloat(v))).map(v => parseFloat(v));

  if (numericData.length === 0) return null;

  switch (aggregation) {
    case 'sum':
      return numericData.reduce((acc, val) => acc + val, 0);
    case 'avg':
      return numericData.reduce((acc, val) => acc + val, 0) / numericData.length;
    case 'count':
      return numericData.length;
    case 'min':
      return Math.min(...numericData);
    case 'max':
      return Math.max(...numericData);
    case 'distinct':
      return new Set(numericData).size;
    default:
      return numericData.reduce((acc, val) => acc + val, 0);
  }
};

const applySortRules = (data, sortRules, rowFields, columnFields, valueFields) => {
  if (!sortRules || sortRules.length === 0) return data;

  let sortedData = [...data];

  sortRules.forEach(rule => {
    const { target, field, sortType, customOrder } = rule;

    if (sortType === 'value_asc' || sortType === 'value_desc') return;

    if (sortType === 'custom' && customOrder) {
      const order = customOrder.split(',').map(s => s.trim()).filter(s => s.length > 0);
      sortedData.sort((a, b) => {
        const aValue = String(a[field]);
        const bValue = String(b[field]);
        const indexA = order.indexOf(aValue);
        const indexB = order.indexOf(bValue);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      });
    } else if (sortType === 'asc') {
      sortedData.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        const numA = parseFloat(aVal);
        const numB = parseFloat(bVal);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(aVal).localeCompare(String(bVal));
      });
    } else if (sortType === 'desc') {
      sortedData.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        const numA = parseFloat(aVal);
        const numB = parseFloat(bVal);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return String(bVal).localeCompare(String(aVal));
      });
    }
  });

  return sortedData;
};

const calculatePivotData = (data, config) => {
  if (!config.rows?.length && !config.columns?.length) {
    return { rows: [], columns: [], values: {}, columnTotals: {}, rowTotals: {}, grandTotals: {}, columnTotalsAbs: {}, rowTotalsAbs: {} };
  }

  const columnValues = new Set();
  const rowValues = new Map();
  const cellData = new Map();

  data.forEach(record => {
    // Usar getFieldValue para buscar valores case-insensitive
    const columnKey = config.columns?.map(c => getFieldValue(record, c.name)).join('|') || 'Total';
    columnValues.add(columnKey);

    const rowKey = config.rows?.map(r => getFieldValue(record, r.name)).join('|') || 'Total';

    if (!rowValues.has(rowKey)) {
      rowValues.set(rowKey, config.rows?.map(r => getFieldValue(record, r.name)) || []);
    }

    const cellKey = `${rowKey}___${columnKey}`;
    if (!cellData.has(cellKey)) {
      cellData.set(cellKey, {}); // Initialize as object to hold valueField names
    }

    config.values?.forEach(valueField => {
      if (!cellData.get(cellKey)[valueField.name]) {
        cellData.get(cellKey)[valueField.name] = [];
      }
      const fieldValue = getFieldValue(record, valueField.name);
      if (fieldValue != null) {
        cellData.get(cellKey)[valueField.name].push(fieldValue);
      }
    });
  });

  let columns = Array.from(columnValues);
  let rows = Array.from(rowValues.entries()).map(([key, values]) => ({ key, values }));

  const values = {};
  const columnTotals = {};
  const rowTotals = {};
  const columnTotalsAbs = {}; // NOVO: totais absolutos por coluna
  const rowTotalsAbs = {};    // NOVO: totais absolutos por linha
  const grandTotals = {}; // Totais gerais (absolutos para %AV)

  rows.forEach(row => {
    columns.forEach(column => {
      const cellKey = `${row.key}___${column}`;
      const cellValues = cellData.get(cellKey);

      if (cellValues) {
        config.values?.forEach(valueField => {
          const aggregatedValue = aggregateData(
            cellValues[valueField.name],
            valueField.aggregation || 'sum'
          );

          if (!values[cellKey]) values[cellKey] = {};
          values[cellKey][valueField.name] = aggregatedValue;

          // Totais com sinal (para outros usos)
          if (!columnTotals[column]) columnTotals[column] = {};
          if (!columnTotals[column][valueField.name]) columnTotals[column][valueField.name] = 0;
          columnTotals[column][valueField.name] += aggregatedValue || 0;

          if (!rowTotals[row.key]) rowTotals[row.key] = {};
          if (!rowTotals[row.key][valueField.name]) rowTotals[row.key][valueField.name] = 0;
          rowTotals[row.key][valueField.name] += aggregatedValue || 0;

          // Totais ABSOLUTOS (para cálculo de percentuais)
          if (!columnTotalsAbs[column]) columnTotalsAbs[column] = {};
          if (!columnTotalsAbs[column][valueField.name]) columnTotalsAbs[column][valueField.name] = 0;
          columnTotalsAbs[column][valueField.name] += Math.abs(aggregatedValue || 0);

          if (!rowTotalsAbs[row.key]) rowTotalsAbs[row.key] = {};
          if (!rowTotalsAbs[row.key][valueField.name]) rowTotalsAbs[row.key][valueField.name] = 0;
          rowTotalsAbs[row.key][valueField.name] += Math.abs(aggregatedValue || 0);

          // Total geral absoluto para %AV
          if (!grandTotals[valueField.name]) grandTotals[valueField.name] = 0;
          grandTotals[valueField.name] += Math.abs(aggregatedValue || 0);
        });
      }
    });
  });

  const valueSortRules = config.sortRules?.filter(r => r.sortType === 'value_asc' || r.sortType === 'value_desc');
  if (valueSortRules && valueSortRules.length > 0) {
    valueSortRules.forEach(rule => {
      if (rule.target === 'columns') {
        columns.sort((a, b) => {
          const aTotal = columnTotals[a]?.[rule.field] || 0;
          const bTotal = columnTotals[b]?.[rule.field] || 0;
          return rule.sortType === 'value_asc' ? aTotal - bTotal : bTotal - aTotal;
        });
      } else if (rule.target === 'rows' || rule.target === 'values') {
        rows.sort((a, b) => {
          const aTotal = rowTotals[a.key]?.[rule.field] || 0;
          const bTotal = rowTotals[b.key]?.[rule.field] || 0;
          return rule.sortType === 'value_asc' ? aTotal - bTotal : bTotal - aTotal;
        });
      }
    });
  }

  return { rows, columns, values, columnTotals, rowTotals, columnTotalsAbs, rowTotalsAbs, grandTotals };
};

const buildHierarchy = (data, config) => {
  if (!config.rows?.length) return [];

  const tree = new Map();
  const hierarchicalFields = config.rows.map((r, idx) =>
    idx === 0 ? true : r.hierarchical
  );

  data.forEach(record => {
    let currentLevel = tree;

    config.rows.forEach((rowField, index) => {
      const value = getFieldValue(record, rowField.name);
      // const isLeaf = index === config.rows.length - 1; // Not used in this context, useful for node definition
      const shouldNest = index === 0 || hierarchicalFields[index];

      if (!shouldNest && index > 0) { // If not hierarchical, don't nest further
        // This record will be part of the parent's records, but not create a child node for this level
        const parentNode = currentLevel.get(getFieldValue(record, config.rows[index - 1].name)); // This assumes the parent node exists
        if (parentNode) {
            parentNode.records.push(record); // Add to previous hierarchical parent's records
        }
        return; // Skip creating a new node at this level for non-hierarchical fields
      }

      if (!currentLevel.has(value)) {
        currentLevel.set(value, {
          value,
          level: index,
          fieldName: rowField.name,
          children: new Map(),
          records: [],
          // isLeaf, // Not explicitly used but can be derived
          hierarchical: hierarchicalFields[index]
        });
      }

      const node = currentLevel.get(value);
      // Only add to node.records if this is the deepest hierarchical level or not nesting
      // Or, add to all parent nodes that lead here.
      // For simplicity, we add records to the *current* node and its children will then filter those.
      // When calculating aggregates for a node, it sums up all its 'records'.
      node.records.push(record);

      currentLevel = node.children;
    });
  });

  return tree;
};

const calculateNodeAggregates = (node, config, allColumns) => {
  const columnValues = new Set();
  const cellData = new Map();

  node.records.forEach(record => {
    const columnKey = config.columns?.map(c => getFieldValue(record, c.name)).join('|') || 'Total';
    columnValues.add(columnKey);

    const cellKey = columnKey;
    if (!cellData.has(cellKey)) {
      cellData.set(cellKey, {});
    }

    config.values?.forEach(valueField => {
      if (!cellData.get(cellKey)[valueField.name]) {
        cellData.get(cellKey)[valueField.name] = [];
      }
      cellData.get(cellKey)[valueField.name].push(getFieldValue(record, valueField.name));
    });
  });

  const aggregates = {};
  const rowTotal = {};
  const rowTotalAbs = {}; // NOVO: total absoluto para nós hierárquicos
  const nodeGrandTotals = {}; // Add grand totals for hierarchical nodes

  allColumns.forEach(column => {
    const cellValues = cellData.get(column);
    if (cellValues) {
      config.values?.forEach(valueField => {
        const aggregatedValue = aggregateData(
          cellValues[valueField.name],
          valueField.aggregation || 'sum'
        );
        if (!aggregates[column]) aggregates[column] = {};
        aggregates[column][valueField.name] = aggregatedValue;

        if (!rowTotal[valueField.name]) rowTotal[valueField.name] = 0;
        rowTotal[valueField.name] += aggregatedValue || 0;

        if (!rowTotalAbs[valueField.name]) rowTotalAbs[valueField.name] = 0;
        rowTotalAbs[valueField.name] += Math.abs(aggregatedValue || 0);

        if (!nodeGrandTotals[valueField.name]) nodeGrandTotals[valueField.name] = 0;
        nodeGrandTotals[valueField.name] += Math.abs(aggregatedValue || 0); // Accumulate absolute values
      });
    }
  });

  return { columns: allColumns, aggregates, rowTotal, rowTotalAbs, nodeGrandTotals };
};

export default function PivotTable({ data, config }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // ✅ EXTRAIR field_aliases da config
  const fieldAliases = config.field_aliases || {};

  const hasHierarchicalFields = config.rows?.some((r, idx) => idx > 0 && r.hierarchical);

  const toggleNode = (path) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const { filteredData, flatData, hierarchyData, columns, allValuesForFormatting } = useMemo(() => {
    if (!data || data.length === 0) {
      return { filteredData: [], flatData: null, hierarchyData: null, columns: [], allValuesForFormatting: {} };
    }

    const filtered = applyFilters(data, config.filters);
    const sorted = applySortRules(filtered, config.sortRules, config.rows, config.columns, config.values);
    const flat = calculatePivotData(sorted, config);
    const hierarchy = hasHierarchicalFields ? buildHierarchy(sorted, config) : null;
    const cols = flat.columns;

    // Coletar todos os valores por campo para formatação condicional
    const allValues = {};

    // Valores (values)
    config.values?.forEach(vf => {
      allValues[vf.name] = [];
      Object.values(flat.values).forEach(cellValues => {
        if (cellValues[vf.name] != null) {
          allValues[vf.name].push(cellValues[vf.name]);
        }
      });
    });

    // Linhas (rows)
    config.rows?.forEach(rf => {
      allValues[rf.name] = [];
      flat.rows.forEach(row => {
        const fieldIndexInRowValues = config.rows.findIndex(r => r.name === rf.name);
        if (fieldIndexInRowValues !== -1 && row.values[fieldIndexInRowValues] != null) {
          allValues[rf.name].push(row.values[fieldIndexInRowValues]);
        }
      });
    });

    // Colunas (columns)
    config.columns?.forEach(cf => {
      allValues[cf.name] = filtered.map(record => getFieldValue(record, cf.name)).filter(v => v != null);
    });

    return { filteredData: filtered, flatData: flat, hierarchyData: hierarchy, columns: cols, allValuesForFormatting: allValues };
  }, [data, config, hasHierarchicalFields]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        Nenhum dado disponível
      </div>
    );
  }

  if (!config.rows?.length && !config.columns?.length) {
    return (
      <div className="text-center py-8 text-slate-500">
        Adicione campos em Linhas ou Colunas para visualizar a matriz
      </div>
    );
  }

  const renderValueCells = (cellKey, columnKey, columnIndex, baseData, showRowKey = null, rowStyles = {}) => {
    const cells = [];

    config.values?.forEach((valueField, vIdx) => {
      const value = baseData.values[cellKey]?.[valueField.name];

      let previousValue = null;
      if (valueField.showComparison && columnIndex > 0) {
        const previousColumnKey = columns[columnIndex - 1];
        const previousCellKey = showRowKey
          ? `${showRowKey}___${previousColumnKey}`
          : cellKey.replace(columnKey, previousColumnKey);
        previousValue = baseData.values[previousCellKey]?.[valueField.name];
      }

      const {
        cellStyles: formatCellStyles,
        content: formatContent,
        rowStylesForThisCell,
        colStylesForThisCell
      } = applyConditionalFormatting(
        value,
        valueField.name,
        valueField.type || 'number',
        allValuesForFormatting[valueField.name] || [],
        config.formatRules,
        showRowKey,
        columnKey,
        false,
        false
      );

      const finalCellStyles = {
        ...rowStyles,
        ...formatCellStyles,
        ...colStylesForThisCell
      };

      cells.push(
        <td
          key={`val-${vIdx}`}
          className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-right"
          style={finalCellStyles}
        >
          {formatContent || (value != null ? formatNumber(value, valueField.decimals !== undefined ? valueField.decimals : 0) : '-')}
        </td>
      );

      if (valueField.showPercentColumn) {
        let percentValue = null;
        if (value != null) {
          let baseValue;
          
          if (valueField.percentBaseField === 'total') {
            // % do Total (AV) - usar grandTotals (já soma dos absolutos)
            baseValue = baseData.grandTotals?.[valueField.name];
            if (baseValue && baseValue > 0) {
              percentValue = (Math.abs(value) / baseValue) * 100;
            }
          } else if (valueField.percentBaseField === 'row') {
            // % da Linha - USAR totais absolutos da linha
            baseValue = showRowKey ? baseData.rowTotalsAbs[showRowKey]?.[valueField.name] : null;
            if (baseValue && baseValue > 0) {
              percentValue = (Math.abs(value) / baseValue) * 100;
            }
          } else {
            // % da Coluna - USAR totais absolutos da coluna
            baseValue = baseData.columnTotalsAbs[columnKey]?.[valueField.name];
            if (baseValue && baseValue > 0) {
              percentValue = (Math.abs(value) / baseValue) * 100;
            }
          }
        }

        cells.push(
          <td
            key={`pct-${vIdx}`}
            className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-right bg-blue-50 dark:bg-blue-900/10 font-medium text-blue-700 dark:text-blue-400"
            style={rowStyles}
          >
            {percentValue != null ? formatPercent(percentValue, 1) : '-'}
          </td>
        );
      }

      if (valueField.showComparison) {
        if (columnIndex === 0) {
          cells.push(
            <td
              key={`cmp-${vIdx}`}
              className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center bg-slate-50 dark:bg-slate-800/30 text-slate-400"
              style={rowStyles}
            >
              -
            </td>
          );
        } else if (previousValue != null && value != null) {
          const diff = parseFloat(value) - parseFloat(previousValue);
          const diffPercent = parseFloat(previousValue) !== 0 ? ((diff / parseFloat(previousValue)) * 100) : 0;
          const isPositive = diff > 0;

          cells.push(
            <td
              key={`cmp-${vIdx}`}
              className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-right bg-amber-50 dark:bg-amber-900/10"
              style={rowStyles}
            >
              <div className="flex items-center justify-end gap-1">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className={isPositive ? 'text-green-700 dark:text-green-400 font-medium' : 'text-red-700 dark:text-red-400 font-medium'}>
                  {isPositive ? '+' : ''}{formatPercent(diffPercent, 1)}
                </span>
              </div>
            </td>
          );
        } else {
          cells.push(
            <td
              key={`cmp-${vIdx}`}
              className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center bg-amber-50 dark:bg-amber-900/10 text-slate-400"
              style={rowStyles}
            >
              -
            </td>
          );
        }
      }
    });

    return cells;
  };

  const getColumnSpan = () => {
    let span = 0;
    config.values?.forEach(vf => {
      span += 1;
      if (vf.showPercentColumn) span += 1;
      if (vf.showComparison) span += 1;
    });
    return span || 1;
  };

  const renderTotalsRow = () => {
    const hasAnyTotal = config.values?.some(vf => vf.showTotal);
    if (!hasAnyTotal || !flatData) return null;

    return (
      <tfoot className="bg-slate-100 dark:bg-slate-800 font-semibold">
        <tr>
          <td
            colSpan={config.rows?.length || 1}
            className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left"
          >
            Total Geral
          </td>
          {columns.map((col, colIdx) => {
            const cells = [];

            config.values?.forEach((valueField, vIdx) => {
              if (valueField.showTotal) {
                const totalValue = valueField.totalType === 'absolute'
                  ? flatData.columnTotalsAbs[col]?.[valueField.name]
                  : flatData.columnTotals[col]?.[valueField.name];

                cells.push(
                  <td
                    key={`total-${vIdx}`}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-right bg-slate-200 dark:bg-slate-700"
                  >
                    {totalValue != null ? formatNumber(totalValue, valueField.decimals !== undefined ? valueField.decimals : 0) : '-'}
                  </td>
                );
              } else {
                cells.push(
                  <td
                    key={`total-${vIdx}`}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center text-slate-400 bg-slate-200 dark:bg-slate-700"
                  >
                    -
                  </td>
                );
              }

              if (valueField.showPercentColumn) {
                cells.push(
                  <td
                    key={`total-pct-${vIdx}`}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center text-slate-400 bg-blue-100 dark:bg-blue-900/30"
                  >
                    -
                  </td>
                );
              }

              if (valueField.showComparison) {
                cells.push(
                  <td
                    key={`total-cmp-${vIdx}`}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center text-slate-400 bg-amber-100 dark:bg-amber-900/30"
                  >
                    -
                  </td>
                );
              }
            });

            return (
              <React.Fragment key={colIdx}>
                {cells}
              </React.Fragment>
            );
          })}
        </tr>
      </tfoot>
    );
  };

  const renderFlatTable = () => {
    if (!flatData) return null;

    return (
      <div className="w-full h-full overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
            <tr>
              {config.rows?.map((rowField, idx) => {
                const { cellStyles: headerCellStyles, rowStylesForThisCell: headerRowStyles, colStylesForThisCell: headerColStyles } = applyConditionalFormatting(
                  rowField.name,
                  rowField.name,
                  'string',
                  allValuesForFormatting[rowField.name] || [],
                  config.formatRules,
                  null,
                  null,
                  true,
                  false
                );
                const finalHeaderStyles = {
                    ...headerCellStyles,
                    ...headerRowStyles,
                    ...headerColStyles,
                };
                return (
                  <th
                    key={idx}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left font-semibold"
                    rowSpan={2}
                    style={finalHeaderStyles}
                  >
                    {getDisplayName(rowField.name, fieldAliases)}
                  </th>
                );
              })}
              {columns.map((col, idx) => {
                const colFieldName = config.columns?.[0]?.name;
                const { cellStyles: headerCellStyles, rowStylesForThisCell: headerRowStyles, colStylesForThisCell: headerColStyles } = applyConditionalFormatting(
                  col,
                  colFieldName,
                  'string',
                  allValuesForFormatting[colFieldName] || [],
                  config.formatRules,
                  null,
                  col,
                  false,
                  true
                );
                const finalHeaderStyles = {
                    ...headerCellStyles,
                    ...headerRowStyles,
                    ...headerColStyles,
                };
                return (
                  <th
                    key={idx}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center font-semibold"
                    colSpan={getColumnSpan()}
                    style={finalHeaderStyles}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
            <tr>
              {columns.map((col, colIdx) => (
                <React.Fragment key={colIdx}>
                  {config.values?.map((vf, vIdx) => (
                    <React.Fragment key={vIdx}>
                      <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium bg-slate-50 dark:bg-slate-800/50">
                        {getDisplayName(vf.name, fieldAliases)}
                      </th>
                      {vf.showPercentColumn && (
                        <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20">
                          %AV
                        </th>
                      )}
                      {vf.showComparison && (
                        <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-900/20">
                          vs. Anterior
                        </th>
                      )}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {flatData.rows.map((row, rowIdx) => {
              // Calcular estilos de linha completa - AGORA PASSANDO rowValues
              const rowStyles = getRowStyles(
                row.key,
                row.values, // <<<< IMPORTANTE: passar os valores da linha
                config.values,
                flatData,
                columns,
                config.formatRules,
                allValuesForFormatting,
                config // <<<< IMPORTANTE: passar config
              );

              return (
                <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  {row.values.map((value, cellIdx) => {
                    const field = config.rows[cellIdx];
                    const { cellStyles: headerCellStyles, rowStylesForThisCell: headerRowStyles, colStylesForThisCell: headerColStyles } = applyConditionalFormatting(
                      value,
                      field?.name,
                      field?.type || 'string',
                      allValuesForFormatting[field?.name] || [],
                      config.formatRules,
                      row.key,
                      null,
                      true,
                      false
                    );
                    const finalHeaderStyles = {
                        ...rowStyles, // Apply row-wide styles to row headers too
                        ...headerCellStyles,
                        ...headerColStyles,
                    };
                    return (
                      <td
                        key={cellIdx}
                        className="border border-slate-300 dark:border-slate-600 px-3 py-2"
                        style={finalHeaderStyles}
                      >
                        {value}
                      </td>
                    );
                  })}
                  {columns.map((col, colIdx) => {
                    const cellKey = `${row.key}___${col}`;
                    return (
                      <React.Fragment key={colIdx}>
                        {renderValueCells(cellKey, col, colIdx, flatData, row.key, rowStyles)}
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {renderTotalsRow()}
        </table>
      </div>
    );
  };

  const renderHierarchicalNode = (node, path = '', level = 0) => {
    const isExpanded = expandedNodes.has(path);
    const hasChildren = node.children.size > 0 && node.hierarchical;
    const { aggregates, rowTotal, rowTotalAbs, nodeGrandTotals } = calculateNodeAggregates(node, config, columns);

    const rows = [];

    const rowValues = useMemo(() => {
      const pathParts = path.split('|').filter(p => p);
      return pathParts;
    }, [path]);

    const rowStyles = useMemo(() => {
      let styles = {};

      columns.forEach(col => {
        config.values?.forEach(valueField => {
          const value = aggregates[col]?.[valueField.name];
          const { rowStylesForThisCell } = applyConditionalFormatting(
            value,
            valueField.name,
            valueField.type || 'number',
            allValuesForFormatting[valueField.name] || [],
            config.formatRules,
            path,
            col,
            false,
            false
          );
          if (Object.keys(rowStylesForThisCell).length > 0) {
            styles = { ...styles, ...rowStylesForThisCell };
          }
        });
      });

      config.rows?.forEach((rowField, idx) => {
        const rowValue = rowValues[idx];
        if (rowValue !== undefined) {
          const { rowStylesForThisCell } = applyConditionalFormatting(
            rowValue,
            rowField.name,
            rowField.type || 'string',
            allValuesForFormatting[rowField.name] || [],
            config.formatRules,
            path,
            null,
            true,
            false
          );
          if (Object.keys(rowStylesForThisCell).length > 0) {
            styles = { ...styles, ...rowStylesForThisCell };
          }
        }
      });

      return styles;
    }, [path, aggregates, config.values, config.formatRules, allValuesForFormatting, columns, rowValues, config.rows]);

    const rowField = config.rows[level];
    const { cellStyles: headerCellStyles, rowStylesForThisCell: headerRowStyles, colStylesForThisCell: headerColStyles } = applyConditionalFormatting(
      node.value,
      rowField?.name,
      rowField?.type || 'string',
      allValuesForFormatting[rowField?.name] || [],
      config.formatRules,
      path,
      null,
      true,
      false
    );
    const finalHeaderStyles = {
        ...rowStyles,
        ...headerCellStyles,
        ...headerColStyles,
    };

    rows.push(
      <tr key={path} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td
          className="border border-slate-300 dark:border-slate-600 px-3 py-2"
          style={{ paddingLeft: `${level * 24 + 12}px`, ...finalHeaderStyles }}
        >
          <div className="flex items-center gap-1">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={() => toggleNode(path)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-5" />}
            <span className={level === 0 ? 'font-semibold' : ''}>
              {node.value}
            </span>
          </div>
        </td>
        {columns.map((col, colIdx) => {
          const cells = [];

          config.values?.forEach((valueField, vIdx) => {
            const value = aggregates[col]?.[valueField.name];

            let previousValue = null;
            if (valueField.showComparison && colIdx > 0) {
              const previousColumnKey = columns[colIdx - 1];
              previousValue = aggregates[previousColumnKey]?.[valueField.name];
            }

            const {
              cellStyles: formatCellStyles,
              content: formatContent,
              rowStylesForThisCell,
              colStylesForThisCell
            } = applyConditionalFormatting(
              value,
              valueField.name,
              valueField.type || 'number',
              allValuesForFormatting[valueField.name] || [],
              config.formatRules,
              path,
              col,
              false,
              false
            );

            const finalCellStyles = {
              ...rowStyles,
              ...formatCellStyles,
              ...colStylesForThisCell
            };

            cells.push(
              <td
                key={`val-${vIdx}`}
                className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-right"
                style={finalCellStyles}
              >
                {formatContent || (value != null ? formatNumber(value, valueField.decimals !== undefined ? valueField.decimals : 0) : '-')}
              </td>
            );

            if (valueField.showPercentColumn) {
              let percentValue = null;
              if (value != null) {
                let baseValue;
                if (valueField.percentBaseField === 'total') {
                  baseValue = nodeGrandTotals?.[valueField.name];
                  if (baseValue && baseValue > 0) {
                    percentValue = (Math.abs(value) / baseValue) * 100;
                  }
                } else if (valueField.percentBaseField === 'row') {
                  // USAR rowTotalAbs
                  baseValue = rowTotalAbs[valueField.name];
                  if (baseValue && baseValue > 0) {
                    percentValue = (Math.abs(value) / baseValue) * 100;
                  }
                } else {
                  // USAR flatData.columnTotalsAbs
                  baseValue = flatData.columnTotalsAbs[col]?.[valueField.name];
                  if (baseValue && baseValue > 0) {
                    percentValue = (Math.abs(value) / baseValue) * 100;
                  }
                }
              }

              cells.push(
                <td
                  key={`pct-${vIdx}`}
                  className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-right bg-blue-50 dark:bg-blue-900/10 font-medium text-blue-700 dark:text-blue-400"
                  style={rowStyles}
                >
                  {percentValue != null ? formatPercent(percentValue, 1) : '-'}
                </td>
              );
            }

            if (valueField.showComparison) {
              if (colIdx === 0) {
                cells.push(
                  <td
                    key={`cmp-${vIdx}`}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center bg-slate-50 dark:bg-slate-800/30 text-slate-400"
                    style={rowStyles}
                  >
                    -
                  </td>
                );
              } else if (previousValue != null && value != null) {
                const diff = parseFloat(value) - parseFloat(previousValue);
                const diffPercent = parseFloat(previousValue) !== 0 ? ((diff / parseFloat(previousValue)) * 100) : 0;
                const isPositive = diff > 0;

                cells.push(
                  <td
                    key={`cmp-${vIdx}`}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-right bg-amber-50 dark:bg-amber-900/10"
                    style={rowStyles}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={isPositive ? 'text-green-700 dark:text-green-400 font-medium' : 'text-red-700 dark:text-red-400 font-medium'}>
                        {isPositive ? '+' : ''}{formatPercent(diffPercent, 1)}
                      </span>
                    </div>
                  </td>
                );
              } else {
                cells.push(
                  <td
                    key={`cmp-${vIdx}`}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center bg-amber-50 dark:bg-amber-900/10 text-slate-400"
                    style={rowStyles}
                  >
                    -
                  </td>
                );
              }
            }
          });

          return (
            <React.Fragment key={colIdx}>
              {cells}
            </React.Fragment>
          );
        })}
      </tr>
    );

    if (isExpanded && hasChildren) {
      Array.from(node.children.entries()).map(([childValue, childNode]) => {
        const childPath = path ? `${path}|${childValue}` : childValue;
        rows.push(...renderHierarchicalNode(childNode, childPath, level + 1));
      });
    }

    return rows;
  };

  const renderHierarchicalTable = () => {
    if (!hierarchyData) return null;

    return (
      <div className="w-full h-full overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
            <tr>
              {/* Conditional formatting for the "Row Headers" overall header */}
              {(() => {
                const rowHeaderFieldNames = config.rows.map(r => getDisplayName(r.name, fieldAliases)).join(' / ');
                const { cellStyles: headerCellStyles, rowStylesForThisCell: headerRowStyles, colStylesForThisCell: headerColStyles } = applyConditionalFormatting(
                  rowHeaderFieldNames, // Value is the concatenated string of field names
                  config.rows[0]?.name, // Use the first row field name for rules targeting a specific field
                  'string',
                  allValuesForFormatting[config.rows[0]?.name] || [],
                  config.formatRules,
                  null, null, true, false
                );
                const finalHeaderStyles = {
                    ...headerCellStyles,
                    ...headerRowStyles,
                    ...headerColStyles,
                };
                return (
                  <th
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left font-semibold"
                    rowSpan={2}
                    style={finalHeaderStyles}
                  >
                    {rowHeaderFieldNames}
                  </th>
                );
              })()}
              {columns.map((col, idx) => {
                const colFieldName = config.columns?.[0]?.name;
                const { cellStyles: headerCellStyles, rowStylesForThisCell: headerRowStyles, colStylesForThisCell: headerColStyles } = applyConditionalFormatting(
                  col,
                  colFieldName,
                  'string',
                  allValuesForFormatting[colFieldName] || [],
                  config.formatRules,
                  null, col, false, true
                );
                const finalHeaderStyles = {
                    ...headerCellStyles,
                    ...headerRowStyles,
                    ...headerColStyles,
                };
                return (
                  <th
                    key={idx}
                    className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center font-semibold"
                    colSpan={getColumnSpan()}
                    style={finalHeaderStyles}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
            <tr>
              {columns.map((col, colIdx) => (
                <React.Fragment key={colIdx}>
                  {config.values?.map((vf, vIdx) => (
                    <React.Fragment key={vIdx}>
                      <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium bg-slate-50 dark:bg-slate-800/50">
                        {getDisplayName(vf.name, fieldAliases)}
                      </th>
                      {vf.showPercentColumn && (
                        <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20">
                          %AV
                        </th>
                      )}
                      {vf.showComparison && (
                        <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-900/20">
                          vs. Anterior
                        </th>
                      )}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(hierarchyData.entries()).map(([value, node]) => {
              return renderHierarchicalNode(node, value, 0);
            })}
          </tbody>
          {renderTotalsRow()}
        </table>
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      {hasHierarchicalFields ? renderHierarchicalTable() : renderFlatTable()}
    </div>
  );
}
