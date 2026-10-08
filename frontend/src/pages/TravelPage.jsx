import { useState, useCallback } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedTabs } from '../components/ui/SegmentedTabs';
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
  { id: 'flights', label: '航班' },
  { id: 'stats', label: '统计' },
  { id: 'map', label: '地图' }
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
    <div className="page">
      <PageHeader
        eyebrow="Travel log"
        title="旅行"
        description="航班记录、航线地图与航司统计。"
        actions={
          <Button onClick={() => setShowFlightModal(true)}>
            <Plus />
            添加航班
          </Button>
        }
      />

      <div className="mb-5">
        <TravelStats refresh={refreshKey} />
      </div>

      <SegmentedTabs className="mb-5" label="旅行视图" tabs={tabs} value={activeTab} onChange={setActiveTab} />

      <div>
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
                    <Filter />
                    筛选
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
              <Card>
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
              <Card>
                <AirlineStats />
              </Card>
            )}

            {activeTab === 'map' && (
              <Card className="p-6">
                <FlightMap />
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showFlightModal}
        onClose={handleCloseModal}
        title={editingFlight ? '编辑航班' : '添加航班'}
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
        title="航班筛选"
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
