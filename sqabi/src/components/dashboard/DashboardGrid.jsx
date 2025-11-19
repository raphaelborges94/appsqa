import React, { useState, useCallback, useRef, memo, useMemo } from "react";
import ChartRenderer from "./ChartRenderer";
import { GripVertical, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ✅ GridItem memoizado com comparação otimizada
const GridItem = memo(({ item, isEditMode, onRemove, onDragStart, onDragEnd, onResizeStart, onResizeEnd, playgroundFilters }) => {
  return (
    <div
      data-id={item.id}
      className="absolute bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden"
      style={{
        left: `${(item.x / 30) * 100}%`,
        top: `${item.y * 40}px`,
        width: `${(item.w / 30) * 100}%`,
        height: `${item.h * 40}px`,
        transition: isEditMode ? 'none' : 'all 0.2s ease',
      }}
    >
      {isEditMode && (
        <div className="absolute top-0 left-0 right-0 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 px-2 py-1 flex items-center justify-between z-10">
          <div
            className="cursor-move flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            onMouseDown={(e) => onDragStart(e, item)}
            onMouseUp={onDragEnd}
          >
            <GripVertical className="w-4 h-4" />
            <span className="text-xs font-medium">Arraste</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => onRemove(item.id)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
      
      <div 
        className="w-full h-full overflow-hidden"
        style={{ 
          paddingTop: isEditMode ? '32px' : '0',
          height: '100%' 
        }}
      >
        <ChartRenderer chartId={item.chart_id} playgroundFilters={playgroundFilters} />
      </div>

      {isEditMode && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 rounded-tl"
          onMouseDown={(e) => onResizeStart(e, item)}
          onMouseUp={onResizeEnd}
        >
          <Maximize2 className="w-3 h-3 text-slate-600 dark:text-slate-300" />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // ✅ Comparação customizada para evitar re-renders desnecessários
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.x === nextProps.item.x &&
    prevProps.item.y === nextProps.item.y &&
    prevProps.item.w === nextProps.item.w &&
    prevProps.item.h === nextProps.item.h &&
    prevProps.item.chart_id === nextProps.item.chart_id &&
    prevProps.isEditMode === nextProps.isEditMode &&
    JSON.stringify(prevProps.playgroundFilters) === JSON.stringify(nextProps.playgroundFilters)
  );
});

GridItem.displayName = 'GridItem';

export default function DashboardGrid({ items = [], onUpdateItems, isEditMode, playgroundFilters = {} }) {
  const [draggingItem, setDraggingItem] = useState(null);
  const [resizingItem, setResizingItem] = useState(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [originalItem, setOriginalItem] = useState(null);
  
  const lastUpdateRef = useRef(Date.now());
  const updateThrottleMs = 16;

  // ✅ Callback memoizado para remover item
  const handleRemove = useCallback((id) => {
    onUpdateItems(items.filter(item => item.id !== id));
  }, [items, onUpdateItems]);

  // ✅ Callback memoizado para iniciar drag
  const handleDragStart = useCallback((e, item) => {
    e.preventDefault();
    setDraggingItem(item);
    setOriginalItem({ ...item });
    setStartPos({ x: e.clientX, y: e.clientY });
  }, []);

  // ✅ Callback memoizado para iniciar resize
  const handleResizeStart = useCallback((e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingItem(item);
    setOriginalItem({ ...item });
    setStartPos({ x: e.clientX, y: e.clientY });
  }, []);

  // ✅ Throttled update para performance
  const throttledUpdate = useCallback((newItems) => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= updateThrottleMs) {
      onUpdateItems(newItems);
      lastUpdateRef.current = now;
    }
  }, [onUpdateItems, updateThrottleMs]);

  // ✅ Callback memoizado para mouse move
  const handleMouseMove = useCallback((e) => {
    if (draggingItem) {
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      const gridWidth = 30;
      const rowHeight = 40;
      
      const newX = Math.max(0, Math.min(gridWidth - draggingItem.w, 
        originalItem.x + Math.round(deltaX / (window.innerWidth / gridWidth))
      ));
      const newY = Math.max(0, originalItem.y + Math.round(deltaY / rowHeight));
      
      const newItems = items.map(item =>
        item.id === draggingItem.id
          ? { ...item, x: newX, y: newY }
          : item
      );
      
      throttledUpdate(newItems);
    } else if (resizingItem) {
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      const gridWidth = 30;
      const rowHeight = 40;
      
      const newW = Math.max(6, Math.min(gridWidth - resizingItem.x,
        originalItem.w + Math.round(deltaX / (window.innerWidth / gridWidth))
      ));
      const newH = Math.max(6, originalItem.h + Math.round(deltaY / rowHeight));
      
      const newItems = items.map(item =>
        item.id === resizingItem.id
          ? { ...item, w: newW, h: newH }
          : item
      );
      
      throttledUpdate(newItems);
    }
  }, [draggingItem, resizingItem, startPos, originalItem, items, throttledUpdate]);

  // ✅ Callback memoizado para mouse up
  const handleMouseUp = useCallback(() => {
    if (draggingItem || resizingItem) {
      setDraggingItem(null);
      setResizingItem(null);
      setOriginalItem(null);
    }
  }, [draggingItem, resizingItem]);

  // ✅ Event listeners otimizados
  React.useEffect(() => {
    if (draggingItem || resizingItem) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingItem, resizingItem, handleMouseMove, handleMouseUp]);

  // ✅ Calcular altura mínima do grid
  const minHeight = useMemo(() => {
    if (items.length === 0) return 600;
    const maxY = Math.max(...items.map(item => item.y + item.h));
    return Math.max(600, maxY * 40 + 100);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-semibold mb-2">Dashboard Vazio</p>
          <p className="text-sm">
            {isEditMode 
              ? 'Arraste charts da barra lateral para começar'
              : 'Nenhum chart adicionado ainda'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg"
      style={{ minHeight: `${minHeight}px` }}
    >
      {items.map((item) => {
        const chartFilters = playgroundFilters[item.chart_id] || {};
        
        return (
          <GridItem
            key={item.id}
            item={item}
            isEditMode={isEditMode}
            onRemove={handleRemove}
            onDragStart={handleDragStart}
            onDragEnd={handleMouseUp}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleMouseUp}
            playgroundFilters={chartFilters}
          />
        );
      })}
    </div>
  );
}