import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, ShieldCheck, MapPin } from 'lucide-react';

export interface DefectCluster {
  cluster_id: string;
  event_type: string;
  center_latitude: number;
  center_longitude: number;
  detection_count: number;
  max_confidence: number;
  verification_status: string;
  buses_involved: string[];
}

interface ClusterViewProps {
  clusters: DefectCluster[];
}

export const ClusterView: React.FC<ClusterViewProps> = ({ clusters }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <span>Verified Municipal Defect Clusters</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {clusters.length} Cluster Work Orders
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[320px] overflow-y-auto">
        {clusters.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No spatial clusters formed yet. Multiple bus detections over identical coordinates will form verified work orders.
          </p>
        ) : (
          clusters.map((c) => (
            <div
              key={c.cluster_id}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{c.event_type}</span>
                  <Badge variant={c.detection_count >= 2 ? "success" : "secondary"}>
                    {c.detection_count >= 2 ? "VERIFIED (MULTI-BUS)" : "UNVERIFIED"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {c.center_latitude}, {c.center_longitude}
                  </span>
                  <span>•</span>
                  <span>Buses: {c.buses_involved.length}</span>
                  <span>•</span>
                  <span>Max Conf: {(c.max_confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {c.detection_count}x
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Detections</div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
