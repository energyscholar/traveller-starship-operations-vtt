import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import MainMenu from './components/MainMenu';
import ShipSelection from './components/ShipSelection';
import CombatScreen from './components/CombatScreen';
import Customizer from './components/Customizer';
import './App.css';

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/ship-selection" element={<ShipSelection />} />
            <Route path="/combat" element={<CombatScreen />} />
            <Route path="/customizer" element={<Customizer />} />
            <Route path="*" element={
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <h1>Page Not Found</h1>
                <p>Migration in progress...</p>
                <a href="/" style={{ color: '#667eea' }}>← Back to Main Menu</a>
              </div>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
