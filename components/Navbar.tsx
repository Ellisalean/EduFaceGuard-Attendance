import React from 'react';
import { ShieldCheck, UserPlus, BarChart3, ScanFace, Users } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const navItems = [
    { path: '/', label: 'Scanner', icon: ScanFace },
    { path: '/register', label: 'Registro', icon: UserPlus },
    { path: '/users', label: 'Usuarios', icon: Users },
    { path: '/reports', label: 'Reportes', icon: BarChart3 },
  ];

  return (
    <nav className="bg-brand-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => onNavigate('/')}
          >
            <ShieldCheck className="h-8 w-8 text-school-green" />
            <span className="font-bold text-xl tracking-tight">EduFaceGuard</span>
          </div>
          
          <div className="hidden md:flex space-x-4">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPath === item.path
                    ? 'bg-brand-700 text-white'
                    : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile simple text items */}
          <div className="flex md:hidden space-x-4">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`p-2 rounded-full ${
                   currentPath === item.path ? 'bg-brand-700' : ''
                }`}
              >
                <item.icon className="h-6 w-6" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;