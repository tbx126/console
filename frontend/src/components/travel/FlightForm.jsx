import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import travelApi from '../../services/travelApi';

const FlightForm = ({ flight, onSuccess, onCancel }) => {
  const isEditMode = Boolean(flight);
  const [formData, setFormData] = useState({
    airline: flight?.airline || '',
    airline_code: flight?.airline_code || '',
    flight_number: flight?.flight_number || '',
    origin: flight?.origin || '',
    destination: flight?.destination || '',
    date: flight?.date || new Date().toISOString().split('T')[0],
    departure_time: flight?.departure_time || '',
    arrival_time: flight?.arrival_time || '',
    distance: flight?.distance || '',
    cost: flight?.cost || '',
    travel_class: flight?.travel_class || 'economy',
    seat: flight?.seat || '',
    notes: flight?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const flightData = {
        ...formData,
        distance: formData.distance ? parseFloat(formData.distance) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null
      };

      if (isEditMode) {
        await travelApi.updateFlight(flight.id, flightData);
      } else {
        await travelApi.createFlight(flightData);
      }

      onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || (isEditMode ? '航班更新失败' : '航班创建失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      const updated = { ...previous, [name]: value };

      if (name === 'flight_number' && value) {
        const match = value.toUpperCase().match(/^([A-Z]{2,3})/);
        if (match) {
          updated.airline_code = match[1];
        }
      }

      return updated;
    });
  };

  const handleLookup = async () => {
    if (!formData.flight_number || !formData.date) {
      setError('请先填写航班号和日期');
      return;
    }

    setLookupLoading(true);
    setLookupResult(null);
    setError(null);

    try {
      const result = await travelApi.lookupFlight(formData.flight_number, formData.date);
      setLookupResult(result);

      if (result.success && result.data) {
        const data = result.data;
        setFormData((previous) => ({
          ...previous,
          airline: data.airline_name || data.airline_code || previous.airline,
          airline_code: data.airline_code || previous.airline_code,
          origin: data.departure_airport || previous.origin,
          destination: data.arrival_airport || previous.destination,
          departure_time: data.departure_time || previous.departure_time,
          arrival_time: data.arrival_time || previous.arrival_time,
          distance: data.distance_km || previous.distance,
        }));
      }
    } catch {
      setError('航班信息查询失败');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">自动填写航班信息</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              航班号
            </label>
            <input
              type="text"
              name="flight_number"
              value={formData.flight_number}
              onChange={handleChange}
              placeholder="例如 CA123"
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              日期
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupLoading || !formData.flight_number || !formData.date}
              className="w-full px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {lookupLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  查询中…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  查询
                </>
              )}
            </button>
          </div>
        </div>
        {lookupResult && (
          <div className={`mt-3 text-sm ${lookupResult.success ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {lookupResult.success ? `已通过 ${lookupResult.source} 找到` : lookupResult.error || '未找到该航班'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            航空公司 *
          </label>
          <input
            type="text"
            name="airline"
            value={formData.airline}
            onChange={handleChange}
            required
            placeholder="例如 新加坡航空"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            航班号 *
          </label>
          <input
            type="text"
            name="flight_number"
            value={formData.flight_number}
            onChange={handleChange}
            required
            placeholder="例如 SQ802"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            出发地 *
          </label>
          <input
            type="text"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            required
            placeholder="例如 SIN"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            目的地 *
          </label>
          <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            required
            placeholder="例如 PEK"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            日期 *
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            起飞时间
          </label>
          <input
            type="time"
            name="departure_time"
            value={formData.departure_time}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            到达时间
          </label>
          <input
            type="time"
            name="arrival_time"
            value={formData.arrival_time}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            距离（km）
          </label>
          <input
            type="number"
            name="distance"
            value={formData.distance}
            onChange={handleChange}
            step="0.01"
            min="0"
            placeholder="2500"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            费用
          </label>
          <input
            type="number"
            name="cost"
            value={formData.cost}
            onChange={handleChange}
            step="0.01"
            min="0"
            placeholder="350.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            舱位
          </label>
          <select
            name="travel_class"
            value={formData.travel_class}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="economy">经济舱</option>
            <option value="business">公务舱</option>
            <option value="first">头等舱</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          座位
        </label>
        <input
          type="text"
          name="seat"
          value={formData.seat}
          onChange={handleChange}
          placeholder="例如 12A"
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          备注
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="其他备注…"
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-700 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-600"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (isEditMode ? '保存中…' : '添加中…') : (isEditMode ? '保存修改' : '添加航班')}
        </button>
      </div>
    </form>
  );
};

export default FlightForm;
