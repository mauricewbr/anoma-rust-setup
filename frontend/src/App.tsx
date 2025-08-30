import { useState, useEffect } from 'react';
import { Navigation, type PageType } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { SignUpPage } from './pages/SignUpPage';
import { LogInPage } from './pages/LogInPage';
import { TransferPage } from './pages/TransferPage';
import { TestingPage } from './pages/TestingPage';

interface AppState {
  isLoggedIn: boolean;
  userKey: string | null;
  walletType: string | null;
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [appState, setAppState] = useState<AppState>({
    isLoggedIn: false,
    userKey: null,
    walletType: null
  });

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUserKey = localStorage.getItem('anoma_current_user_key');
    const savedWalletType = localStorage.getItem('anoma_current_wallet_type');
    
    if (savedUserKey && savedWalletType) {
      setAppState({
        isLoggedIn: true,
        userKey: savedUserKey,
        walletType: savedWalletType
      });
    }
  }, []);

  const handleSignUpComplete = (userKey: string, walletType: string) => {
    setAppState({
      isLoggedIn: true,
      userKey,
      walletType
    });
    
    // Save to localStorage for session persistence
    localStorage.setItem('anoma_current_user_key', userKey);
    localStorage.setItem('anoma_current_wallet_type', walletType);
    
    // Navigate to home or transfer page
    setCurrentPage('transfer');
  };

  const handleLogInComplete = (userKey: string, walletType: string) => {
    setAppState({
      isLoggedIn: true,
      userKey,
      walletType
    });
    
    // Save to localStorage for session persistence
    localStorage.setItem('anoma_current_user_key', userKey);
    localStorage.setItem('anoma_current_wallet_type', walletType);
    
    // Navigate to transfer page
    setCurrentPage('transfer');
  };

  const handleLogout = () => {
    setAppState({
      isLoggedIn: false,
      userKey: null,
      walletType: null
    });
    
    // Clear localStorage
    localStorage.removeItem('anoma_current_user_key');
    localStorage.removeItem('anoma_current_wallet_type');
    
    // Navigate to home
    setCurrentPage('home');
  };

  const handlePageChange = (page: PageType) => {
    // Redirect to login if trying to access protected pages
    if (!appState.isLoggedIn && page === 'transfer') {
      setCurrentPage('login');
      return;
    }
    
    // Redirect to home if trying to access auth pages while logged in
    if (appState.isLoggedIn && (page === 'signup' || page === 'login')) {
      setCurrentPage('home');
      return;
    }
    
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage 
            isLoggedIn={appState.isLoggedIn}
            onNavigate={handlePageChange}
          />
        );
      
      case 'signup':
        return (
          <SignUpPage 
            onSignUpComplete={handleSignUpComplete}
          />
        );
      
      case 'login':
        return (
          <LogInPage 
            onLogInComplete={handleLogInComplete}
          />
        );
      
      case 'transfer':
        return appState.isLoggedIn && appState.userKey && appState.walletType ? (
          <TransferPage 
            userKey={appState.userKey}
            walletType={appState.walletType}
          />
        ) : (
          <HomePage 
            isLoggedIn={appState.isLoggedIn}
            onNavigate={handlePageChange}
          />
        );
      
      case 'testing':
        return <TestingPage />;
      
      default:
        return (
          <HomePage 
            isLoggedIn={appState.isLoggedIn}
            onNavigate={handlePageChange}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isLoggedIn={appState.isLoggedIn}
      />
      
      <main className="flex-1">
        {renderCurrentPage()}
      </main>
      
      {appState.isLoggedIn && (
        <div className="fixed top-20 right-4 z-40">
          <button 
            onClick={handleLogout} 
            className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg"
          >
            🚪 Logout
          </button>
        </div>
      )}
      
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600 text-sm">
            <p>
              🔗 Anoma Wallet - Stateless Key Derivation | 
              Frontend: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:5174</code> | 
              Backend: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:8080</code>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;