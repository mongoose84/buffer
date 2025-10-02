import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { CircularBuffer } from './circular-buffer';
import { createWsConnector } from './websocket-connector';

// Register Chart.js components (required once)
ChartJS.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

/** Props – you can pass the WS URL and buffer size if you like */
interface SineLiveChartProps {
  wsUrl: string;               // e.g. "wss://example.com/sine"
  bufferSize?: number;         // how many samples to keep (default 500)
  refreshMs?: number;          // UI refresh interval (default 50 ms)
}



/** Main component */
export const SineLiveChart: React.FC<SineLiveChartProps> = ({
  wsUrl,
  bufferSize = 2400,
  refreshMs = 50,
}) => {
  // --- State & refs ----------------------------------------------------
  const [chartData, setChartData] = useState<number[]>([]);
  const bufferRef = useRef<CircularBuffer>(new CircularBuffer(bufferSize));
  const wsRef = useRef<ReturnType<typeof createWsConnector> | null>(null);
  const animationFrame = useRef<number | null>(null);   // ← initialise with null
  
  // --- Effect: open WebSocket -----------------------------------------
  useEffect(() => {
    const ws = createWsConnector(wsUrl);
    wsRef.current = ws;

    ws.on('open', () => console.info('WebSocket opened'));
    ws.on('error', (err) => console.error('WS error', err));
    ws.on('close', (code, reason) =>
      console.info(`WS closed (${code}): ${reason}`),
    );

    // Incoming data is an array of numbers (our sine samples)
    ws.on('data', (arr: number[]) => {
      // Push the whole batch into the circular buffer.
      // Overwritten values are ignored here, but you could log them.
      bufferRef.current.push(arr);
    });

    // Clean up on unmount
    return () => {
      ws.close(1000, 'component unmounted');
      wsRef.current = null;
    };
  }, [wsUrl]);

  // --- Effect: UI refresh loop ----------------------------------------
  useEffect(() => {
    const tick = () => {
      // Pull the latest snapshot from the buffer.
      const snapshot = bufferRef.current.read(); // chronological order
      setChartData(snapshot);
      animationFrame.current = window.setTimeout(tick, refreshMs);
    };
    tick(); // start loop

    return () => {
      if (animationFrame.current !== null) {
        clearTimeout(animationFrame.current);
      }
  };
  }, [refreshMs]);

  // --- Prepare Chart.js data structure ---------------------------------
  const data = {
    labels: chartData.map((_v, i) => i), // simple x‑axis: sample index
    datasets: [
      {
        label: 'Live sine',
        data: chartData,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: false,
        tension: 0.2, // slight smoothing
        pointRadius: 0, // no dots, just line
      },
    ],
  };

  const options: ChartOptions<'line'> = {
  responsive: true,
  animation: false,               // literal false – now matches the type
  scales: {
    x: { display: false },
    y: { min: -1.2, max: 1.2 },
  },
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: 'Live Sine Wave (WebSocket source)',
    },
  },
};

  return <Line data={data} options={options} />;
};