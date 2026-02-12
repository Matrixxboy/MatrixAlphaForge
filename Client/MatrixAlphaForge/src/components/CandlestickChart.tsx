import React, { useState } from "react"
import { scaleTime } from "d3-scale"
import { format } from "d3-format"
import { timeFormat } from "d3-time-format"
import {
  ChartCanvas,
  Chart,
  CandlestickSeries,
  XAxis,
  YAxis,
  CrossHairCursor,
  MouseCoordinateX,
  MouseCoordinateY,
  EdgeIndicator,
  OHLCTooltip,
  TrendLine,
  DrawingObjectSelector,
} from "react-financial-charts"
import { Ruler, MousePointer2 } from "lucide-react"

interface CandleData {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ChartProps {
  data: CandleData[]
  width: number
  height: number
  ratio: number
}

const CandlestickChart: React.FC<ChartProps> = ({
  data,
  width,
  height,
  ratio,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trends, setTrends] = useState<any[]>([])
  const [enableTrendLine, setEnableTrendLine] = useState(false)

  const margin = { left: 0, right: 50, top: 10, bottom: 30 }
  const gridHeight = height - margin.top - margin.bottom
  const gridWidth = width - margin.left - margin.right

  const showGrid = true
  const yGrid = showGrid
    ? {
        innerTickSize: -1 * gridWidth,
        tickStrokeOpacity: 0.1,
        tickStrokeDasharray: "Solid",
      }
    : {}
  const xGrid = showGrid
    ? {
        innerTickSize: -1 * gridHeight,
        tickStrokeOpacity: 0.1,
        tickStrokeDasharray: "Solid",
      }
    : {}

  // Memoize data accessors and scales to prevent recreation on every render
  const xAccessor = React.useMemo(() => (d: CandleData) => d.date, [])

  const xExtents = React.useMemo(() => {
    if (!data || data.length === 0) return [new Date(), new Date()]
    // Default show last 100 candles
    return [
      xAccessor(data[Math.max(0, data.length - 100)] || data[0]),
      xAccessor(data[data.length - 1]),
    ]
  }, [data, xAccessor])

  if (!data || data.length === 0) return null

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex space-x-2 bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setEnableTrendLine(false)}
          className={`p-1.5 rounded-md transition-colors ${!enableTrendLine ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}
          title="Pointer"
        >
          <MousePointer2 size={16} />
        </button>
        <button
          onClick={() => setEnableTrendLine(true)}
          className={`p-1.5 rounded-md transition-colors ${enableTrendLine ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}
          title="Draw Trendline"
        >
          <Ruler size={16} />
        </button>
      </div>

      <ChartCanvas
        height={height}
        ratio={ratio}
        width={width}
        margin={margin}
        data={data}
        displayXAccessor={xAccessor}
        seriesName="Data"
        xScale={scaleTime()}
        xAccessor={xAccessor}
        xExtents={xExtents}
        clamp={true} // Prevent infinite panning
      >
        <Chart id={1} yExtents={(d: CandleData) => [d.high, d.low]}>
          <XAxis
            axisAt="bottom"
            orient="bottom"
            {...xGrid}
            stroke="#E2E8F0"
            tickStroke="#64748B"
          />
          <YAxis
            axisAt="right"
            orient="right"
            ticks={5}
            {...yGrid}
            stroke="#E2E8F0"
            tickStroke="#64748B"
          />

          <MouseCoordinateX
            at="bottom"
            orient="bottom"
            displayFormat={timeFormat("%Y-%m-%d")}
            rectWidth={80}
          />
          <MouseCoordinateY
            at="right"
            orient="right"
            displayFormat={format(".2f")}
            rectWidth={50}
          />

          <CandlestickSeries
            fill={(d: CandleData) => (d.close > d.open ? "#10B981" : "#EF4444")}
            wickStroke={(d: CandleData) =>
              d.close > d.open ? "#10B981" : "#EF4444"
            }
            stroke={(d: CandleData) =>
              d.close > d.open ? "#10B981" : "#EF4444"
            }
            opacity={0.8}
          />

          <EdgeIndicator
            itemType="last"
            orient="right"
            edgeAt="right"
            yAccessor={(d: CandleData) => d.close}
            fill={(d: CandleData) => (d.close > d.open ? "#10B981" : "#EF4444")}
            lineStroke={(d: CandleData) =>
              d.close > d.open ? "#10B981" : "#EF4444"
            }
            displayFormat={format(".2f")}
          />

          <TrendLine
            enabled={enableTrendLine}
            type="RAY"
            snap={false}
            trends={trends}
            onComplete={(trends: any[]) => {
              setTrends(trends)
              setEnableTrendLine(false) // Auto-switch back to pointer after drawing
            }}
            appearance={{
              stroke: "#3B82F6",
              strokeWidth: 2,
              edgeStroke: "#3B82F6",
              edgeFill: "#FFFFFF",
              r: 4,
            }}
          />

          <OHLCTooltip
            origin={[-40, 0]}
            textFill="#1E293B"
            labelFill="#64748B"
          />
        </Chart>
        <CrossHairCursor stroke="#94A3B8" />
        <DrawingObjectSelector
          enabled={!enableTrendLine}
          getInteractiveNodes={() => Promise.resolve([])}
          drawingObjectMap={{
            Trendline: "trends",
          }}
          onSelect={() => {}} // Placeholder
        />
      </ChartCanvas>
    </div>
  )
}

export default React.memo(CandlestickChart)
