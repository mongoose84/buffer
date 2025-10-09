import React, { useEffect, useRef, useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  LogarithmicScale,
  CategoryScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";

import { dataTypeConv } from "./webxi/stream-handler";
import { setupStream, getStreamID } from "./webxi/stream-handler";
import { startPauseMeasurement, stopMeasurement } from "./webxi/measurement-handler";
import { getSequence } from "./webxi/sequence-handler";
import { SLM_Setup_LAeq } from "./webxi/Leq";

// Register Chart.js components
ChartJS.register(
  LinearScale,
  LogarithmicScale,
  CategoryScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ip = "localhost:4000/api";
const host = `http://${ip}`;
const sequenceID = 76;

// --- Metadata from your example ----------------------------
const sequenceMetadata = {
  AcousticalWeighting: "A",
  AveragingMode: "Fast",
  FunctionType: "OctaveL",
  Name: "CPBLAF",
  LocalName: "LAF",
  DataType: "Int16",
  Scale: 0.01,
  Unit: "dB re 20uPa",
  VectorLength: 33,
  DataAxisCpbNumberFractions: 3,
  DataAxisCpbBaseSystem: 10,
  DataAxisCpbFirstBand: 11,
  DataAxisUnit: "Hz",
  DataAxisDataType: "Float64",
  DataAxisType: "CPB",
};

export const LiveBarChart: React.FC = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [chartData, setChartData] = useState<{ x: number; y: number }[]>([]);

  // 1️⃣ Prepare frequency axis (decode Float64 or generate if needed)
  const freqs = useMemo(() => {
    // If you have a frequency buffer from device, decode it here.
    // For demo, we'll just use standard 1/3-octave center bands:
    const bands = [
      12.5, 16, 20, 25, 31.5, 40, 50, 63, 80, 100,
      125, 160, 200, 250, 315, 400, 500, 630, 800,
      1000, 1250, 1600, 2000, 2500, 3150, 4000,
      5000, 6300, 8000, 10000, 12500, 16000, 20000,
    ];
    return bands.slice(0, sequenceMetadata.VectorLength);
  }, []);

  // 2️⃣ Connect to WebSocket once
  useEffect(() => {
    (async () => {
      try {
        await SLM_Setup_LAeq(host);
        const [id, sequence] = await getSequence(host, sequenceID);
        const uri = await setupStream(host, ip, Number(id), "LAeqStream");
        await startPauseMeasurement(host, true);

        const ws = new WebSocket(uri);
        wsRef.current = ws;

        ws.onopen = () => console.info("WebXI WebSocket connected");
        ws.onclose = async () => {
          console.info("WebXI WebSocket closed");
          await stopMeasurement(host);
          const streamID = await getStreamID(host, "LAeqStream");
          if (streamID) {
            await fetch(`${host}/WebXi/Streams/${streamID}`, { method: "DELETE" });
            console.info("🧹 Cleaned up WebXI stream");
          }
        };

        ws.onmessage = (event) => {
          if (event.data instanceof Blob) {
            event.data.arrayBuffer().then((buf) => {
              const values = dataTypeConv(sequence.DataType, buf, sequence.VectorLength) as number[];
              const scaled = values.map((v) => v * sequence.Scale);

              const dataset = freqs.map((f, i) => ({
                x: f,
                y: scaled[i],
              }));

              setChartData(dataset);
            });
          }
        };
      } catch (err) {
        console.error("WebXI init error:", err);
      }
    })();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [freqs]);

  // 3️⃣ Chart configuration
  const options: ChartOptions<"bar"> = {
    responsive: true,
    animation: false,
    scales: {
      x: {
        type: "logarithmic",
        title: { display: true, text: "Frequency (Hz)" },
        min: 500,
        max: 25000,
        ticks: {
          callback: (value) => {
            const freq = Number(value);
            if ([10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].includes(freq))
              return freq >= 1000 ? `${freq / 1000}k` : freq;
            return null;
          },
        },
      },
      y: {
        title: { display: true, text: sequenceMetadata.Unit },
      },
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `${sequenceMetadata.LocalName} (${sequenceMetadata.AveragingMode}, ${sequenceMetadata.AcousticalWeighting}-weighting)`,
      },
    },
  };

  // 4️⃣ Render chart
  return (
    <div style={{ width: "100%", height: "500px" }}>
      <Bar
        data={{
          datasets: [
            {
              label: sequenceMetadata.LocalName,
              data: chartData,
              backgroundColor: "rgba(0, 123, 255, 0.6)",
              borderRadius: 4,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
};
