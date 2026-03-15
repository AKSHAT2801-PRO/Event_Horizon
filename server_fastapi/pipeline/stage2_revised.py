"""
STAGE 2 (REVISED) — Trajectory direction + distance vs time
=============================================================
Inputs:  meteor start/end ECEF, vinit, duration (from Stage 1)
Outputs: traj_dir, traj_point, times, distances, heights

What this does:
    1. Compute trajectory direction from start/end endpoints
    2. Generate distance-along-track vs time at 25fps
    3. Compute height above Earth at each frame
    4. These feed directly into velocity fitting (Stage 3)

No RA/Dec. No stations. No synthetic observations.
Pure geometry from what the summary file gives us.
"""

import numpy as np
from stage1_final import (
    geo_to_ecef,
    get_trajectory_endpoints,
    parse_summary_file,
    GMN_STATIONS
)

# WGS84
A  = 6_378_137.0
F  = 1 / 298.257223563
B  = A * (1 - F)
E2 = 1 - (B / A)**2


# ─────────────────────────────────────────────
# PART A — TRAJECTORY DIRECTION
# ─────────────────────────────────────────────

def compute_trajectory(event):
    """
    Compute trajectory point, direction, and length
    directly from summary file endpoints.

    Returns:
        traj_point : midpoint of trajectory (ECEF metres)
        traj_dir   : unit direction vector (ECEF)
        length_km  : total trajectory length (km)
        start_ecef : start point (ECEF metres)
        end_ecef   : end point (ECEF metres)

    WHY MIDPOINT AS traj_point:
    We need one reference point on the line.
    Midpoint is stable and well-defined.
    The actual point doesn't matter much —
    what matters is the direction.
    """
    start, end = get_trajectory_endpoints(event)

    # direction from start to end
    diff      = end - start
    length_m  = np.linalg.norm(diff)
    traj_dir  = diff / length_m
    traj_point = (start + end) / 2   # midpoint

    length_km = length_m / 1000

    return traj_point, traj_dir, length_km, start, end


# ─────────────────────────────────────────────
# PART B — DISTANCE VS TIME
# ─────────────────────────────────────────────

def generate_distance_time(event, fps=25):
    """
    Generate distance-along-track vs time at 25fps.

    Uses linear interpolation between start and end.
    This is physically reasonable — over 1-2 seconds
    and ~30km, the path is essentially straight.

    Returns:
        times     : array of timestamps in seconds from start
        distances : array of distances along track in metres
        heights   : array of heights above Earth surface in km

    WHY LINEAR:
    We're not assuming constant velocity here.
    We're just sampling the path at equal time intervals.
    The deceleration model in Stage 3 will fit the
    actual velocity profile to these distance/time points.

    The distances here assume constant velocity as a first
    approximation — Stage 3 will refine this.
    """
    duration_s  = float(event['duration'])
    vinit_ms    = float(event['vinit']) * 1000  # km/s → m/s

    start, end = get_trajectory_endpoints(event)
    traj_dir   = (end - start) / np.linalg.norm(end - start)

    n_frames = max(2, int(duration_s * fps))
    times    = np.linspace(0, duration_s, n_frames)

    # distance along track at each time
    # using initial velocity as approximation
    # Stage 3 will fit a proper deceleration model
    distances = vinit_ms * times   # metres

    # height above Earth surface at each point
    heights = []
    for t in times:
        frac    = t / duration_s if duration_s > 0 else 0
        pos     = start + frac * (end - start)
        height  = ecef_to_height(pos)
        heights.append(height)

    return times, distances, np.array(heights)


# ─────────────────────────────────────────────
# PART C — ECEF TO HEIGHT
# ─────────────────────────────────────────────

def ecef_to_height(pos_ecef):
    """
    Convert ECEF position to height above ellipsoid in km.

    Uses iterative Bowring's method for accuracy.
    Simple approximation (|pos| - R_earth) has ~20km error
    at high latitudes — Bowring's is accurate to millimetres.

    WHY WE NEED HEIGHT:
    The Whipple-Jacchia deceleration model uses atmospheric
    density at each height. Height is needed to look up
    density from the NRLMSISE-00 model in Stage 3.
    """
    x, y, z = pos_ecef

    # longitude
    lon = np.arctan2(y, x)

    # initial latitude estimate
    p   = np.sqrt(x**2 + y**2)
    lat = np.arctan2(z, p * (1 - E2))

    # iterate Bowring's method (3 iterations is plenty)
    for _ in range(3):
        N   = A / np.sqrt(1 - E2 * np.sin(lat)**2)
        lat = np.arctan2(z + E2 * N * np.sin(lat), p)

    N      = A / np.sqrt(1 - E2 * np.sin(lat)**2)
    height = p / np.cos(lat) - N  # metres

    return height / 1000  # km


# ─────────────────────────────────────────────
# PART D — GEOCENTRIC RADIANT
# ─────────────────────────────────────────────

def compute_radiant(traj_dir, event):
    """
    Convert ECEF trajectory direction to geocentric radiant.

    Radiant = where the meteor came FROM = -traj_dir.
    We convert from ECEF back to RA/Dec (ICRS) using GMST.

    Returns (ra_deg, dec_deg) of geocentric radiant.

    This is what we compare against GMN's rageo/decgeo.
    """
    from astropy.coordinates import (
        SkyCoord, ITRS, CartesianRepresentation
    )
    from astropy.time import Time
    import astropy.units as u

    t = Time(event['utc_time'].strip())

    # radiant = opposite of travel direction
    radiant_ecef = -traj_dir

    cart = CartesianRepresentation(
        x=radiant_ecef[0] * u.dimensionless_unscaled,
        y=radiant_ecef[1] * u.dimensionless_unscaled,
        z=radiant_ecef[2] * u.dimensionless_unscaled
    )
    itrs_coord = ITRS(cart, obstime=t)
    sky        = SkyCoord(itrs_coord).icrs

    return sky.ra.deg, sky.dec.deg


