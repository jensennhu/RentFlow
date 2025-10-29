// src/components/Navigation.tsx
import React from 'react';
import { LayoutDashboard, Home, Users, DollarSign, Wrench } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isExpanded: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, isExpanded }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'repairs', label: 'Repairs', icon: Wrench },
  ];

  return (
    <nav className="h-full bg-white">
      <div className="p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0 mr-3" />
              <span className="whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};