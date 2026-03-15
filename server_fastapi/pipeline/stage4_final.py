"""
STAGE 4 — Orbital Elements
============================
Inputs:  traj_dir, v0, traj_point, utc_time (from Stage 3)
Outputs: a, e, i, peri, node, q, Q, T, TisserandJ

Steps:
    1. Zenith attraction correction
    2. ECEF → ICRS direction transform (Astropy)
    3. + Earth's heliocentric velocity → heliocentric velocity
    4. Rotate to ecliptic frame
    5. Compute orbital elements from state vector
    6. Tisserand parameter
"""

import numpy as np
from astropy.coordinates import (
    SkyCoord, ITRS, CartesianRepresentation,
    get_body_barycentric_posvel
)
from astropy.time import Time
from astropy import units as u
from astropy import constants as const

from stage1_final import (
    parse_summary_file, GMN_STATIONS,
    get_trajectory_endpoints
)
from stage2_revised import (
    compute_trajectory,
    generate_distance_time
)
from stage3_revised import fit_velocity


# ─────────────────────────────────────────────
# PART A — ZENITH ATTRACTION CORRECTION
# ─────────────────────────────────────────────

def zenith_attraction_correction(v_obs_ms, traj_point_ecef):
    """
    Reverse Earth's gravitational acceleration on the meteor.

    As meteor falls toward Earth, gravity accelerates it.
    Observed entry velocity > true pre-atmospheric velocity.

    Energy conservation:
        v_geo² = v_obs² - 2 * GM_earth / r

    Returns geocentric speed (m/s).
    """
    GM = const.GM_earth.value
    r  = np.linalg.norm(traj_point_ecef)

    v_geo_sq = v_obs_ms**2 - 2 * GM / r

    if v_geo_sq < 0:
        return v_obs_ms

    return np.sqrt(v_geo_sq)


# ─────────────────────────────────────────────
# PART B — ECEF DIRECTION → ICRS VELOCITY VECTOR
# ─────────────────────────────────────────────

def get_geocentric_velocity_vector(traj_dir_ecef, v_geo_ms,
                                    utc_time_str):
    """
    Convert trajectory direction from ECEF to ICRS
    using Astropy's proper coordinate transform.
    Scale by geocentric speed to get velocity vector.

    Returns velocity vector in ICRS (m/s).
    """
    t = Time(utc_time_str.strip())

    cart = CartesianRepresentation(
        x=traj_dir_ecef[0] * u.dimensionless_unscaled,
        y=traj_dir_ecef[1] * u.dimensionless_unscaled,
        z=traj_dir_ecef[2] * u.dimensionless_unscaled
    )
    itrs_coord = ITRS(cart, obstime=t)
    icrs       = SkyCoord(itrs_coord).icrs

    d_icrs = np.array([
        icrs.cartesian.x.value,
        icrs.cartesian.y.value,
        icrs.cartesian.z.value
    ])
    d_icrs = d_icrs / np.linalg.norm(d_icrs)

    return v_geo_ms * d_icrs


# ─────────────────────────────────────────────
# PART C — EARTH'S HELIOCENTRIC VELOCITY
# ─────────────────────────────────────────────

def get_earth_velocity(utc_time_str):
    """
    Get Earth's heliocentric velocity at event time.
    Returns velocity in m/s as numpy array in ICRS frame.
    """
    t       = Time(utc_time_str.strip())
    pos_vel = get_body_barycentric_posvel('earth', t)
    vel     = pos_vel[1].xyz.to(u.m/u.s).value

    return vel


# ─────────────────────────────────────────────
# PART D — EQUATORIAL TO ECLIPTIC ROTATION
# ─────────────────────────────────────────────

def equatorial_to_ecliptic(vec):
    """
    Rotate vector from ICRS equatorial frame to
    heliocentric ecliptic frame.

    WHY:
    Orbital elements (especially inclination) are defined
    relative to the ecliptic plane — the plane of Earth's
    orbit around the Sun.

    ICRS uses the equatorial plane as reference.
    These differ by Earth's obliquity (axial tilt = 23.439°).

    Without this rotation, inclination is wrong by ~23°.

    Rotation is around the x-axis by the obliquity angle.
    """
    eps = np.radians(23.439)   # Earth's obliquity

    Rx = np.array([
        [1,           0,            0         ],
        [0,  np.cos(eps),  np.sin(eps)],
        [0, -np.sin(eps),  np.cos(eps)]
    ])

    return Rx @ vec


