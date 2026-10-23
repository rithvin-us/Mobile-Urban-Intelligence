function stages = edge_stage_budget()
%EDGE_STAGE_BUDGET  Per-stage latency budget of the onboard sensing chain.
%
%   STAGES = EDGE_STAGE_BUDGET() returns a table with one row per processing
%   stage between the windshield camera and the operator's screen, holding the
%   stage name, its delay in seconds, and the hardware or software it refers to.
%
%   Both BUILD_MODELS and PLOT_MODELS read the budget from here, so the
%   simulated model and the published chart cannot drift apart.
%
%   The inference figure is for a TensorRT INT8 YOLOv8n engine on a Jetson Orin
%   Nano. The uplink figure is a typical Indian 4G LTE round trip, and it
%   dominates everything the edge unit does, which is the quantitative argument
%   for running inference onboard instead of streaming video to a server.
%
%   See also BUILD_MODELS, PLOT_MODELS.

% Copyright 2026 Mobile Urban Intelligence.

name = {
    'Camera Capture'
    'Edge Inference'
    'Object Tracking'
    'Event Engine'
    'LTE Uplink'
    'Cloud Ingest'
    };

seconds = [0.005; 0.022; 0.004; 0.002; 0.085; 0.012];

basis = {
    'Sony STARVIS, 1080p 60 FPS'
    'TensorRT INT8 YOLOv8n, Jetson Orin Nano'
    'ByteTrack multi-object association'
    'Severity grading and deduplication'
    'Quectel RM500Q, HTTPS POST to backend'
    'FastAPI validation and PostGIS write'
    };

stages = table(name, seconds, basis, ...
    'VariableNames', {'Name', 'Seconds', 'Basis'});
end
