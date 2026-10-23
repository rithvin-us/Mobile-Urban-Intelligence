function build_models()
%BUILD_MODELS  Generates the Simulink models for the platform.
%
%   Creates two models in this folder:
%
%     quarter_car_model.slx      Bus ride dynamics: road profile in, chassis
%                                and axle vertical acceleration out. The
%                                Simulink counterpart of POTHOLE_IMU_SIM.
%
%     edge_pipeline_latency.slx  The end-to-end sensing architecture as a
%                                signal chain, from the windshield camera to
%                                the operator dashboard, with each stage's
%                                processing delay modelled so the glass-to-
%                                dashboard latency budget can be simulated.
%
%   A .slx file is a binary archive, so the models are built from this script
%   rather than edited by hand. Regenerate them at any time with:
%
%       cd('matlab sims'); build_models
%
%   Requires base MATLAB and Simulink only. No toolbox blocks are used, so the
%   models open on any Simulink installation.
%
%   See also POTHOLE_IMU_SIM.

% Copyright 2026 Mobile Urban Intelligence.

here = fileparts(mfilename('fullpath'));

fprintf('Building Simulink models in %s\n', here);
buildQuarterCar(fullfile(here, 'quarter_car_model.slx'));
buildEdgePipeline(fullfile(here, 'edge_pipeline_latency.slx'));
fprintf('Both models built.\n');
end


% ========================================================================
function buildQuarterCar(targetFile)
%BUILDQUARTERCAR  2-DOF bus ride model as a Simulink state-space block.

model = 'quarter_car_model';
prepareModel(model, targetFile);

% Same loaded-city-bus corner as pothole_imu_sim.m, so the two agree.
ms = 4500;      % sprung mass (body), kg
mu = 500;       % unsprung mass (axle, wheel), kg
ks = 4.0e5;     % suspension stiffness, N/m
cs = 2.0e4;     % suspension damping, N*s/m
kt = 1.8e6;     % tyre vertical stiffness, N/m

% State x = [zs; zs_dot; zu; zu_dot], input u = road elevation zr.
A = [        0,       1,             0,       0;
       -ks/ms,  -cs/ms,        ks/ms,   cs/ms;
             0,       0,             0,       1;
        ks/mu,   cs/mu, -(ks+kt)/mu,  -cs/mu];
B = [0; 0; 0; kt/mu];

% Outputs are the two accelerations an onboard IMU could be mounted to read:
% row 1 the chassis (sprung mass), row 2 the axle (unsprung mass).
C = [A(2,:); A(4,:)];
D = [0; kt/mu];

new_system(model);

% The road comes from qc_road_input, which synthesises an ISO 8608 class C
% profile with half-sine potholes. Driving the model from a Pulse Generator
% instead would put a step discontinuity into road elevation, and because the
% tyre stiffness term feeds the input straight through to axle acceleration,
% that produces peaks of around 100 g. No road does that. The model's PreLoadFcn
% builds the signal, so opening the model is enough to populate it.
add_block('simulink/Sources/From Workspace', [model '/Road Profile']);
set_param([model '/Road Profile'], ...
    'VariableName', 'road_ts', ...
    'SampleTime', '0', ...
    'Interpolate', 'on', ...
    'OutputAfterFinalValue', 'Holding final value');

add_block('simulink/Continuous/State-Space', [model '/Quarter Car']);
set_param([model '/Quarter Car'], ...
    'A', mat2str(A), 'B', mat2str(B), 'C', mat2str(C), 'D', mat2str(D), ...
    'X0', '[0;0;0;0]');

add_block('simulink/Math Operations/Gain', [model '/To g']);
set_param([model '/To g'], 'Gain', '1/9.81');

add_block('simulink/Sinks/To Workspace', [model '/IMU Log']);
set_param([model '/IMU Log'], 'VariableName', 'imu_accel_g', 'SaveFormat', 'Timeseries');

add_block('simulink/Sinks/Scope', [model '/Vertical Acceleration']);
set_param([model '/Vertical Acceleration'], 'NumInputPorts', '1');

add_line(model, 'Road Profile/1', 'Quarter Car/1');
add_line(model, 'Quarter Car/1',  'To g/1');
add_line(model, 'To g/1',         'IMU Log/1');
add_line(model, 'To g/1',         'Vertical Acceleration/1');

