import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Scanner from './views/Scanner';
import Register from './views/Register';
import Reports from './views/Reports';
import UserList from './views/UserList';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  // Handle browser back/forward buttons
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) setCurrentPath(hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Manual navigation handler passed to Navbar for reliability
  const navigate = (path: string) => {
    setCurrentPath(path);
    window.location.hash = path;
  };

  const renderView = () => {
    switch (currentPath) {
      case '/': return <Scanner />;
      case '/register': return <Register />;
      case '/users': return <UserList />;
      case '/reports': return <Reports />;
      default: return <Scanner />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-200">
      <Navbar currentPath={currentPath} onNavigate={navigate} />
      <main>
        {renderView()}
      </main>
    </div>
  );
};

export default App;