/**
 * Navigation Component
 * 
 * Provides navigation between different pages of the application
 */

import React from 'react';

export type PageType = 'home' | 'signup' | 'login' | 'transfer' | 'testing';

interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  isLoggedIn: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  currentPage, 
  onPageChange, 
  isLoggedIn 
}) => {
  const navItems = [
    { id: 'home' as PageType, label: '🏠 Home', alwaysShow: true },
    { id: 'signup' as PageType, label: '📝 Sign Up', alwaysShow: !isLoggedIn },
    { id: 'login' as PageType, label: '🔑 Log In', alwaysShow: !isLoggedIn },
    { id: 'transfer' as PageType, label: '💸 Transfer', alwaysShow: isLoggedIn },
    { id: 'testing' as PageType, label: '🧪 Testing', alwaysShow: true },
  ];

  return (
    <nav className="w-full sticky top-0 z-50 gradient-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-white">🔗 Anoma Wallet</h1>
            <span className="text-xs text-white/80">Stateless Key Derivation</span>
          </div>
          
          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems
                .filter(item => item.alwaysShow)
                .map(item => (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-white/20 text-white font-bold'
                        : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))
              }
            </div>
          </div>
          
          {/* Status */}
          <div className="flex-shrink-0">
            {isLoggedIn ? (
              <span className="status-success">
                ✅ Logged In
              </span>
            ) : (
              <span className="status-error">
                ⭕ Not Logged In
              </span>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => {/* TODO: Add mobile menu toggle */}}
              className="bg-white/10 inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              ☰
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems
              .filter(item => item.alwaysShow)
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors ${
                    currentPage === item.id
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))
            }
          </div>
        </div>
      </div>
    </nav>
  );
};