% 500 m at 40 km/h is 45 s of survey.
set_param(model, 'Solver', 'ode45', 'StopTime', '45', ...
    'SolverType', 'Variable-step', 'MaxStep', '0.001', ...
    'PreLoadFcn', 'road_ts = qc_road_input();');

finishModel(model, targetFile);
end


% ========================================================================
function buildEdgePipeline(targetFile)
%BUILDEDGEPIPELINE  The sensing architecture as a timed signal chain.
%
%   Every stage between the windshield and the operator's screen adds delay.
%   Modelling them in series turns the architecture diagram into something that
%   produces a number: the glass-to-dashboard latency, which is the figure that
%   decides whether an alert is actionable or merely historical.

model = 'edge_pipeline_latency';
prepareModel(model, targetFile);

% The budget lives in edge_stage_budget so the model and the published latency
% chart read the same numbers.
stages = edge_stage_budget();

new_system(model);

% A frame every 1/30 s. Each pulse is one frame entering the pipeline.
add_block('simulink/Sources/Pulse Generator', [model '/Frame Arrival']);
set_param([model '/Frame Arrival'], ...
    'Amplitude', '1', 'Period', '0.0333', 'PulseWidth', '20', ...
    'PulseType', 'Time based');

previous = 'Frame Arrival';
for k = 1:height(stages)
    name = stages.Name{k};
    delaySeconds = stages.Seconds(k);
    buildStageSubsystem(model, name, delaySeconds);
    add_line(model, [previous '/1'], [name '/1']);
    previous = name;
end

add_block('simulink/Signal Routing/Mux', [model '/Compare']);
set_param([model '/Compare'], 'Inputs', '2');

add_block('simulink/Sinks/Scope', [model '/Glass to Dashboard']);
set_param([model '/Glass to Dashboard'], 'NumInputPorts', '1');

add_block('simulink/Sinks/To Workspace', [model '/Latency Log']);
set_param([model '/Latency Log'], 'VariableName', 'dashboard_frame', 'SaveFormat', 'Timeseries');

% Top trace is the frame leaving the camera, bottom trace the same frame
% reaching the dashboard. The horizontal gap is the end-to-end latency.
add_line(model, 'Frame Arrival/1', 'Compare/1');
add_line(model, [previous '/1'],   'Compare/2');
add_line(model, 'Compare/1',       'Glass to Dashboard/1');
add_line(model, [previous '/1'],   'Latency Log/1');

set_param(model, 'Solver', 'ode45', 'StopTime', '1', ...
    'SolverType', 'Variable-step', 'MaxStep', '0.0005');

total = sum(stages.Seconds);
fprintf('  Modelled end-to-end latency budget: %.0f ms\n', total * 1000);

finishModel(model, targetFile);
end


function buildStageSubsystem(model, name, delaySeconds)
%BUILDSTAGESUBSYSTEM  One architecture stage: a delay wrapped in a subsystem.
%
%   Each stage is its own subsystem so the top level reads as the architecture
%   block diagram, and double-clicking a stage shows what it contributes.

path = [model '/' name];
add_block('built-in/Subsystem', path);

add_block('built-in/Inport',  [path '/In']);
add_block('built-in/Outport', [path '/Out']);

add_block('simulink/Continuous/Transport Delay', [path '/Processing Delay']);
set_param([path '/Processing Delay'], ...
    'DelayTime', num2str(delaySeconds), 'InitialOutput', '0');

add_line(path, 'In/1', 'Processing Delay/1');
add_line(path, 'Processing Delay/1', 'Out/1');

Simulink.BlockDiagram.arrangeSystem(path);
end


% ========================================================================
function prepareModel(model, targetFile)
%PREPAREMODEL  Clears the way for a rebuild.
%
%   Both steps matter. An earlier run may have left the model loaded, and the
%   previously generated .slx sitting on the path shadows the new in-memory
%   model, which Simulink warns about on every rebuild.

if bdIsLoaded(model)
    close_system(model, 0);
end
if isfile(targetFile)
    delete(targetFile);
end
end

function finishModel(model, targetFile)
%FINISHMODEL  Lays the diagram out, saves it, and closes it.
%
%   arrangeSystem is what keeps the saved diagram readable: blocks created by
%   script otherwise land stacked on top of each other at the origin.

Simulink.BlockDiagram.arrangeSystem(model);

save_system(model, targetFile);
close_system(model, 0);

fprintf('  Wrote %s\n', targetFile);
end