# ─────────────────────────────────────────────
# PART E — COMPUTE ORBITAL ELEMENTS
# ─────────────────────────────────────────────

def compute_orbital_elements(traj_point_ecef, traj_dir_ecef,
                               v0_kms, utc_time_str):
    """
    Compute heliocentric orbital elements from meteor trajectory.

    Full pipeline:
    1. Zenith attraction → geocentric speed
    2. ECEF → ICRS velocity vector
    3. + Earth velocity → heliocentric velocity (ICRS)
    4. Rotate to ecliptic frame
    5. Compute a, e, i, ω, Ω from state vector

    Returns dict with all orbital elements.
    """
    AU     = u.au.to(u.m)
    GM_sun = const.GM_sun.value
    v0_ms  = v0_kms * 1000

    # step 1: zenith attraction
    v_geo = zenith_attraction_correction(v0_ms, traj_point_ecef)

    # step 2: geocentric velocity vector in ICRS
    v_geo_vec = get_geocentric_velocity_vector(
        traj_dir_ecef, v_geo, utc_time_str
    )

    # step 3: Earth's heliocentric velocity + position
    t       = Time(utc_time_str.strip())
    pos_vel = get_body_barycentric_posvel('earth', t)

    v_earth = pos_vel[1].xyz.to(u.m/u.s).value
    r_earth = pos_vel[0].xyz.to(u.m).value

    # heliocentric velocity in ICRS
    v_helio_icrs = v_geo_vec + v_earth

    # meteor position ≈ Earth's heliocentric position
    r_helio_icrs = r_earth

    # step 4: rotate to ecliptic frame
    r_ecl = equatorial_to_ecliptic(r_helio_icrs)
    v_ecl = equatorial_to_ecliptic(v_helio_icrs)

    # step 5: orbital mechanics in ecliptic frame
    r_mag = np.linalg.norm(r_ecl)
    v_mag = np.linalg.norm(v_ecl)

    # specific orbital energy
    epsilon = 0.5 * v_mag**2 - GM_sun / r_mag

    if epsilon >= 0:
        a = float('inf')
    else:
        a = -GM_sun / (2 * epsilon)   # metres

    # angular momentum vector (ecliptic frame)
    h_vec = np.cross(r_ecl, v_ecl)
    h_mag = np.linalg.norm(h_vec)

    # eccentricity vector
    e_vec = np.cross(v_ecl, h_vec) / GM_sun - r_ecl / r_mag
    e     = np.linalg.norm(e_vec)

    # inclination from ecliptic plane
    i = np.degrees(np.arccos(
        np.clip(h_vec[2] / h_mag, -1, 1)
    ))

    # node vector (N = z × h)
    z_hat = np.array([0, 0, 1])
    N_vec = np.cross(z_hat, h_vec)
    N_mag = np.linalg.norm(N_vec)

    # longitude of ascending node
    if N_mag > 0:
        node = np.degrees(np.arccos(
            np.clip(N_vec[0] / N_mag, -1, 1)
        ))
        if N_vec[1] < 0:
            node = 360 - node
    else:
        node = 0.0

    # argument of perihelion
    if N_mag > 0 and e > 1e-10:
        peri = np.degrees(np.arccos(
            np.clip(np.dot(N_vec, e_vec) / (N_mag * e), -1, 1)
        ))
        if e_vec[2] < 0:
            peri = 360 - peri
    else:
        peri = 0.0

    # perihelion and aphelion distances
    if np.isfinite(a):
        q = a * (1 - e)
        Q = a * (1 + e)
    else:
        q = h_mag**2 / (GM_sun * (1 + e))
        Q = float('inf')

    # orbital period (Kepler's 3rd law)
    if np.isfinite(a) and a > 0:
        T_years = (a / AU)**1.5
    else:
        T_years = float('inf')

    # Tisserand parameter w.r.t. Jupiter
    a_J = 5.204 * AU
    if np.isfinite(a) and a > 0:
        tisserand = (a_J / a) + 2 * np.cos(np.radians(i)) * \
                    np.sqrt((a / a_J) * (1 - e**2))
    else:
        tisserand = 0.0

    return {
        'a'          : a / AU,
        'e'          : e,
        'i'          : i,
        'peri'       : peri,
        'node'       : node,
        'q'          : q / AU,
        'Q'          : Q / AU if np.isfinite(Q) else float('inf'),
        'T'          : T_years,
        'tisserand'  : tisserand,
        'v_geo_kms'  : v_geo / 1000,
        'v_helio_kms': v_mag / 1000
    }


