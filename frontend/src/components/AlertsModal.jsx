import { useState, useEffect } from 'react';

function AlertsModal({ isOpen, onClose, alerts, loading, error, preference }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`
        @keyframes fadeInBackdrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes expandDetails {
          from {
            opacity: 0;
            max-height: 0;
            overflow: hidden;
          }
          to {
            opacity: 1;
            max-height: 500px;
            overflow: visible;
          }
        }

        @keyframes fadeOutBackdrop {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes modalSlideOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
        }

        .modal-backdrop {
          animation: fadeInBackdrop 0.3s ease-out;
        }

        .modal-backdrop.closing {
          animation: fadeOutBackdrop 0.3s ease-out forwards;
        }

        .modal-content {
          animation: modalSlideIn 0.35s ease-out;
        }

        .modal-content.closing {
          animation: modalSlideOut 0.3s ease-out forwards;
        }

        .details-expanded {
          animation: expandDetails 0.3s ease-out;
        }
      `}</style>
      <div
        className={`absolute inset-0 bg-black/40 modal-backdrop ${isClosing ? 'closing' : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl border border-botanical-accent modal-content ${isClosing ? 'closing' : ''}`}>
        <div className="flex items-center justify-between border-b border-botanical-accent/40 px-5 py-4 bg-botanical-accent/10">
          <div>
            <h3 className="text-lg font-semibold text-botanical-subtext">Alert History</h3>
            {preference && (
              <p className="text-sm text-botanical-subtext/80">
                {preference.origin} to {preference.destination}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-botanical-accent/50 px-3 py-1.5 text-sm font-medium text-botanical-subtext hover:bg-botanical-accent/20 cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-5">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-botanical-accent" />
              <p className="text-botanical-subtext mt-4">Loading alerts...</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-botanical-error border border-botanical-error-text rounded-lg p-4">
              <p className="text-botanical-error-text">Error loading alerts: {error}</p>
            </div>
          )}

          {!loading && !error && alerts.length === 0 && (
            <div className="border border-botanical-accent/40 rounded-lg p-6 bg-botanical-accent/5">
              <p className="text-botanical-subtext font-medium">No alerts found for this preference yet.</p>
              <p className="text-sm text-botanical-subtext/80 mt-1">
                Alerts will appear here after monitoring runs and creates notifications.
              </p>
            </div>
          )}

          {!loading && !error && alerts.length > 0 && (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <article key={alert.id} className="rounded-lg border border-botanical-accent/40 bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-botanical-accent/5 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-botanical-subtext/70">
                      Sent {new Date(alert.sent_at).toLocaleString()}
                    </span>
                    {alert.reference_price !== null && alert.reference_price !== undefined && (
                      <span className="text-xs text-botanical-subtext/70">
                        Baseline: ${Number(alert.reference_price).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="px-4 py-3 border-b border-botanical-accent/20">
                    <h4 className="text-base font-semibold text-botanical-subtext">{alert.email_subject}</h4>
                  </div>

                  <details className="p-4">
                    <summary className="cursor-pointer text-sm font-medium text-botanical-subtext hover:text-botanical-accent transition-colors">
                      View full email
                    </summary>
                    <div className="mt-3 details-expanded">
                      <iframe
                        title={`email-preview-${alert.id}`}
                        srcDoc={alert.email_body_html || '<p>No email HTML available.</p>'}
                        className="h-[550px] w-full rounded border border-botanical-accent/30 bg-white"
                      />
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertsModal;
