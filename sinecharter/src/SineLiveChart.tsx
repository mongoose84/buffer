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

// --- WebXI imports (from previous examples) ----------------------------
import { setupStream, dataTypeConv, getStreamID } from './webxi/stream-handler';
import { startPauseMeasurement, stopMeasurement } from './webxi/measurement-handler';
import { MovingLeq, SLM_Setup_LAeq } from './webxi/Leq';
import { getSequence } from './webxi/sequence-handler';

// Register Chart.js components
ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Title, Tooltip, Legend);

/** Props – you can pass the WS URL and buffer size if you like */
interface SineLiveChartProps {
  bufferSize?: number;
  refreshMs?: number;
}

/** Configuration – set to true to use real WebXI SLM stream instead of test sine data */
const USE_WEBXI = true;

// --- WebXI connection settings -----------------------------------------
const ip = 'localhost:4000/api';
const streamingip = '10.42.0.1';
const host = `http://${ip}`;
const sequenceID = 6;

/** Main component */
export const SineLiveChart: React.FC<SineLiveChartProps> = ({
  bufferSize = 2400,
  refreshMs = 50,
}) => {
  const [chartData, setChartData] = useState<number[]>([]);
  const bufferRef = useRef(new CircularBuffer(bufferSize));
  const wsRef = useRef<WebSocket | null>(null);
  const animationFrame = useRef<number | null>(null);

  // --- Effect: connect to WebSocket or WebXI ---------------------------
  useEffect(() => {
    let running = true;

    if (USE_WEBXI) {
      (async () => {
        try {
          //console.log('🔧 Initializing WebXI stream...');
          await SLM_Setup_LAeq(host);
          return
          // Get sequence info (e.g. LAeq data type)
          const [id, sequence] = await getSequence(host, sequenceID);
          const dataType = sequence.DataType;

          const numberId = Number(id);
          if (isNaN(numberId)) throw new Error('Invalid sequence ID');
          // Create and start WebXI stream
          const uri = await setupStream(host, ip, numberId, 'LAeqStream');
          await startPauseMeasurement(host, true);

          console.log('✅ WebXI stream ready at:', uri);
          
          const ws = new WebSocket(uri);
          wsRef.current = ws;

          ws.onopen = () => console.info('WebXI WebSocket connected');
          ws.onerror = (err) => console.error('WebXI WS error', err);
          ws.onclose = async () => {
            console.info('WebXI WebSocket closed');
            await stopMeasurement(host);
            const streamID = await getStreamID(host, 'LAeqStream');
            if (streamID) {
              await fetch(`${host}/WebXi/Streams/${streamID}`, { method: 'DELETE' });
              console.info('🧹 Cleaned up WebXI stream');
            }
          };

          // Use moving average to smooth LAeq (10 s window)
          const leqMov = new MovingLeq(10, true);

          ws.onmessage = (event) => {
            console.log('WebXI message received');
            if (!running) return;
            const msg = event.data as ArrayBuffer;
            const bytes = new Uint8Array(msg);

            // Convert BK binary payload to Int16 LAeq value
            const val = dataTypeConv(dataType, bytes, undefined) as number;
            const LAeq = val / 100;
            const LAeqMov = leqMov.move(LAeq);

            // Push to buffer for chart
            bufferRef.current.push([LAeqMov]);
          };
        } catch (err) {
          console.error('WebXI init error:', err);
        }
      })();
    } else {
      // --- Local test sine WS (demo mode) -------------------------------
      const wsUrl = 'ws://127.0.0.1:8000/ws';
      const ws = createWsConnector(wsUrl);
      //wsRef.current = ws;

      ws.on('open', () => console.info('Demo WebSocket opened'));
      ws.on('data', (arr: number[]) => bufferRef.current.push(arr));
      ws.on('close', () => console.info('Demo WebSocket closed'));
    }

    // --- Cleanup on unmount -------------------------------------------
    return () => {
      running = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (animationFrame.current !== null) clearTimeout(animationFrame.current);
    };
  }, []);

  // --- Effect: UI refresh loop ----------------------------------------
  useEffect(() => {
    const tick = () => {
      setChartData(bufferRef.current.read());
      animationFrame.current = window.setTimeout(tick, refreshMs);
    };
    tick();
    return () => {
      if (animationFrame.current !== null) clearTimeout(animationFrame.current);
    };
  }, [refreshMs]);

  // --- Chart.js configuration -----------------------------------------
  const data = {
    labels: chartData.map((_v, i) => i),
    datasets: [
      {
        label: USE_WEBXI ? 'LAeq (mov,10s)' : 'Live sine',
        data: chartData,
        borderColor: USE_WEBXI ? 'rgba(255, 99, 132, 1)' : 'rgba(75,192,192,1)',
        backgroundColor: USE_WEBXI
          ? 'rgba(255,99,132,0.2)'
          : 'rgba(75,192,192,0.2)',
        fill: false,
        tension: 0.2,
        pointRadius: 0,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    animation: false,
    scales: {
      x: { display: false },
      y: USE_WEBXI ? { min: 30, max: 100 } : { min: -1.2, max: 1.2 },
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: USE_WEBXI ? 'Live LAeq (WebXI SLM Stream)' : 'Live Sine Wave (WebSocket source)',
      },
    },
  };

  return <Line data={data} options={options} />;
};
