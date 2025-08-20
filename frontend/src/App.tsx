
import { WalletConnect } from './components/WalletConnect';
import { Counter } from './components/Counter';
import './App.css';

function App() {
  return (
    <div className="app">
      <div className="container">
        <header className="app-header">
          <h1>ARM Protocol Adapter Integration</h1>
          <p>TypeScript Frontend + ARM/RISC0 Rust Backend</p>
        </header>

        <main className="app-main">
          <WalletConnect />
          <Counter />
        </main>

        <footer className="app-footer">
          <p>
            Frontend: <code>http://localhost:5173</code> | 
            Backend: <code>http://localhost:3000</code>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
