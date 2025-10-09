import React, { useState } from 'react';
import { Calendar, Plus, RefreshCw, Settings, Check, AlertTriangle, Info } from 'lucide-react';

interface PaymentGenerationProps {
  onGenerateForMonth: (month: number, year: number, force?: boolean) => Promise<{ generated: number; month: string }>;
  onGenerateRange: (startMonth: number, startYear: number, endMonth: number, endYear: number) => Promise<Array<{ generated: number; month: string }>>;
  onGenerateCurrentAndNext: () => Promise<{ current: { generated: number; month: string }; next: { generated: number; month: string }; totalGenerated: number }>;
  onGenerateUpcoming: (monthsAhead: number) => Promise<Array<{ generated: number; month: string }>>;
  occupiedPropertiesCount: number;
  totalPropertiesCount: number;
}

export const PaymentGeneration: React.FC<PaymentGenerationProps> = ({
  onGenerateForMonth,
  onGenerateRange,
  onGenerateCurrentAndNext,
  onGenerateUpcoming,
  occupiedPropertiesCount,
  totalPropertiesCount
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [forceCreate, setForceCreate] = useState(false);
  const [monthsAhead, setMonthsAhead] = useState(6);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleGenerateCurrentAndNext = async () => {
    setIsGenerating(true);
    setResults(null);
    
    try {
      const result = await onGenerateCurrentAndNext();
      setResults(`Generated ${result.totalGenerated} payment records. Current month: ${result.current.generated}, Next month: ${result.next.generated}`);
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Generation failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSpecificMonth = async () => {
    setIsGenerating(true);
    setResults(null);
    
    try {
      const result = await onGenerateForMonth(selectedMonth, selectedYear, forceCreate);
      setResults(`Generated ${result.generated} payment records for ${result.month}`);
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Generation failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateUpcoming = async () => {
    setIsGenerating(true);
    setResults(null);
    
    try {
      const results = await onGenerateUpcoming(monthsAhead);
      const totalGenerated = results.reduce((sum, r) => sum + r.generated, 0);
      setResults(`Generated ${totalGenerated} payment records across ${results.length} months`);
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Generation failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCustomRange = async () => {
    setIsGenerating(true);
    setResults(null);
    
    try {
      // Generate for next year (12 months)
      const startMonth = new Date().getMonth() + 1;
      const startYear = new Date().getFullYear();
      const endMonth = startMonth;
      const endYear = startYear + 1;
      
      const results = await onGenerateRange(startMonth, startYear, endMonth, endYear);
      const totalGenerated = results.reduce((sum, r) => sum + r.generated, 0);
      setResults(`Generated ${totalGenerated} payment records for the next 12 months`);
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Generation failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Generation</h3>
            <p className="text-sm text-gray-600">Manually create monthly rent payment records</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Toggle advanced options"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Status Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Occupied Properties</p>
              <p className="text-xl font-bold text-blue-700">{occupiedPropertiesCount}</p>
              <p className="text-xs text-blue-500">Will generate payments</p>
            </div>
            <Check className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Properties</p>
              <p className="text-xl font-bold text-gray-700">{totalPropertiesCount}</p>
              <p className="text-xs text-gray-500">Include vacant with "Force Create"</p>
            </div>
            <Info className="h-6 w-6 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleGenerateCurrentAndNext}
            disabled={isGenerating}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Current & Next Month
          </button>
          
          <button
            onClick={handleGenerateUpcoming}
            disabled={isGenerating}
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Next {monthsAhead} Months
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleGenerateCustomRange}
            disabled={isGenerating}
            className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors flex items-center justify-center"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Next 12 Months
          </button>
          
          <div className="flex items-center space-x-2 bg-gray-50 px-4 py-3 rounded-lg">
            <label className="text-sm font-medium text-gray-700">Months ahead:</label>
            <select
              value={monthsAhead}
              onChange={(e) => setMonthsAhead(parseInt(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[3, 6, 9, 12, 18, 24].map(months => (
                <option key={months} value={months}>{months}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Advanced Options</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options
                </label>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="forceCreate"
                    checked={forceCreate}
                    onChange={(e) => setForceCreate(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="forceCreate" className="text-sm text-gray-700">
                    Force create (include vacant)
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <button
                  onClick={handleGenerateSpecificMonth}
                  disabled={isGenerating}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-orange-400 transition-colors flex items-center justify-center"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className={`mt-6 p-4 rounded-lg ${
          results.startsWith('Error') 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center space-x-2">
            {results.startsWith('Error') ? (
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            ) : (
              <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${
              results.startsWith('Error') ? 'text-red-800' : 'text-green-800'
            }`}>
              {results}
            </p>
          </div>
        </div>
      )}

      {/* Information Panel */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-2">How Manual Generation Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Occupied Properties Only:</strong> Generates payment records for properties with tenants</li>
              <li>• <strong>Uses Tenant Rent:</strong> Uses tenant's rent amount if available, otherwise property rent</li>
              <li>• <strong>Prevents Duplicates:</strong> Skips existing payment records to avoid duplicates</li>
              <li>• <strong>Force Create:</strong> Option to include vacant properties when needed</li>
              <li>• <strong>Flexible Timing:</strong> Generate for any month, range, or multiple months ahead</li>
              <li>• <strong>Manual Control:</strong> You decide when to generate - no automatic creation</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="font-semibold text-gray-700">Current Month</div>
          <div className="text-gray-600">{months[new Date().getMonth()]} {new Date().getFullYear()}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="font-semibold text-gray-700">Next Month</div>
          <div className="text-gray-600">
            {months[new Date().getMonth() + 1] || months[0]} {new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="font-semibold text-gray-700">Selected Month</div>
          <div className="text-gray-600">{months[selectedMonth - 1]} {selectedYear}</div>
        </div>
      </div>
    </div>
  );
};