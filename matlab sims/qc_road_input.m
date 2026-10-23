function road_ts = qc_road_input(roadClass, speedKmph, lengthM, seed)
%QC_ROAD_INPUT  Road elevation input for quarter_car_model.slx.
%
%   ROAD_TS = QC_ROAD_INPUT() returns a timeseries of road elevation in metres
%   against time in seconds, for a bus travelling at a constant speed over a
%   synthesised road. quarter_car_model.slx calls this from its PreLoadFcn, so
%   opening the model populates the input automatically.
%
%   ROAD_TS = QC_ROAD_INPUT(CLASS, SPEEDKMPH, LENGTHM, SEED) overrides the
%   defaults: ISO 8608 class "C", 40 km/h, 500 m and seed 20261024.
%
%   The profile is generated the same way as in POTHOLE_IMU_SIM: white phase
%   shaped by the ISO 8608 displacement PSD, with half-sine potholes
%   superimposed. The logic is repeated here rather than shared, because
%   POTHOLE_IMU_SIM keeps its generator as a local function and is already
%   verified; a Simulink input file is not a good reason to restructure it.
%
%   A step change in road elevation would be unphysical and would feed straight
%   through the tyre stiffness into the axle acceleration, producing peaks of
%   tens of g that no real road generates. Every feature here is continuous.
%
%   See also BUILD_MODELS, POTHOLE_IMU_SIM.

% Copyright 2026 Mobile Urban Intelligence.

arguments
    roadClass (1,1) string = "C"
    speedKmph (1,1) double = 40
    lengthM   (1,1) double = 500
    seed      (1,1) double = 20261024
end

rng(seed);

v = speedKmph / 3.6;
dx = 0.05;

% Geometric-mean Gd(n0) per ISO 8608 class, m^3, at n0 = 0.1 cycles/m.
gdTable = struct('A', 16e-6, 'B', 64e-6, 'C', 256e-6, 'D', 1024e-6, 'E', 4096e-6);
gd0 = gdTable.(char(roadClass));
n0 = 0.1;

N = 2 * ceil(lengthM / dx / 2);
L = N * dx;
dn = 1 / L;
n = (0:N/2).' * dn;

gd = zeros(size(n));
band = n >= 0.01 & n <= 10;
gd(band) = gd0 * (n(band) / n0).^(-2);

amp = sqrt(2 * gd * dn);
X = zeros(N, 1);
X(1:N/2+1) = (N/2) * amp .* exp(1i * 2*pi*rand(size(n)));
X(1) = 0;
X(N/2+2:N) = conj(X(N/2:-1:2));

x = (0:N-1).' * dx;
z = real(ifft(X));

% Three potholes at fixed chainage, as half-sine depressions.
potholes = [120, 0.075, 0.8;     % chainage m, depth m, length m
            260, 0.110, 1.1;
            400, 0.050, 0.5];
for k = 1:size(potholes, 1)
    x0 = potholes(k, 1);
    d  = potholes(k, 2);
    l  = potholes(k, 3);
    inDefect = x >= x0 & x <= x0 + l;
    z(inDefect) = z(inDefect) - d * sin(pi * (x(inDefect) - x0) / l);
end

% Resample from distance to time at the survey speed. 1 kHz is comfortably
% above the ~15 Hz wheel-hop mode the model resolves.
fs = 1000;
t = (0:1/fs:(lengthM / v)).';
zt = interp1(x, z, v * t, 'linear', 'extrap');

road_ts = timeseries(zt, t, 'Name', 'road_elevation_m');
end
