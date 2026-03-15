"""
STAGE 1 — Parse summary file + convert coordinates to ECEF
===========================================================
Inputs:  traj_summary CSV file, stations.csv
Outputs: df (all events), meteor start/end ECEF, station positions
"""

import numpy as np
import pandas as pd


# ─────────────────────────────────────────────
# PART A — WGS84 CONSTANTS
# ─────────────────────────────────────────────

# Earth is not a perfect sphere — slightly flattened at poles
# WGS84 is the standard model used by GPS
A  = 6_378_137.0        # equatorial radius (metres)
F  = 1 / 298.257223563  # flattening
B  = A * (1 - F)        # polar radius (metres)
E2 = 1 - (B / A)**2     # eccentricity squared


# ─────────────────────────────────────────────
# PART B — ECEF CONVERTER
# ─────────────────────────────────────────────

def geo_to_ecef(lat_deg, lon_deg, elev_m):
    """
    Convert geographic coordinates to ECEF Cartesian.

    lat_deg : latitude  (+N / -S) in degrees
    lon_deg : longitude (+E / -W) in degrees
    elev_m  : elevation above ellipsoid in metres

    Returns numpy array [x, y, z] in metres from Earth's centre.

    WHY: Geometry (triangulation, distances) requires Cartesian
         coordinates in a common 3D frame. Lat/lon/elev are useless
         for vector math.
    """
    lat = np.radians(lat_deg)
    lon = np.radians(lon_deg)

    # radius of curvature at this latitude
    # varies from ~6335km at poles to ~6378km at equator
    N = A / np.sqrt(1 - E2 * np.sin(lat)**2)

    x = (N + elev_m) * np.cos(lat) * np.cos(lon)
    y = (N + elev_m) * np.cos(lat) * np.sin(lon)
    z = (N * (1 - E2) + elev_m)    * np.sin(lat)

    return np.array([x, y, z])


# ─────────────────────────────────────────────
# PART C — LOAD STATION COORDINATES FROM CSV
# ─────────────────────────────────────────────

def load_stations(filepath='stations.csv'):
    """
    Load all station coordinates from stations.csv.

    CSV format:
        station_id, lat, lon, elev, location
        US0001, 35.1008, -106.5683, 1615, Albuquerque NM USA

    Returns dict:
        { 'US0001': {'lat': 35.1008, 'lon': -106.5683, 'elev': 1615}, ... }

    WHY: Dynamic loading means adding new stations
         requires only updating the CSV — no code changes.
    """
    try:
        df = pd.read_csv(filepath)
        stations = df.set_index('station_id')[['lat', 'lon', 'elev']].to_dict('index')
        print(f"Loaded {len(stations)} stations from {filepath}")
        return stations
    except FileNotFoundError:
        print(f"Warning: {filepath} not found — station lookups will fail")
        return {}


# load stations at module level so it's available everywhere
GMN_STATIONS = load_stations('stations.csv')


# ─────────────────────────────────────────────
# PART D — PARSE SUMMARY FILE
# ─────────────────────────────────────────────

