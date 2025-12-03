// src/components/Navigation.tsx
import React from 'react';
import { LayoutDashboard, Home, Users, DollarSign, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isExpanded: boolean;
  onToggleSidebar?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  isExpanded,
  onToggleSidebar 
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'repairs', label: 'Repairs', icon: Wrench },
  ];

  return (
    <nav className="h-full bg-white flex flex-col">
      {/* Navigation Items */}
      <div className="flex-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={!isExpanded ? item.label : undefined}
              className={`w-full flex items-center ${
                isExpanded ? 'px-4 justify-start' : 'px-0 justify-center'
              } py-3 mb-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isExpanded ? 'mr-3' : ''}`} />
              {isExpanded && (
                <span className="whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Collapse/Expand Button at Bottom */}
      {onToggleSidebar && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onToggleSidebar}
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`w-full flex items-center ${
              isExpanded ? 'justify-center' : 'justify-center'
            } px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors`}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <>
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      )}
    </nav>
  );
};