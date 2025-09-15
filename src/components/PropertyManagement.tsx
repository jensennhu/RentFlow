import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Home, Users, DollarSign, Settings, MapPin, Edit, Trash2, Calendar, Grid3X3, List, Map as MapIcon, Loader2 } from 'lucide-react';

// Types (moved inline to avoid external imports)
interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  rent: number;
  status: 'vacant' | 'occupied' | 'maintenance';
}

interface Tenant {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  leaseStart: string;
  leaseEnd: string;
}

interface DataHook {
  properties: Property[];
  tenants: Tenant[];
  addProperty: (property: Omit<Property, 'id'>) => Promise<void>;
  updateProperty: (id: string, property: Omit<Property, 'id'>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
}

interface PropertyManagementProps {
  dataHook: DataHook;
}

// Geocoding service (using OpenStreetMap Nominatim - free API)
const geocodeAddress = async (address: string, city: string, state: string, zipcode: string): Promise<{lat: number, lng: number} | null> => {
  try {
    const fullAddress = `${address}, ${city}, ${state} ${zipcode}`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Simple Map Component using Leaflet via CDN
const PropertyMap: React.FC<{ properties: Property[]; tenants: Tenant[]; selectedProperty?: string | null }> = ({ 
  properties, 
  tenants, 
  selectedProperty 
}) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [geocodedProperties, setGeocodedProperties] = useState<Array<Property & {lat: number, lng: number}>>([]);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined' && !(window as any).L) {
        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
        document.head.appendChild(link);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        script.onload = () => {
          initializeMap();
        };
        document.head.appendChild(script);
      } else if ((window as any).L) {
        initializeMap();
      }
    };

