function plot_models()
%PLOT_MODELS  Presentation figures from the Simulink simulation results.
%
%   PLOT_MODELS() simulates both models and writes three PNGs to ./output:
%
%     fig_sim_quarter_car.png   Road input and the resulting chassis and axle
%                               vertical acceleration, with a zoom on a single
%                               pothole strike.
%     fig_sim_latency.png       Camera frame against the same frame arriving at
%                               the dashboard, plus the per-stage latency
%                               breakdown.
%     fig_sim_validation.png    The Simulink model against the independent
%                               MATLAB implementation, which is the figure that
%                               actually argues the model is correct.
%
%   Build the models first if they are not present:
%
%       build_models
%
%   See also BUILD_MODELS, RUN_MODELS, EDGE_STAGE_BUDGET.

% Copyright 2026 Mobile Urban Intelligence.

here = fileparts(mfilename('fullpath'));
oldFolder = cd(here);
restoreFolder = onCleanup(@() cd(oldFolder));

outDir = fullfile(here, 'output');
if ~isfolder(outDir)
    mkdir(outDir);
end

fprintf('--- Generating Simulink result figures ---\n');

plotQuarterCar(outDir);
plotLatency(outDir);
plotValidation(outDir);

fprintf('--- figures written to %s ---\n', outDir);
end


% ========================================================================
function plotQuarterCar(outDir)
%PLOTQUARTERCAR  Road input and the accelerations it produces.

road = qc_road_input();
assignin('base', 'road_ts', road);
out = sim('quarter_car_model');

t = out.imu_accel_g.Time;
accel = out.imu_accel_g.Data;
chassis = accel(:,1);
axle = accel(:,2);

% The second pothole sits at 260 m, which at 40 km/h is 23.4 s in. Zooming on a
% single strike is what shows the mechanism: the axle spikes first and hard, the
% body follows later and softer, because the suspension is doing its job.
vMps = 40 / 3.6;
strikeTime = 260 / vMps;
window = [strikeTime - 0.8, strikeTime + 1.6];

f = figure('Visible', 'off', 'Position', [100 100 1180 860]);
tl = tiledlayout(f, 3, 1, 'TileSpacing', 'compact', 'Padding', 'compact');
title(tl, sprintf(['Simulink quarter-car: ISO 8608 class C road at 40 km/h\n' ...
    'chassis %.3f g RMS, %.2f g peak   |   axle %.1f g peak'], ...
    sqrt(mean(chassis.^2)), max(abs(chassis)), max(abs(axle))), ...
    'FontWeight', 'bold');

ax1 = nexttile(tl);
plot(ax1, road.Time, road.Data * 1000, 'LineWidth', 0.7);
ylabel(ax1, 'Road (mm)');
grid(ax1, 'on');
xlim(ax1, [0 road.Time(end)]);
title(ax1, 'Model input: road elevation, with three potholes at 120 m, 260 m and 400 m');

ax2 = nexttile(tl);
plot(ax2, t, chassis, 'LineWidth', 0.7);
ylabel(ax2, 'Chassis (g)');
grid(ax2, 'on');
xlim(ax2, [0 t(end)]);
xlabel(ax2, 'Time (s)');
title(ax2, 'Model output: vertical acceleration at the sprung mass, where the IMU sits');

ax3 = nexttile(tl);
plot(ax3, t, axle, 'LineWidth', 1.0, 'DisplayName', 'axle (unsprung)');
hold(ax3, 'on');
plot(ax3, t, chassis, 'LineWidth', 1.4, 'DisplayName', 'chassis (sprung)');
hold(ax3, 'off');
xlim(ax3, window);
grid(ax3, 'on');
xlabel(ax3, 'Time (s)');
ylabel(ax3, 'Acceleration (g)');
legend(ax3, 'Location', 'northeast');
title(ax3, 'Zoom on the 110 mm pothole at 260 m: axle spikes first, body responds after');

exportgraphics(f, fullfile(outDir, 'fig_sim_quarter_car.png'), 'Resolution', 150);
close(f);
fprintf('  fig_sim_quarter_car.png\n');
end


% ========================================================================
function plotLatency(outDir)
%PLOTLATENCY  Glass-to-dashboard delay, and where it is spent.

out = sim('edge_pipeline_latency');
dashboard = out.dashboard_frame;

% Rebuild the camera-side pulse train analytically. It is the model's own
% source, so it needs no second simulation to reproduce.
period = 0.0333;
dutyFraction = 0.20;
tCam = linspace(0, 0.5, 20001).';
camera = double(mod(tCam, period) < period * dutyFraction);

stages = edge_stage_budget();
total = sum(stages.Seconds);

% Measured, not assumed: the first moment the signal actually rises at the far
% end of the chain.
measured = dashboard.Time(find(dashboard.Data > 0.5, 1));

f = figure('Visible', 'off', 'Position', [100 100 1180 820]);
tl = tiledlayout(f, 2, 1, 'TileSpacing', 'compact', 'Padding', 'compact');
title(tl, sprintf('Simulink sensing pipeline: glass-to-dashboard latency %.0f ms', ...
    measured * 1000), 'FontWeight', 'bold');

