// src/components/ChartRenderer.tsx
import React, { useRef } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";

interface BasicDataPoint {
  label: string;
  value: number;
}

interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

interface MultiSeries {
  name: string;
  data: { date: string; value: number }[];
}

interface ChartRendererProps {
  data: {
    chart: "bar" | "line" | "pie" | "time-series" | "multi-line" | "multi-bar";
    data?: BasicDataPoint[] | TimeSeriesDataPoint[];
    series?: MultiSeries[];
    xLabel?: string;
    yLabel?: string;
  };
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#00c49f", "#ffbb28"];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const downloadChart = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement("a");
      link.download = "chart.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to download chart", err);
    }
  };

  return (
    <div className="relative">
      {/* Download button */}
      <div className="absolute top-2 right-2 z-10">
        <Button size="icon" variant="ghost" onClick={downloadChart}>
          <Download className="w-4 h-4" />
        </Button>
      </div>

      <div
        ref={chartRef}
        className="w-full h-80 bg-background p-2 rounded-lg border border-border"
      >
        <ResponsiveContainer width="100%" height="100%">
          {/** ✅ Existing Bar Chart */}
          {data.chart === "bar" ? (
            <BarChart data={data.data as BasicDataPoint[]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                label={{ value: data.xLabel || "X", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                label={{ value: data.yLabel || "Y", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          ) : /** ✅ Existing Line Chart */
          data.chart === "line" ? (
            <LineChart data={data.data as BasicDataPoint[]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                label={{ value: data.xLabel || "X", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                label={{ value: data.yLabel || "Y", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#82ca9d" />
            </LineChart>
          ) : /** ✅ Existing Pie Chart */
          data.chart === "pie" ? (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={data.data as BasicDataPoint[]}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {(data.data as BasicDataPoint[]).map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : /** ✅ New Time-Series Chart */
          data.chart === "time-series" ? (
            <LineChart data={data.data as TimeSeriesDataPoint[]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                label={{ value: data.xLabel || "Date", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                label={{ value: data.yLabel || "Value", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          ) : /** ✅ New Multi-Line Chart */
          data.chart === "multi-line" ? (
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.series?.map((s, idx) => (
                <Line
                  key={s.name}
                  data={s.data}
                  type="monotone"
                  dataKey="value"
                  name={s.name}
                  stroke={COLORS[idx % COLORS.length]}
                />
              ))}
            </LineChart>
          ) : /** ✅ New Multi-Bar Chart */
          data.chart === "multi-bar" ? (
            <BarChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.series?.map((s, idx) => (
                <Bar
                  key={s.name}
                  data={s.data}
                  dataKey="value"
                  name={s.name}
                  fill={COLORS[idx % COLORS.length]}
                />
              ))}
            </BarChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
