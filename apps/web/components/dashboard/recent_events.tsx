import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DetectionEvent } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface RecentEventsProps {
  events: DetectionEvent[];
}

export const RecentEvents: React.FC<RecentEventsProps> = ({ events }) => {
  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          Recent Edge Detection Events
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[380px] space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No detection events recorded yet.</p>
        ) : (
          events.slice(0, 15).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/50 transition-colors text-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{event.event_type}</span>
                  <Badge variant={getSeverityBadgeVariant(event.severity)}>
                    {event.severity}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Bus: {event.bus_id}</span>
                  <span>•</span>
                  <span>Conf: {(event.confidence * 100).toFixed(0)}%</span>
                  <span>•</span>
                  <span>{formatTimestamp(event.timestamp)}</span>
                </div>
              </div>
              {event.evidence_url && (
                <a
                  href={event.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  title="View Evidence Image"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