ax1 = nexttile(tl);
plot(ax1, tCam * 1000, camera, 'LineWidth', 1.6, 'DisplayName', 'frame at the camera');
hold(ax1, 'on');
plot(ax1, dashboard.Time * 1000, dashboard.Data, 'LineWidth', 1.6, ...
    'DisplayName', 'same frame at the dashboard');

% Annotate the gap between the first camera pulse and its arrival.
yArrow = 0.5;
plot(ax1, [0, measured * 1000], [yArrow yArrow], 'k--', 'LineWidth', 1.2, ...
    'HandleVisibility', 'off');
text(ax1, measured * 1000 / 2, yArrow + 0.08, sprintf('%.0f ms', measured * 1000), ...
    'HorizontalAlignment', 'center', 'FontWeight', 'bold');
hold(ax1, 'off');
xlim(ax1, [0 500]);
ylim(ax1, [-0.1 1.25]);
grid(ax1, 'on');
xlabel(ax1, 'Time (ms)');
ylabel(ax1, 'Frame present');
legend(ax1, 'Location', 'northeast');
title(ax1, 'Every frame reaches the operator shifted by the pipeline delay');

ax2 = nexttile(tl);
ms = stages.Seconds * 1000;
barh(ax2, ms);
set(ax2, 'YTick', 1:height(stages), 'YTickLabel', stages.Name, 'YDir', 'reverse');
xlabel(ax2, 'Latency contribution (ms)');
grid(ax2, 'on');
for k = 1:height(stages)
    text(ax2, ms(k) + 1.5, k, sprintf('%.0f ms  (%.0f%%)', ms(k), 100 * ms(k) / (total*1000)), ...
        'VerticalAlignment', 'middle');
end
xlim(ax2, [0 max(ms) * 1.35]);
title(ax2, 'Where the delay is spent: the LTE uplink dominates, not the AI');

exportgraphics(f, fullfile(outDir, 'fig_sim_latency.png'), 'Resolution', 150);
close(f);
fprintf('  fig_sim_latency.png\n');
end


% ========================================================================
function plotValidation(outDir)
%PLOTVALIDATION  Simulink against the independent MATLAB implementation.
%
%   This is the figure that argues correctness. A model agreeing with itself
%   proves nothing; two implementations written differently, agreeing on the
%   same physics, is evidence. The Simulink model integrates a state-space
%   block; pothole_imu_sim discretises the same system with expm and steps it
%   in a loop. Neither shares code with the other.

road = qc_road_input();
assignin('base', 'road_ts', road);
out = sim('quarter_car_model');
simulinkAccel = out.imu_accel_g.Data(:,1);
simulinkRms = sqrt(mean(simulinkAccel.^2));
simulinkPeak = max(abs(simulinkAccel));

% Export is off so this does not overwrite the detector figures.
script = pothole_imu_sim('Export', false);
scriptAccel = script.signals.aSprung / 9.81;
scriptRms = sqrt(mean(scriptAccel.^2));
scriptPeak = max(abs(scriptAccel));

rmsPair = [scriptRms, simulinkRms];
peakPair = [scriptPeak, simulinkPeak];
rmsDelta = 100 * abs(diff(rmsPair)) / mean(rmsPair);

f = figure('Visible', 'off', 'Position', [100 100 1000 480]);
tl = tiledlayout(f, 1, 2, 'TileSpacing', 'compact', 'Padding', 'compact');
title(tl, sprintf(['Cross-validation: two independent implementations, same physics\n' ...
    'chassis RMS agrees to %.1f%%'], rmsDelta), 'FontWeight', 'bold');

labels = categorical({'MATLAB script', 'Simulink model'});
labels = reordercats(labels, {'MATLAB script', 'Simulink model'});

ax1 = nexttile(tl);
b = bar(ax1, labels, rmsPair);
ylabel(ax1, 'Chassis vertical acceleration (g RMS)');
grid(ax1, 'on');
ylim(ax1, [0 max(rmsPair) * 1.45]);
text(ax1, 1:2, rmsPair, compose('%.3f g', rmsPair), ...
    'HorizontalAlignment', 'center', 'VerticalAlignment', 'bottom', 'FontWeight', 'bold');
title(ax1, 'RMS ride acceleration');
b.FaceAlpha = 0.85;

ax2 = nexttile(tl);
b2 = bar(ax2, labels, peakPair);
ylabel(ax2, 'Chassis vertical acceleration (g peak)');
grid(ax2, 'on');
ylim(ax2, [0 max(peakPair) * 1.45]);
text(ax2, 1:2, peakPair, compose('%.2f g', peakPair), ...
    'HorizontalAlignment', 'center', 'VerticalAlignment', 'bottom', 'FontWeight', 'bold');
title(ax2, 'Peak pothole strike');
b2.FaceAlpha = 0.85;

exportgraphics(f, fullfile(outDir, 'fig_sim_validation.png'), 'Resolution', 150);
close(f);
fprintf('  fig_sim_validation.png  (RMS %.3f vs %.3f g, %.1f%% apart)\n', ...
    scriptRms, simulinkRms, rmsDelta);
end
