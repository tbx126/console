import { useState, useCallback } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/common/Modal';
import FlightForm from '../components/travel/FlightForm';
import FlightList from '../components/travel/FlightList';
import AirlineStats from '../components/travel/AirlineStats';
import TravelStats from '../components/travel/TravelStats';
import FlightFilters from '../components/travel/FlightFilters';
import FlightToolbar from '../components/travel/FlightToolbar';
import FlightMap from '../components/travel/FlightMap';
import { useAIDataRefresh } from '../hooks/useAIDataRefresh';

const tabs = [
  { id: 'flights', label: 'Flights' },
  { id: 'stats', label: 'Statistics' },
  { id: 'map', label: 'Map' }
];

const TravelPage = () => {
  const [activeTab, setActiveTab] = useState('flights');
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    dateRange: 'thisYear',
    airlines: []
  });
  const [availableAirlines, setAvailableAirlines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState('grid');

  const handleFlightSuccess = () => {
    setShowFlightModal(false);
    setEditingFlight(null);
    setRefreshKey((previous) => previous + 1);
  };

  const handleEditFlight = (flight) => {
    setEditingFlight(flight);
    setShowFlightModal(true);
  };

  const handleCloseModal = () => {
    setShowFlightModal(false);
    setEditingFlight(null);
  };

  const handleDataUpdate = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  useAIDataRefresh(handleDataUpdate);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Travel</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Log your flights and track statistics</p>
            </div>
            <Button onClick={() => setShowFlightModal(true)} className="mt-1">
              <Plus className="h-4 w-4 mr-2" />
              Add Flight
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <TravelStats refresh={refreshKey} />
      </div>

      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="flex gap-6">
          {activeTab === 'flights' && (
            <div className="hidden md:block">
              <FlightFilters
                filters={filters}
                onFilterChange={setFilters}
                availableAirlines={availableAirlines}
              />
            </div>
          )}

          <div className="flex-1 space-y-6">
            {activeTab === 'flights' && (
              <>
                <div className="md:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setShowMobileFilters(true)}
                    className="w-full"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>

                <FlightToolbar
                  searchQuery={searchQuery}
                  sortBy={sortBy}
                  viewMode={viewMode}
                  onSearchChange={setSearchQuery}
                  onSortChange={setSortBy}
                  onViewModeChange={setViewMode}
                />
              </>
            )}

            {activeTab === 'flights' && (
              <Card className="shadow-sm">
                <FlightList
                  refresh={refreshKey}
                  filters={filters}
                  searchQuery={searchQuery}
                  sortBy={sortBy}
                  viewMode={viewMode}
                  onEdit={handleEditFlight}
                  onAirlinesLoaded={setAvailableAirlines}
                />
              </Card>
            )}

            {activeTab === 'stats' && (
              <Card className="shadow-sm">
                <AirlineStats />
              </Card>
            )}

            {activeTab === 'map' && (
              <Card className="shadow-sm p-6">
                <FlightMap />
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showFlightModal}
        onClose={handleCloseModal}
        title={editingFlight ? 'Edit Flight' : 'Add New Flight'}
      >
        <FlightForm
          flight={editingFlight}
          onSuccess={handleFlightSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Flight Filters"
      >
        <FlightFilters
          filters={filters}
          onFilterChange={setFilters}
          availableAirlines={availableAirlines}
        />
      </Modal>
    </div>
  );
};

export default TravelPage;
