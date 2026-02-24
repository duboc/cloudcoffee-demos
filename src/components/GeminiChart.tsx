import React from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ChartSpec } from '../services/gemini';

const COLORS = ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#9334e6', '#ff6d01', '#46bdc6', '#7baaf7'];

function GeminiChart({ chart }: { chart: ChartSpec }) {
  const { type, title, data } = chart;

  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white border border-[#dadce0] rounded-lg p-4 shadow-sm">
      <h4 className="text-sm font-medium text-[#202124] mb-3">{title}</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5f6368' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5f6368' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5f6368' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5f6368' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4285f4"
                strokeWidth={2}
                dot={{ r: 4, fill: '#4285f4' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#5f6368' }}
              >
                {data.map((_entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }}
              />
            </PieChart>
          ) : (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5f6368' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5f6368' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4285f4"
                fill="#4285f4"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ChartGrid({ charts }: { charts: ChartSpec[] }) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {charts.map((chart, i) => (
        <GeminiChart key={i} chart={chart} />
      ))}
    </div>
  );
}

export default GeminiChart;
