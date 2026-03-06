function PreferenceCard({
  preference,
  isExpanded,
  onToggle,
  onToggleActiveStatus,
  isStatusUpdating,
}) {
  const handleStatusToggle = (e) => {
    e.stopPropagation();
    onToggleActiveStatus(!preference.is_active);
  };

  return (
    <div>
      <style>{`
        @keyframes expandDown {
          from {
            opacity: 0;
            max-height: 0;
            overflow: hidden;
          }
          to {
            opacity: 1;
            max-height: 1000px;
            overflow: visible;
          }
        }

        .expand-section {
          animation: expandDown 0.3s ease-out;
        }

        .card-hover {
          transition: all 0.2s ease-out;
        }

        .card-hover:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .status-button {
          transition: all 0.2s ease-out;
        }

        .status-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .status-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .chevron-rotate {
          transition: transform 0.3s ease-out;
        }
      `}</style>

      <div
        className="border border-botanical-accent rounded-lg overflow-hidden card-hover cursor-pointer"
        onClick={onToggle}
      >
        <div className="bg-botanical-accent/10 p-4">
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
              <div>
                <p className="text-botanical-subtext text-sm">From</p>
                <p className="font-semibold text-lg text-botanical-subtext">{preference.origin}</p>
              </div>
              <div>
                <p className="text-botanical-subtext text-sm">To</p>
                <p className="font-semibold text-lg text-botanical-subtext">{preference.destination}</p>
              </div>
              <div>
                <p className="text-botanical-subtext text-sm">Departure</p>
                <p className="font-semibold text-lg text-botanical-subtext">{preference.departure_period}</p>
              </div>
              <div>
                <p className="text-botanical-subtext text-sm">Budget</p>
                <p className="font-semibold text-lg text-botanical-subtext">{preference.budget ? `$${preference.budget}` : 'Not specified'}</p>
              </div>
            </div>
            <div className="ml-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleStatusToggle}
                disabled={isStatusUpdating}
                className={`px-3 py-1 rounded-md text-sm font-medium transition status-button ${
                  preference.is_active
                    ? 'bg-botanical-accent text-botanical-subtext hover:bg-botanical-accent/80'
                    : 'border border-botanical-accent bg-botanical-accent/20 text-botanical-subtext hover:bg-botanical-accent/30'
                } ${isStatusUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isStatusUpdating
                  ? 'Updating...'
                  : preference.is_active
                    ? 'Make Inactive'
                    : 'Make Active'}
              </button>
              <div className={`text-botanical-accent chevron-rotate ${isExpanded ? 'transform rotate-180' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-botanical-accent p-4 bg-white expand-section">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-botanical-subtext mb-4">Flight Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-botanical-subtext text-sm">Return</p>
                  <p className="font-medium text-botanical-subtext">{preference.return_period || 'Not specified (one-way)'}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Max Stops</p>
                  <p className="font-medium text-botanical-subtext">{preference.max_stops}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Cabin Class</p>
                  <p className="font-medium capitalize text-botanical-subtext">{preference.cabin_class}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Date Flexibility</p>
                  <p className="font-medium capitalize text-botanical-subtext">{preference.date_flexibility}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Priority</p>
                  <p className="font-medium capitalize text-botanical-subtext">{preference.priority}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Nearby Airports</p>
                  <p className="font-medium text-botanical-subtext">{preference.nearby_airports ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Prefer Non-Work Days</p>
                  <p className="font-medium text-botanical-subtext">{preference.prefer_non_work_days ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-botanical-subtext mb-4">Preference Information</h3>
              <div className="space-y-3">
                {preference.additional_context && (
                  <div>
                    <p className="text-botanical-subtext text-sm">Additional Context</p>
                    <p className="font-medium text-botanical-subtext">{preference.additional_context}</p>
                  </div>
                )}
                <div>
                  <p className="text-botanical-subtext text-sm">Alert Frequency</p>
                  <p className="font-medium text-botanical-subtext">{preference.alert_frequency}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Status</p>
                  <p className="font-medium text-botanical-subtext">{preference.is_active ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Created</p>
                  <p className="font-medium text-botanical-subtext">{new Date(preference.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-botanical-subtext text-sm">Last Updated</p>
                  <p className="font-medium text-botanical-subtext">{new Date(preference.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PreferenceCard;
