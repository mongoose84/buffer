import React from 'react';
import './App.css';
import { SineLiveChart } from './SineLiveChart';

function App() {
  

  return (
    <div className="App">
      <header className="App-header">
        <h1>Live Sine Wave Demo</h1>
         <SineLiveChart />
        
      </header>
    </div>
  );
}

export default App;