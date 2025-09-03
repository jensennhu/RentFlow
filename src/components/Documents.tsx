import React from 'react';
import { FileText, Download, Upload, Calendar, Eye } from 'lucide-react';

export const Documents: React.FC = () => {
  const documents = [
    {
      id: '1',
      name: 'Lease Agreement 2024',
      type: 'PDF',
      size: '2.4 MB',
      date: '2024-01-01',
      category: 'Lease'
    },
    {
      id: '2',
      name: 'Property Rules & Regulations',
      type: 'PDF',
      size: '1.2 MB',
      date: '2024-01-01',
      category: 'Rules'
    },
    {
      id: '3',
      name: 'Maintenance Guidelines',
      type: 'PDF',
      size: '800 KB',
      date: '2024-01-01',
      category: 'Maintenance'
    },
    {
      id: '4',
      name: 'Emergency Contact List',
      type: 'PDF',
      size: '156 KB',
      date: '2024-01-01',
      category: 'Emergency'
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Lease': return 'bg-blue-100 text-blue-800';
      case 'Rules': return 'bg-green-100 text-green-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Emergency': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-600">Access your lease documents and important information</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                  <p className="text-sm text-gray-600">{doc.type} • {doc.size}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="text-sm">{new Date(doc.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(doc.category)}`}>
                  {doc.category}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center">
                <Eye className="h-4 w-4 mr-1" />
                View
              </button>
              <button className="flex-1 bg-gray-50 text-gray-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center">
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">Your lease documents and other files will appear here.</p>
        </div>
      )}
    </div>
  );
};