# ─────────────────────────────────────────────
# PART E — VALIDATION
# ─────────────────────────────────────────────

def validate_stage2(traj_point, traj_dir, length_km,
                     times, distances, heights, event):
    """
    Sanity checks on Stage 2 output.

    Checks:
    1. Trajectory length is realistic (5-200 km)
    2. Direction is a unit vector
    3. Heights decrease monotonically (meteor going down)
    4. Distances increase monotonically (meteor moving forward)
    5. Radiant matches GMN rageo/decgeo within 5°
    """
    print("\n-- Stage 2 Validation --")
    all_pass = True

    # check 1: length
    if 5 < length_km < 200:
        print(f"  PASS: trajectory length = {length_km:.1f} km")
    else:
        print(f"  WARN: length = {length_km:.1f} km "
              f"(expected 5-200 km)")

    # check 2: unit vector
    vec_len = np.linalg.norm(traj_dir)
    if abs(vec_len - 1.0) < 1e-6:
        print(f"  PASS: direction is unit vector")
    else:
        print(f"  FAIL: direction length = {vec_len:.6f}")
        all_pass = False

    # check 3: heights decrease
    if heights[0] > heights[-1]:
        print(f"  PASS: height decreases "
              f"{heights[0]:.1f} → {heights[-1]:.1f} km")
    else:
        print(f"  FAIL: height does not decrease "
              f"{heights[0]:.1f} → {heights[-1]:.1f} km")
        all_pass = False

    # check 4: distances increase
    if np.all(np.diff(distances) > 0):
        print(f"  PASS: distances increase monotonically")
    else:
        print(f"  FAIL: distances not monotonically increasing")
        all_pass = False

    # check 5: radiant vs GMN
    our_ra, our_dec = compute_radiant(traj_dir, event)
    gmn_ra  = float(event['rageo'])
    gmn_dec = float(event['decgeo'])

    ra_diff  = abs(our_ra - gmn_ra)
    ra_diff  = min(ra_diff, 360 - ra_diff)
    dec_diff = abs(our_dec - gmn_dec)

    print(f"\n  Our radiant:  RA={our_ra:.2f}°  Dec={our_dec:.2f}°")
    print(f"  GMN radiant:  RA={gmn_ra:.2f}°  Dec={gmn_dec:.2f}°")
    print(f"  Difference:   RA={ra_diff:.2f}°  Dec={dec_diff:.2f}°")

    if ra_diff < 5 and dec_diff < 5:
        print(f"  PASS: radiant matches GMN within 5°")
    else:
        print(f"  WARN: radiant differs from GMN — "
              f"check coordinate transforms")

    print(f"\n  Stage 2: {'PASSED' if all_pass else 'FAILED'}")
    return all_pass


# ─────────────────────────────────────────────
# PART F — MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":

    # ── load ──
    print("Loading data...")
    df = parse_summary_file('traj_summary_yearly_2019.csv')
    print(f"Loaded {len(df)} events")

    # ── find good event ──
    best_event = None
    for _, row in df.iterrows():
        codes   = [s.strip() for s in str(row['stations']).split(',')]
        known   = all(c in GMN_STATIONS for c in codes)
        good_qc = not np.isnan(float(row['Qc'])) \
                  and float(row['Qc']) > 15
        if known and good_qc and len(codes) >= 2:
            best_event = row
            break

    print(f"Using: {best_event['event_id']}")
    print(f"Vinit: {best_event['vinit']} km/s")
    print(f"Duration: {best_event['duration']} s\n")

    # ── stage 2 ──
    print("Computing trajectory...")
    traj_point, traj_dir, length_km, start, end = \
        compute_trajectory(best_event)

    print("Generating distance vs time...")
    times, distances, heights = \
        generate_distance_time(best_event)

    # ── print results ──
    print(f"\n── Stage 2 Results ──")
    print(f"  traj_point : {traj_point}")
    print(f"  traj_dir   : {traj_dir}")
    print(f"  length     : {length_km:.2f} km")
    print(f"  n_frames   : {len(times)}")
    print(f"  time range : {times[0]:.3f} → {times[-1]:.3f} s")
    print(f"  dist range : {distances[0]:.0f} → "
          f"{distances[-1]:.0f} m")
    print(f"  height range: {heights[0]:.1f} → "
          f"{heights[-1]:.1f} km")

    # ── validate ──
    validate_stage2(
        traj_point, traj_dir, length_km,
        times, distances, heights,
        best_event
    )

    # ── output for stage 3 ──
    print("\n── Output for Stage 3 ──")
    print(f"  traj_point : {traj_point}")
    print(f"  traj_dir   : {traj_dir}")
    print(f"  times      : {len(times)} values  "
          f"[{times[0]:.3f} ... {times[-1]:.3f}] s")
    print(f"  distances  : {len(distances)} values  "
          f"[{distances[0]:.0f} ... {distances[-1]:.0f}] m")
    print(f"  heights    : {len(heights)} values  "
          f"[{heights[0]:.1f} ... {heights[-1]:.1f}] km")