import { DetectionEvent } from '@/types';
import { eventTypeLabel } from '@/lib/format';

export function exportDefectsToCSV(events: DetectionEvent[]) {
  if (!events || events.length === 0) {
    alert("No defect events available to export.");
    return;
  }

  const headers = ["Event ID", "Bus ID", "Defect Type", "Severity", "Latitude", "Longitude", "Confidence", "Status", "Timestamp"];
  const rows = events.map(e => [
    e.id,
    e.bus_id,
    eventTypeLabel(e.event_type),
    e.severity,
    e.latitude,
    e.longitude,
    `${(e.confidence * 100).toFixed(1)}%`,
    e.status,
    new Date(e.timestamp).toLocaleString()
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Municipal_Road_Defects_Report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
