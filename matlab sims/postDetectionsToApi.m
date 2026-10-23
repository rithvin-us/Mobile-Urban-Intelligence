function posted = postDetectionsToApi(apiBase, busId)
%POSTDETECTIONSTOAPI  Push simulated hazard detections into the live backend.
%
%   POSTED = POSTDETECTIONSTOAPI() reads output/detections.json, written by
%   POTHOLE_IMU_SIM, and posts each entry to POST /api/events on
%   http://localhost:8000. It returns the number of events the backend accepted.
%
%   POSTED = POSTDETECTIONSTOAPI(APIBASE, BUSID) targets a different backend and
%   overrides the originating bus id.
%
%   The point of this bridge is that the MATLAB simulation is not a side exhibit:
%   a corridor surveyed in simulation shows up on the operator dashboard through
%   the same ingestion path an NVIDIA Jetson edge unit uses.
%
%   Start the backend first:
%       uvicorn app.main:app --host 0.0.0.0 --port 8000
%
%   See also POTHOLE_IMU_SIM.

% Copyright 2026 Mobile Urban Intelligence.

arguments
    apiBase (1,1) string = "http://localhost:8000"
    busId   (1,1) string = "bus-001"
end

here = fileparts(mfilename('fullpath'));
payloadFile = fullfile(here, 'output', 'detections.json');
if ~isfile(payloadFile)
    error('postDetectionsToApi:noPayload', ...
        'No detections found at %s. Run pothole_imu_sim first.', payloadFile);
end

% Refuse to start unless the backend actually answers, so a failed demo fails
% here with a clear message rather than halfway through a POST loop.
health = weboptions('Timeout', 5, 'ContentType', 'json');
try
    status = webread(char(apiBase + "/health"), health);
catch err
    error('postDetectionsToApi:unreachable', ...
        'Backend at %s did not answer /health: %s', apiBase, err.message);
end
if ~isfield(status, 'status') || ~strcmp(status.status, 'healthy')
    error('postDetectionsToApi:unhealthy', 'Backend at %s reports unhealthy.', apiBase);
end
fprintf('Backend %s is healthy (%s v%s)\n', apiBase, status.service, status.version);

events = jsondecode(fileread(payloadFile));
if isempty(events)
    fprintf('detections.json holds no events; nothing to post.\n');
    posted = 0;
    return
end

opts = weboptions('MediaType', 'application/json', 'Timeout', 15, ...
                  'ContentType', 'json', 'RequestMethod', 'post');
url = char(apiBase + "/api/events");

posted = 0;
failed = 0;
for k = 1:numel(events)
    body = events(k);
    body.bus_id = char(busId);
    try
        webwrite(url, body, opts);
        posted = posted + 1;
    catch err
        failed = failed + 1;
        if failed <= 3
            fprintf(2, 'Event %d rejected: %s\n', k, err.message);
        end
    end
end

fprintf('Posted %d of %d events to %s (%d failed)\n', ...
    posted, numel(events), url, failed);
end