def parse_summary_file(filepath):
    """
    Read GMN trajectory summary file (semicolon separated).
    Works with both .txt and .csv extensions.

    Skips all comment lines (lines starting with #).
    Returns a clean pandas DataFrame with named columns.

    WHY: The raw file has comment headers and 86 columns.
         This function gives us clean, named, typed columns
         we can access by name throughout the pipeline.
    """
    rows = []

    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()
            # skip comment lines and blank lines
            if line.startswith('#') or line == '':
                continue
            rows.append(line.split(';'))

    if not rows:
        raise ValueError(f"No data found in {filepath}")

    # pad all rows to same length
    max_cols = max(len(r) for r in rows)
    for row in rows:
        while len(row) < max_cols:
            row.append(None)

    # column names matching the GMN summary file format
    col_names = [
        'event_id',         # unique identifier
        'julian_date',      # Julian date
        'utc_time',         # UTC timestamp

        'iau_no',           # IAU shower number (-1 = sporadic)
        'iau_code',         # IAU 3-letter code e.g. GEM

        'sol_lon',          # solar longitude
        'app_lst',          # apparent local sidereal time

        'rageo',            # geocentric radiant RA (deg)
        'rageo_sigma',
        'decgeo',           # geocentric radiant Dec (deg)
        'decgeo_sigma',

        'lamgeo',  'lamgeo_sigma',
        'betgeo',  'betgeo_sigma',
        'vgeo',    'vgeo_sigma',

        'lamhel',  'lamhel_sigma',
        'bethod',  'bethod_sigma',
        'vhel',    'vhel_sigma',

        'a',       'a_sigma',       # semi-major axis (AU)
        'e',       'e_sigma',       # eccentricity
        'i',       'i_sigma',       # inclination (deg)

        'peri',    'peri_sigma',    # argument of perihelion
        'node',    'node_sigma',    # longitude of ascending node
        'pi',      'pi_sigma',      # longitude of perihelion
        'b',       'b_sigma',       # semi-minor axis
        'q',       'q_sigma',       # perihelion distance
        'f',       'f_sigma',
        'M',       'M_sigma',
        'Q',       'Q_sigma',       # aphelion distance
        'n',       'n_sigma',       # mean motion
        'T',       'T_sigma',       # orbital period

        'tisserand', 'tisserand_sigma',  # Tisserand parameter

        'raapp',   'raapp_sigma',   # apparent radiant RA
        'decapp',  'decapp_sigma',  # apparent radiant Dec

        'azim',    'azim_sigma',    # azimuth of trajectory
        'elev',    'elev_sigma',    # elevation of trajectory

        'vinit',   'vinit_sigma',   # initial velocity (km/s)
        'vavg',    'vavg_sigma',    # average velocity (km/s)

        'lat_beg', 'lat_beg_sigma', # trajectory start latitude
        'lon_beg', 'lon_beg_sigma', # trajectory start longitude
        'ht_beg',  'ht_beg_sigma',  # trajectory start height (km)

        'lat_end', 'lat_end_sigma', # trajectory end latitude
        'lon_end', 'lon_end_sigma', # trajectory end longitude
        'ht_end',  'ht_end_sigma',  # trajectory end height (km)

        'duration',     # event duration (seconds)
        'peak_mag',     # peak absolute magnitude
        'peak_ht',      # height of peak brightness (km)
        'F',            # F parameter
        'mass',         # estimated mass (kg)
        'Qc',           # convergence quality angle (deg)

        'median_fit_err',   # median angular fit error (arcsec)

        'beg_in_fov',   # was start in camera FOV?
        'end_in_fov',   # was end in camera FOV?
        'num_stations', # number of observing stations
        'stations'      # station codes e.g. 'US0002,US0008'
    ]

    # pad column names if file has more columns than expected
    while len(col_names) < max_cols:
        col_names.append(f'col_{len(col_names)}')

    df = pd.DataFrame(rows, columns=col_names[:max_cols])

    # strip whitespace from all string values
    df = df.apply(lambda col: col.map(
        lambda x: x.strip() if isinstance(x, str) else x
    ))

    # convert numeric columns
    numeric_cols = [
        'rageo', 'rageo_sigma', 'decgeo', 'decgeo_sigma',
        'vinit', 'vinit_sigma', 'vavg',
        'lat_beg', 'lon_beg', 'ht_beg',
        'lat_end', 'lon_end', 'ht_end',
        'duration', 'a', 'a_sigma',
        'e', 'e_sigma', 'i', 'i_sigma',
        'elev', 'elev_sigma',
        'azim', 'azim_sigma',
        'Qc', 'median_fit_err',
        'num_stations', 'mass',
        'raapp', 'raapp_sigma',
        'decapp', 'decapp_sigma',
        'tisserand', 'tisserand_sigma',
        'vgeo', 'vgeo_sigma',
        'peak_mag', 'peak_ht',
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    return df


# ─────────────────────────────────────────────
# PART E — TRAJECTORY ENDPOINTS TO ECEF
# ─────────────────────────────────────────────

def get_trajectory_endpoints(event):
    """
    Convert meteor start and end points to ECEF.

    Takes one row from the summary dataframe.
    ht_beg and ht_end are in km — converted to metres here.

    Returns (start_ecef, end_ecef) as numpy arrays.

    WHY: These two 3D points define the meteor's path.
         Everything downstream uses these.
    """
    start = geo_to_ecef(
        event['lat_beg'],
        event['lon_beg'],
        event['ht_beg'] * 1000   # km → metres
    )
    end = geo_to_ecef(
        event['lat_end'],
        event['lon_end'],
        event['ht_end'] * 1000   # km → metres
    )
    return start, end


# ─────────────────────────────────────────────
# PART F — STATION POSITIONS FOR AN EVENT
# ─────────────────────────────────────────────

def get_station_positions(station_string):
    """
    Given 'US0002,US0008' from the stations column,
    returns ECEF positions for each known station.

    Skips stations not found in stations.csv with a warning.

    Returns dict: { 'US0002': array([x,y,z]), ... }

    WHY: Triangulation needs station positions in ECEF.
         Multiple stations = multiple viewing angles = 3D reconstruction.
    """
    codes = [s.strip() for s in str(station_string).split(',')]
    positions = {}

    for code in codes:
        if code in GMN_STATIONS:
            s = GMN_STATIONS[code]
            positions[code] = geo_to_ecef(s['lat'], s['lon'], s['elev'])
        else:
            print(f"  Warning: {code} not in stations.csv — skipping")

    return positions


# ─────────────────────────────────────────────
# PART G — VALIDATION
# ─────────────────────────────────────────────

def validate_ecef(pos, name):
    """
    Check that an ECEF position makes physical sense.

    Rules:
    - Distance from Earth's centre must be 6,350–6,500 km
      (ground level to ~130km altitude — covers all meteors)

    Returns True if valid, False otherwise.
    """
    dist = np.linalg.norm(pos)
    valid = 6_350_000 < dist < 6_500_000
    if not valid:
        print(f"  FAIL: {name} distance = {dist:,.0f} m (expected 6.35-6.5M)")
    return valid


def validate_stage1(df):
    """
    Run all Stage 1 validation checks.
    Tests station positions and trajectory endpoints on first 5 events.
    """
    print("=" * 50)
    print("STAGE 1 VALIDATION")
    print("=" * 50)

    all_pass = True

    # check 1: station positions
    print("\n-- Station positions --")
    for code, coords in list(GMN_STATIONS.items())[:5]:
        pos  = geo_to_ecef(coords['lat'], coords['lon'], coords['elev'])
        dist = np.linalg.norm(pos)
        ok   = 6_350_000 < dist < 6_400_000
        if not ok:
            all_pass = False
        print(f"  {code}: {'PASS' if ok else 'FAIL'}  dist={dist:,.0f} m  ({coords['lat']:.2f}, {coords['lon']:.2f})")

    # check 2: trajectory endpoints on first 5 events
    print("\n-- Trajectory endpoints (first 5 events) --")
    for idx in range(min(5, len(df))):
        event = df.iloc[idx]
        try:
            start, end = get_trajectory_endpoints(event)
            length_km  = np.linalg.norm(end - start) / 1000

            start_ok  = validate_ecef(start, f"event {idx} start")
            end_ok    = validate_ecef(end,   f"event {idx} end")
            length_ok = 1 < length_km < 500

            ok = start_ok and end_ok and length_ok
            if not ok:
                all_pass = False

            print(f"  {event['event_id']}: {'PASS' if ok else 'FAIL'}  "
                  f"length={length_km:.1f} km  stations={event['stations']}")
        except Exception as ex:
            print(f"  Event {idx}: ERROR — {ex}")
            all_pass = False

    print()
    if all_pass:
        print("Stage 1: ALL CHECKS PASSED — ready for Stage 2")
    else:
        print("Stage 1: ERRORS FOUND — fix before proceeding")
    print("=" * 50)

    return all_pass


# ─────────────────────────────────────────────
# PART H — MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":

    # ── load summary file ──
    print("Loading summary file...")
    df = parse_summary_file('traj_summary_yearly_2019.csv')
    print(f"Loaded {len(df)} events\n")

    # ── show sample ──
    print("Sample of key columns:")
    sample_cols = [
        'event_id', 'utc_time',
        'lat_beg', 'lon_beg', 'ht_beg',
        'lat_end', 'lon_end', 'ht_end',
        'vinit', 'duration', 'stations'
    ]
    print(df[sample_cols].head(3).to_string())
    print()

    # ── validate ──
    validate_stage1(df)
    print()

    # ── demo on first event with known stations ──
    print("Finding first event with known stations...")
    demo_event = None
    for _, row in df.iterrows():
        codes    = [s.strip() for s in str(row['stations']).split(',')]
        all_known = all(c in GMN_STATIONS for c in codes)
        if all_known and len(codes) >= 2:
            demo_event = row
            break

    if demo_event is not None:
        print(f"\nDemo event: {demo_event['event_id']}")
        print(f"UTC time:   {demo_event['utc_time']}")
        print(f"Stations:   {demo_event['stations']}")
        print(f"Vinit:      {demo_event['vinit']} km/s")
        print(f"Duration:   {demo_event['duration']} s")

        start, end = get_trajectory_endpoints(demo_event)
        length_km  = np.linalg.norm(end - start) / 1000
        traj_dir   = (end - start) / np.linalg.norm(end - start)

        print(f"\nTrajectory:")
        print(f"  Start: {start}")
        print(f"  End:   {end}")
        print(f"  Length: {length_km:.1f} km")
        print(f"  Direction unit vector: {traj_dir}")

        station_positions = get_station_positions(demo_event['stations'])
        print(f"\nStation ECEF positions:")
        for code, pos in station_positions.items():
            print(f"  {code}: ({pos[0]:,.0f}, {pos[1]:,.0f}, {pos[2]:,.0f}) m")

        # ── this is what gets passed to Stage 2 ──
        print("\n── Output for Stage 2 ──")
        print(f"  df:                {len(df)} events")
        print(f"  meteor_start:      {start}")
        print(f"  meteor_end:        {end}")
        print(f"  station_positions: {list(station_positions.keys())}")
        print(f"  utc_time:          {demo_event['utc_time']}")
        print(f"  duration:          {demo_event['duration']} s")
        print(f"  vinit:             {demo_event['vinit']} km/s")
    else:
        print("No event found with all stations in stations.csv")
        print("Check your stations.csv covers the stations in your dataset")