# ─────────────────────────────────────────────
# PART F — VALIDATION
# ─────────────────────────────────────────────

def validate_stage4(orb, event):
    """
    Compare computed orbital elements against GMN summary.
    Checks a, e, i within sigma bounds.
    """
    print("\n-- Stage 4 Validation --")
    all_pass = True

    checks = [
        ('a', 'semi-major axis', 'AU'),
        ('e', 'eccentricity',    ''),
        ('i', 'inclination',     'deg'),
    ]

    for key, name, unit in checks:
        our_val = orb[key]
        gmn_val = float(event[key])
        try:
            sigma = float(event[f'{key}_sigma'])
        except Exception:
            sigma = max(0.1 * abs(gmn_val), 0.01)

        diff    = abs(our_val - gmn_val)
        n_sigma = diff / sigma if sigma > 0 else float('inf')

        if n_sigma < 3:
            status = "PASS"
        elif n_sigma < 10:
            status = "ACCEPTABLE"
        else:
            status = "WARN"
            all_pass = False

        print(f"  {status}: {name:20s}  "
              f"ours={our_val:.4f}  "
              f"GMN={gmn_val:.4f}  "
              f"diff={diff:.4f} ({n_sigma:.1f}σ)")

    # Tisserand interpretation
    t = orb['tisserand']
    if t < 2:
        origin = "Jupiter-family comet"
    elif t < 3:
        origin = "Halley-type / long-period comet"
    else:
        origin = "Asteroidal"

    print(f"\n  Tisserand  = {t:.3f}  →  {origin}")
    print(f"  v_geo      = {orb['v_geo_kms']:.3f} km/s")
    print(f"  v_helio    = {orb['v_helio_kms']:.3f} km/s")

    print(f"\n  Stage 4: {'PASSED' if all_pass else 'CHECK ABOVE'}")
    return all_pass


# ─────────────────────────────────────────────
# PART G — PROCESS ALL EVENTS
# ─────────────────────────────────────────────

def process_all_events(df, max_events=None):
    """Run full pipeline stages 2+3+4 on all events."""
    import pandas as pd

    n = len(df) if max_events is None else min(max_events, len(df))
    print(f"Processing {n} events...")

    results = []

    for idx in range(n):
        event = df.iloc[idx]

        try:
            traj_point, traj_dir, length_km, start, end = \
                compute_trajectory(event)
            times, distances, heights = \
                generate_distance_time(event)
            vel_result = fit_velocity(
                times, distances, heights,
                float(event['vinit'])
            )
            orb = compute_orbital_elements(
                traj_point, traj_dir,
                vel_result['v0'],
                str(event['utc_time'])
            )

            results.append({
                'event_id'    : event['event_id'],
                'utc_time'    : event['utc_time'],
                'our_v0'      : vel_result['v0'],
                'gmn_vinit'   : float(event['vinit']),
                'our_a'       : orb['a'],
                'gmn_a'       : float(event['a'])
                                if event['a'] else np.nan,
                'our_e'       : orb['e'],
                'gmn_e'       : float(event['e'])
                                if event['e'] else np.nan,
                'our_i'       : orb['i'],
                'gmn_i'       : float(event['i'])
                                if event['i'] else np.nan,
                'our_peri'    : orb['peri'],
                'our_node'    : orb['node'],
                'our_q'       : orb['q'],
                'our_Q'       : orb['Q'],
                'our_T'       : orb['T'],
                'tisserand'   : orb['tisserand'],
                'v_geo_kms'   : orb['v_geo_kms'],
                'success'     : True
            })

        except Exception as ex:
            results.append({
                'event_id' : event['event_id'],
                'utc_time' : event['utc_time'],
                'success'  : False
            })

        if (idx + 1) % 100 == 0:
            print(f"  {idx + 1}/{n} done")

    return pd.DataFrame(results)


