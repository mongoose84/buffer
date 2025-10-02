import React from 'react';
import './App.css';
import { SineLiveChart } from './SineLiveChart';

function App() {
  // Replace with the actual endpoint that streams the sine data.
  const WS_URL = 'ws://127.0.0.1:8000/ws';

  return (
    <div className="App">
      <header className="App-header">
        <h1>Live Sine Wave Demo</h1>
         <SineLiveChart
          wsUrl={WS_URL}
          bufferSize={800}   // optional – how many samples to keep
          refreshMs={30}     // optional – UI refresh interval (ms)
        />
      </header>
    </div>
  );
}

export default App;