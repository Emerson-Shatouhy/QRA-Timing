'use client';
import { Race, RaceStatus, RaceType } from "../../utils/types/race";

interface RaceDetailsSidebarProps {
  race: Race;
}

export default function RaceDetailsSidebar({ race }: RaceDetailsSidebarProps) {
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDistance = (meters: number | null): string => {
    if (!meters) return 'Not specified';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${meters}m`;
  };

  const getStatusColor = (status: RaceStatus | null): string => {
    switch (status) {
      case RaceStatus.SCHEDULED:
        return 'bg-blue-100 text-blue-800';
      case RaceStatus.READY:
        return 'bg-yellow-100 text-yellow-800';
      case RaceStatus.STARTED:
        return 'bg-green-100 text-green-800';
      case RaceStatus.FINISHED:
        return 'bg-gray-100 text-gray-800';
      case RaceStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case RaceStatus.ABANDONED:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-50 text-gray-500';
    }
  };

  const formatRaceType = (type: RaceType | null): string => {
    switch (type) {
      case RaceType.TIME_TRIAL:
        return 'Time Trial';
      case RaceType.HEAD_RACE:
        return 'Head Race';
      case RaceType.SPRINT:
        return 'Sprint';
      default:
        return 'Not specified';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Race Details</h2>
        
        <div className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {race.race_name || 'Unnamed Race'}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(race.race_status)}`}>
                {race.race_status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Type</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatRaceType(race.race_type)}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Event Date</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(race.event_date)}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Scheduled Start</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatTime(race.scheduled_start)}
            </dd>
          </div>

          {race.actual_start && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Actual Start</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatTime(race.actual_start)}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">Distance</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDistance(race.distance_meters)}
            </dd>
          </div>

          {race.max_entries && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Max Entries</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {race.max_entries}
              </dd>
            </div>
          )}

          {race.weather_conditions && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Weather Conditions</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {race.weather_conditions}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(race.created_at)}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}