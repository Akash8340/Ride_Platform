import { useState } from 'react';
import { RiderPage } from './pages/RiderPage.jsx';
import { DriverPage } from './pages/DriverPage.jsx';

function App() {
  const [view, setView] = useState('rider');

  return (
    <div>
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setView('rider')}
          className={`text-xs px-3 py-1.5 rounded-md font-mono transition-colors ${
            view === 'rider' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          rider
        </button>
        <button
          onClick={() => setView('driver')}
          className={`text-xs px-3 py-1.5 rounded-md font-mono transition-colors ${
            view === 'driver' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          driver
        </button>
      </div>
      {view === 'rider' ? <RiderPage /> : <DriverPage />}
    </div>
  );
}

export default App;