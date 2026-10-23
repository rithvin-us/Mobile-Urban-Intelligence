function results = run_models()
%RUN_MODELS  Simulates both Simulink models and reports the headline numbers.
%
%   RESULTS = RUN_MODELS() runs quarter_car_model and edge_pipeline_latency,
%   prints a summary, and returns the figures as a struct. Building a model and
%   running one are different things, so this is what proves the models work.
%
%   Build the models first if they are not present:
%
%       build_models
%
%   See also BUILD_MODELS, POTHOLE_IMU_SIM.

% Copyright 2026 Mobile Urban Intelligence.

here = fileparts(mfilename('fullpath'));
oldFolder = cd(here);
restoreFolder = onCleanup(@() cd(oldFolder));

fprintf('--- Simulink model verification ---\n');

%% Quarter car ride dynamics
% The model's PreLoadFcn builds this too, so opening the model by hand works.
% Assigning it here as well means the run does not depend on load callbacks
% having fired, which they have not if the model was already in memory.
assignin('base', 'road_ts', qc_road_input());

out = sim('quarter_car_model');
accel = out.imu_accel_g.Data;
chassisRms = sqrt(mean(accel(:,1).^2));
chassisPeak = max(abs(accel(:,1)));
axlePeak = max(abs(accel(:,2)));

fprintf('quarter_car_model      : %d samples\n', size(accel, 1));
fprintf('  chassis vertical     : %.3f g RMS, %.2f g peak\n', chassisRms, chassisPeak);
fprintf('  axle vertical        : %.2f g peak\n', axlePeak);

%% End-to-end sensing latency
out = sim('edge_pipeline_latency');
frame = out.dashboard_frame;
firstArrival = frame.Time(find(frame.Data > 0.5, 1));

fprintf('edge_pipeline_latency  : first frame on the dashboard at %.0f ms\n', ...
    firstArrival * 1000);

results = struct( ...
    'chassis_rms_g', chassisRms, ...
    'chassis_peak_g', chassisPeak, ...
    'axle_peak_g', axlePeak, ...
    'glass_to_dashboard_ms', firstArrival * 1000);

fprintf('--- both models simulated ---\n');
end