    const initializeMap = () => {
      if (!mapRef.current || mapInstance) return;

      const L = (window as any).L;
      const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4); // Center of USA

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      setMapInstance(map);
    };

    loadLeaflet();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Geocode properties and add markers
  useEffect(() => {
    if (!mapInstance || properties.length === 0) return;

    const geocodeAndAddMarkers = async () => {
      setIsLoading(true);
      const L = (window as any).L;
      
      // Clear existing markers
      mapInstance.eachLayer((layer: any) => {
        if (layer.options && layer.options.isPropertyMarker) {
          mapInstance.removeLayer(layer);
        }
      });

      const geocoded = [];
      const markers = [];

      for (const property of properties) {
        try {
          const coords = await geocodeAddress(property.address, property.city, property.state, property.zipcode);
          if (coords) {
            geocoded.push({ ...property, ...coords });

            const tenant = tenants.find(t => t.propertyId === property.id);
            
            // Create marker color based on status
            const markerColor = property.status === 'occupied' ? 'green' : 
                              property.status === 'vacant' ? 'blue' : 'red';
            
            // Create custom marker HTML
            const markerHtml = `
              <div style="
                width: 20px; 
                height: 20px; 
                border-radius: 50%; 
                background-color: ${markerColor}; 
                border: 2px solid white; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
              ">
                🏠
              </div>
            `;

            const marker = L.marker([coords.lat, coords.lng], {
              isPropertyMarker: true,
              icon: L.divIcon({
                html: markerHtml,
                className: 'custom-property-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })
            });

            // Add popup
            const popupContent = `
              <div style="font-family: sans-serif;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">${property.address}</h4>
                <p style="margin: 4px 0; font-size: 12px; color: #666;">${property.city}, ${property.state} ${property.zipcode}</p>
                <p style="margin: 4px 0; font-size: 12px;"><strong>${property.rent}/month</strong></p>
                <p style="margin: 4px 0; font-size: 12px;">Status: <span style="color: ${markerColor}; font-weight: bold;">${property.status}</span></p>
                ${tenant ? `<p style="margin: 4px 0; font-size: 12px;">Tenant: ${tenant.name}</p>` : ''}
              </div>
            `;

            marker.bindPopup(popupContent);
            marker.addTo(mapInstance);
            markers.push(marker);
          }
        } catch (error) {
          console.error(`Failed to geocode ${property.address}:`, error);
        }
      }

      setGeocodedProperties(geocoded);

      // Fit map to show all markers
      if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        mapInstance.fitBounds(group.getBounds().pad(0.1));
      }

      setIsLoading(false);
    };

    geocodeAndAddMarkers();
  }, [mapInstance, properties, tenants]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <MapIcon className="h-5 w-5 mr-2" />
          Property Locations
        </h3>
        {isLoading && (
          <div className="flex items-center text-gray-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading locations...
          </div>
        )}
      </div>
      
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-lg border border-gray-200"
          style={{ minHeight: '384px' }}
        />
        
        {!mapInstance && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <MapIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mr-3">Property Status:</h4>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>Vacant</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Maintenance</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
          <span className="text-sm font-medium text-blue-700">
            {geocodedProperties.length} of {properties.length} properties mapped
          </span>
        </div>
      </div>
      
      {/* Property summary */}
      {properties.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Occupied</div>
            <div className="text-xl font-bold text-green-700">
              {properties.filter(p => p.status === 'occupied').length}
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Vacant</div>
            <div className="text-xl font-bold text-blue-700">
              {properties.filter(p => p.status === 'vacant').length}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Maintenance</div>
            <div className="text-xl font-bold text-red-700">
              {properties.filter(p => p.status === 'maintenance').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PropertyManagement: React.FC<PropertyManagementProps> = ({ dataHook }) => {
  const { properties, tenants, addProperty, updateProperty, deleteProperty } = dataHook;
  
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'map'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'address' | 'city'| 'state'| 'zipcode'| 'rent' | 'status'>('address');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zipcode: '',
    rent: '',
    status: 'vacant' as Property['status']
  });

  // Memoized filtered and sorted properties
  const filteredAndSortedProperties = useMemo(() => {
    return properties
      .filter(property => 
        property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (sortBy === 'rent') {
          aValue = a.rent;
          bValue = b.rent;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        return 0;
      });
  }, [properties, searchTerm, sortBy, sortOrder]);

  const resetForm = useCallback(() => {
    setFormData({ address: '', city: '', state: '', zipcode:'', rent: '', status: 'vacant' });
    setEditingProperty(null);
    setShowForm(false);
    setIsSubmitting(false);
  }, []);

  const handleEdit = useCallback((property: Property) => {
    setEditingProperty(property);
    setFormData({
      address: property.address,
      city: property.city,
      state: property.state,
      zipcode: property.zipcode,
      rent: property.rent.toString(),
      status: property.status
    });
    setShowForm(true);
    setSelectedProperty(property.id);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const propertyData = {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
        rent: parseInt(formData.rent),
        status: formData.status
      };

      if (editingProperty) {
        await updateProperty(editingProperty.id, propertyData);
      } else {
        await addProperty(propertyData);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving property:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingProperty, addProperty, updateProperty, resetForm]);

  const handleDelete = useCallback((id: string) => {
    const property = properties.find(p => p.id === id);
    const tenant = tenants.find(t => t.propertyId === id);
    
    if (tenant) {
      if (confirm(`This property has a tenant (${tenant.name}). Deleting the property will also remove the tenant. Are you sure?`)) {
        deleteProperty(id);
        setShowDeleteConfirm(null);
      }
    } else {
      if (confirm('Are you sure you want to delete this property?')) {
        deleteProperty(id);
        setShowDeleteConfirm(null);
      }
    }
  }, [properties, tenants, deleteProperty]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Management</h2>
          <p className="text-gray-600">Manage your rental properties and units</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1" role="tablist">
            <button
              onClick={() => setViewMode('card')}
              role="tab"
              aria-selected={viewMode === 'card'}
              aria-label="Switch to card view"
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              role="tab"
              aria-selected={viewMode === 'table'}
              aria-label="Switch to table view"
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              role="tab"
              aria-selected={viewMode === 'map'}
              aria-label="Switch to map view"
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapIcon className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </button>
        </div>
      </div>

      {/* Search and Sort Controls */}
      {viewMode !== 'map' && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search properties"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Sort properties by"
            >
              <option value="address">Sort by Address</option>
              <option value="city">Sort by City</option>
              <option value="state">Sort by State</option>
              <option value="zipcode">Sort by Zip Code</option>
              <option value="rent">Sort by Rent</option>
              <option value="status">Sort by Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' ? (
        <PropertyMap 
          properties={properties} 
          tenants={tenants}
        />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProperties.map((property) => {
            const tenant = tenants.find(t => t.propertyId === property.id);
            
            return (
              <div key={property.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Home className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          property.status === 'occupied' ? 'bg-green-100 text-green-800' :
                          property.status === 'vacant' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {property.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="text-sm">{property.address}</span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <span className="text-sm">{property.city}, {property.state} {property.zipcode}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">${property.rent}/month</span>
                    </div>

                    {tenant && (
                      <div className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span className="text-sm">{tenant.name}</span>
                      </div>
                    )}

                    {tenant && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="text-sm">Lease: {new Date(tenant.leaseStart).toLocaleDateString()} - {new Date(tenant.leaseEnd).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEdit(property)}
                      className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(property.id)}
                      className="flex-1 bg-red-50 text-red-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zip Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedProperties.map((property) => {
                  const tenant = tenants.find(t => t.propertyId === property.id);
                  return (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-50 rounded-lg mr-3">
                            <Home className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{property.address}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {property.city}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {property.state}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {property.zipcode}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${property.rent}/month
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          property.status === 'occupied' ? 'bg-green-100 text-green-800' :
                          property.status === 'vacant' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {property.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant ? tenant.name : '-'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEdit(property)}
                            className="text-blue-600 hover:text-blue-900"
                            aria-label={`Edit property at ${property.address}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(property.id)}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Delete property at ${property.address}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Property Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h3>
              
              {editingProperty && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Editing this property will overwrite existing data.
                  </p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Address
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main Street, Unit A"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zipcode
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zipcode}
                    onChange={e => setFormData({ ...formData, zipcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.rent}
                    onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Property['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingProperty ? 'Update Property' : 'Add Property'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};