# ─────────────────────────────────────────────
# PART H — MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":

    import pandas as pd

    print("Loading data...")
    df = parse_summary_file('traj_summary_yearly_2019.csv')
    print(f"Loaded {len(df)} events")

    # find good event
    best_event = None
    for _, row in df.iterrows():
        codes   = [s.strip() for s in str(row['stations']).split(',')]
        known   = all(c in GMN_STATIONS for c in codes)
        good_qc = not np.isnan(float(row['Qc'])) \
                  and float(row['Qc']) > 15
        has_orb = str(row['a']) not in ['None', 'nan', '']
        if known and good_qc and len(codes) >= 2 and has_orb:
            best_event = row
            break

    print(f"\nDemo event : {best_event['event_id']}")
    print(f"GMN a={best_event['a']}  "
          f"e={best_event['e']}  "
          f"i={best_event['i']}")

    # stages 2 + 3
    traj_point, traj_dir, length_km, start, end = \
        compute_trajectory(best_event)
    times, distances, heights = \
        generate_distance_time(best_event)
    vel_result = fit_velocity(
        times, distances, heights,
        float(best_event['vinit'])
    )

    # stage 4
    print("\nComputing orbital elements...")
    orb = compute_orbital_elements(
        traj_point, traj_dir,
        vel_result['v0'],
        str(best_event['utc_time'])
    )

    print(f"\n── Stage 4 Results ──")
    print(f"  a         : {orb['a']:.4f} AU    (GMN: {best_event['a']})")
    print(f"  e         : {orb['e']:.4f}       (GMN: {best_event['e']})")
    print(f"  i         : {orb['i']:.4f}°      (GMN: {best_event['i']})")
    print(f"  peri      : {orb['peri']:.4f}°   (GMN: {best_event['peri']})")
    print(f"  node      : {orb['node']:.4f}°   (GMN: {best_event['node']})")
    print(f"  q         : {orb['q']:.4f} AU")
    print(f"  Q         : {orb['Q']:.4f} AU")
    print(f"  T         : {orb['T']:.4f} years")
    print(f"  Tisserand : {orb['tisserand']:.4f}")

    validate_stage4(orb, best_event)

    # batch
    print("\n\nRunning on first 200 events...")
    results_df = process_all_events(df, max_events=200)

    valid = results_df[results_df['success'] == True].dropna(
        subset=['gmn_a', 'gmn_e', 'gmn_i']
    )
    a_err = (valid['our_a'] - valid['gmn_a']).abs()
    e_err = (valid['our_e'] - valid['gmn_e']).abs()
    i_err = (valid['our_i'] - valid['gmn_i']).abs()

    print(f"\n── Batch Results (200 events) ──")
    print(f"  Successful  : {results_df['success'].sum()}/{len(results_df)}")
    print(f"  a error     : mean={a_err.mean():.4f}  "
          f"median={a_err.median():.4f} AU")
    print(f"  e error     : mean={e_err.mean():.4f}  "
          f"median={e_err.median():.4f}")
    print(f"  i error     : mean={i_err.mean():.4f}  "
          f"median={i_err.median():.4f}°")

    comet  = (valid['tisserand'] < 3).sum()
    astero = (valid['tisserand'] >= 3).sum()
    print(f"\n  Cometary origin  (T<3) : {comet}")
    print(f"  Asteroidal origin(T≥3) : {astero}")

    print(f"\n── Output for Stage 5 ──")
    print(f"  a={orb['a']:.4f} AU  e={orb['e']:.4f}  "
          f"i={orb['i']:.4f}°")
    print(f"  peri={orb['peri']:.4f}°  node={orb['node']:.4f}°")
    print(f"  tisserand={orb['tisserand']:.4f}")
    print(f"  v_geo={orb['v_geo_kms']:.4f} km/s")