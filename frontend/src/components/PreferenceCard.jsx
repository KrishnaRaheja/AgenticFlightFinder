function PreferenceCard({ preference, isExpanded, onToggle }) {
  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition cursor-pointer"
      onClick={onToggle}
    >
      <div className="bg-gray-50 p-4">
        <div className="flex justify-between items-start">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
            <div>
              <p className="text-gray-600 text-sm">From</p>
              <p className="font-semibold text-lg">{preference.origin}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">To</p>
              <p className="font-semibold text-lg">{preference.destination}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Departure</p>
              <p className="font-semibold text-lg">{preference.departure_period}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Budget</p>
              <p className="font-semibold text-lg">${preference.budget}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Alert Frequency</p>
              <p className="font-semibold text-lg">{preference.alert_frequency}</p>
            </div>
          </div>
          <div className={`ml-4 text-blue-600 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-4">Flight Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Return</p>
                  <p className="font-medium">{preference.return_period || 'Not specified (one-way)'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Max Stops</p>
                  <p className="font-medium">{preference.max_stops}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Cabin Class</p>
                  <p className="font-medium capitalize">{preference.cabin_class}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Date Flexibility</p>
                  <p className="font-medium capitalize">{preference.date_flexibility}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Priority</p>
                  <p className="font-medium capitalize">{preference.priority}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Nearby Airports</p>
                  <p className="font-medium">{preference.nearby_airports ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Prefer Non-Work Days</p>
                  <p className="font-medium">{preference.prefer_non_work_days ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-4">Preference Information</h3>
              <div className="space-y-3">
                {preference.additional_context && (
                  <div>
                    <p className="text-gray-600 text-sm">Additional Context</p>
                    <p className="font-medium">{preference.additional_context}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <p className="font-medium">{preference.is_active ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Created</p>
                  <p className="font-medium">{new Date(preference.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Last Updated</p>
                  <p className="font-medium">{new Date(preference.updated_at).toLocaleDateString()}</p>
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
