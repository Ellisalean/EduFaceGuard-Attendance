import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, UserPlus, BarChart3, ScanFace } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Scanner', icon: ScanFace },
    { path: '/register', label: 'Register', icon: UserPlus },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <nav className="bg-brand-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-8 w-8 text-school-green" />
            <span className="font-bold text-xl tracking-tight">EduFaceGuard</span>
          </div>
          
          <div className="hidden md:flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-brand-700 text-white'
                    : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile simple text items */}
          <div className="flex md:hidden space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`p-2 rounded-full ${
                   location.pathname === item.path ? 'bg-brand-700' : ''
                }`}
              >
                <item.icon className="h-6 w-6" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;