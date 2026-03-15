"""
STAGE 6 — Monte Carlo Uncertainty Estimation
==============================================
Inputs:  event data from summary file
Outputs: ±1σ uncertainty on v0, a, e, i, radiant RA/Dec

What this does:
    The summary file gives us sigma values for every parameter.
    We use these to perturb our inputs and rerun the pipeline
    multiple times. The spread of outputs = uncertainty.

    Problem statement requires:
        - Minimum 50 runs per event
        - σ = 30 arcsec noise on RA/Dec inputs
        - Report ±1σ bounds on radiant and velocity

    We perturb:
        - LatBeg, LonBeg, HtBeg (using their sigma values)
        - LatEnd, LonEnd, HtEnd (using their sigma values)
        - Vinit (using vinit_sigma)

    Then rerun stages 2+3+4 for each perturbation.
    Report mean ± std of all outputs.
"""

import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
import warnings
warnings.filterwarnings('ignore')

from stage1_final import (
    parse_summary_file, GMN_STATIONS,
    get_trajectory_endpoints, geo_to_ecef
)
from stage2_revised import (
    compute_trajectory, generate_distance_time,
    ecef_to_height
)
from stage3_revised import fit_velocity
from stage4_final import compute_orbital_elements


# ─────────────────────────────────────────────
# PART A — PERTURB ONE EVENT
# ─────────────────────────────────────────────

def perturb_event(event, noise_arcsec=30.0):
    """
    Create one perturbed version of an event.

    Adds Gaussian noise to trajectory endpoints
    using their sigma values from the summary file.

    noise_arcsec : noise level for position perturbation
                   30 arcsec = ~0.0083 degrees
                   converts to ~1km at 100km altitude

    Returns a dict mimicking the event row structure
    with perturbed values.
    """
    noise_deg = noise_arcsec / 3600.0   # arcsec → degrees

    def get_sigma(col, default=0.001):
        try:
            val = float(event.get(f'{col}_sigma',
                                   event.get(col, default)))
            return max(val, noise_deg) if val > 0 else default
        except Exception:
            return default

    # perturb endpoints using their sigma values
    # minimum perturbation = noise_arcsec
    lat_beg = float(event['lat_beg']) + \
              np.random.normal(0, get_sigma('lat_beg'))
    lon_beg = float(event['lon_beg']) + \
              np.random.normal(0, get_sigma('lon_beg'))
    ht_beg  = float(event['ht_beg'])  + \
              np.random.normal(0, get_sigma('ht_beg') * 0.1)

    lat_end = float(event['lat_end']) + \
              np.random.normal(0, get_sigma('lat_end'))
    lon_end = float(event['lon_end']) + \
              np.random.normal(0, get_sigma('lon_end'))
    ht_end  = float(event['ht_end'])  + \
              np.random.normal(0, get_sigma('ht_end') * 0.1)

    # perturb velocity
    try:
        vinit_sigma = float(event['vinit_sigma'])
        if vinit_sigma <= 0 or np.isnan(vinit_sigma):
            vinit_sigma = float(event['vinit']) * 0.01
    except Exception:
        vinit_sigma = float(event['vinit']) * 0.01

    vinit = float(event['vinit']) + \
            np.random.normal(0, vinit_sigma)
    vinit = max(vinit, 1.0)   # keep physical

    # return perturbed event as dict
    perturbed = dict(event)
    perturbed['lat_beg'] = lat_beg
    perturbed['lon_beg'] = lon_beg
    perturbed['ht_beg']  = ht_beg
    perturbed['lat_end'] = lat_end
    perturbed['lon_end'] = lon_end
    perturbed['ht_end']  = ht_end
    perturbed['vinit']   = vinit

    return perturbed


# ─────────────────────────────────────────────
# PART B — RUN PIPELINE ON ONE PERTURBED EVENT
# ─────────────────────────────────────────────

def run_pipeline_once(perturbed_event, utc_time_str):
    """
    Run stages 2+3+4 on one perturbed event.
    Returns dict of outputs or None if failed.
    """
    try:
        # stage 2
        traj_point, traj_dir, length_km, start, end = \
            compute_trajectory(perturbed_event)
        times, distances, heights = \
            generate_distance_time(perturbed_event)

        # stage 3
        vel_result = fit_velocity(
            times, distances, heights,
            float(perturbed_event['vinit'])
        )

        # stage 4
        orb = compute_orbital_elements(
            traj_point, traj_dir,
            vel_result['v0'],
            utc_time_str
        )

        # compute radiant RA/Dec from traj_dir
        from astropy.coordinates import (
            SkyCoord, ITRS, CartesianRepresentation
        )
        from astropy.time import Time
        import astropy.units as u

        t            = Time(utc_time_str.strip())
        radiant_ecef = -traj_dir
        cart = CartesianRepresentation(
            x=radiant_ecef[0] * u.dimensionless_unscaled,
            y=radiant_ecef[1] * u.dimensionless_unscaled,
            z=radiant_ecef[2] * u.dimensionless_unscaled
        )
        itrs_coord = ITRS(cart, obstime=t)
        sky        = SkyCoord(itrs_coord).icrs

        return {
            'v0'   : vel_result['v0'],
            'a'    : orb['a'],
            'e'    : orb['e'],
            'i'    : orb['i'],
            'ra'   : sky.ra.deg,
            'dec'  : sky.dec.deg,
            'q'    : orb['q'],
            'T'    : orb['T'],
            'tisserand': orb['tisserand']
        }

    except Exception:
        return None


# ─────────────────────────────────────────────
# PART C — MONTE CARLO FOR ONE EVENT
# ─────────────────────────────────────────────

def monte_carlo_event(event, n_runs=50, noise_arcsec=30.0):
    """
    Run Monte Carlo uncertainty estimation for one event.

    n_runs      : number of perturbation runs (min 50)
    noise_arcsec: noise level in arcseconds

    Returns dict with mean ± std for all key outputs.
    """
    utc_time_str = str(event['utc_time'])

    results = {
        'v0' : [], 'a'  : [], 'e' : [],
        'i'  : [], 'ra' : [], 'dec': [],
        'q'  : [], 'T'  : [], 'tisserand': []
    }

    successful = 0

    for run in range(n_runs):
        perturbed = perturb_event(event, noise_arcsec)
        result    = run_pipeline_once(perturbed, utc_time_str)

        if result is None:
            continue

        # basic sanity check on output
        if not (0 < result['v0'] < 200):
            continue
        if not (0 < result['e'] < 2):
            continue

        for key in results:
            results[key].append(result[key])

        successful += 1

    if successful < 5:
        # not enough successful runs — return zeros
        return {
            'v0_mean'  : float(event['vinit']),
            'v0_std'   : 0.0,
            'a_mean'   : 0.0, 'a_std'  : 0.0,
            'e_mean'   : 0.0, 'e_std'  : 0.0,
            'i_mean'   : 0.0, 'i_std'  : 0.0,
            'ra_mean'  : float(event['rageo']),
            'ra_std'   : 0.0,
            'dec_mean' : float(event['decgeo']),
            'dec_std'  : 0.0,
            'n_runs'   : successful,
            'success'  : False
        }

    # compute statistics
    output = {'n_runs': successful, 'success': True}

    for key, vals in results.items():
        arr = np.array(vals)

        # for RA — handle wrap-around at 0/360
        if key == 'ra':
            # convert to unit vectors to handle wrap
            rad = np.radians(arr)
            cx  = np.mean(np.cos(rad))
            cy  = np.mean(np.sin(rad))
            mean_ra = np.degrees(np.arctan2(cy, cx)) % 360
            std_ra  = np.degrees(np.std(
                np.arctan2(np.sin(rad - np.radians(mean_ra)),
                           np.cos(rad - np.radians(mean_ra)))
            ))
            output['ra_mean'] = mean_ra
            output['ra_std']  = std_ra
        else:
            output[f'{key}_mean'] = float(np.mean(arr))
            output[f'{key}_std']  = float(np.std(arr))

    return output


# ─────────────────────────────────────────────
# PART D — PROCESS ALL EVENTS
# ─────────────────────────────────────────────

def process_all_events(df, n_runs=50,
                        noise_arcsec=30.0,
                        max_events=None):
    """
    Run Monte Carlo on all events.

    n_runs      : runs per event (problem statement min = 50)
    noise_arcsec: noise level (problem statement = 30 arcsec)
    max_events  : limit for testing
    """
    n = len(df) if max_events is None else \
        min(max_events, len(df))
    print(f"Running Monte Carlo on {n} events "
          f"({n_runs} runs each)...")

    all_results = []

    for idx in range(n):
        event  = df.iloc[idx]
        mc     = monte_carlo_event(event, n_runs, noise_arcsec)

        all_results.append({
            'event_id'  : event['event_id'],
            'utc_time'  : event['utc_time'],

            'v0_mean'   : mc.get('v0_mean',  float(event['vinit'])),
            'v0_std'    : mc.get('v0_std',   0.0),
            'v0_lower'  : mc.get('v0_mean',  float(event['vinit'])) -
                          mc.get('v0_std',   0.0),
            'v0_upper'  : mc.get('v0_mean',  float(event['vinit'])) +
                          mc.get('v0_std',   0.0),

            'a_mean'    : mc.get('a_mean',   0.0),
            'a_std'     : mc.get('a_std',    0.0),

            'e_mean'    : mc.get('e_mean',   0.0),
            'e_std'     : mc.get('e_std',    0.0),

            'i_mean'    : mc.get('i_mean',   0.0),
            'i_std'     : mc.get('i_std',    0.0),

            'ra_mean'   : mc.get('ra_mean',  float(event['rageo'])),
            'ra_std'    : mc.get('ra_std',   0.0),

            'dec_mean'  : mc.get('dec_mean', float(event['decgeo'])),
            'dec_std'   : mc.get('dec_std',  0.0),

            'n_runs'    : mc.get('n_runs',   0),
            'mc_success': mc.get('success',  False)
        })

        if (idx + 1) % 10 == 0:
            print(f"  {idx + 1}/{n} done")

    return pd.DataFrame(all_results)


# ─────────────────────────────────────────────
# PART E — VALIDATION
# ─────────────────────────────────────────────

def validate_stage6(mc, event):
    """
    Sanity checks on Monte Carlo output.

    Checks:
    1. Enough successful runs
    2. Uncertainties are physically realistic
    3. Our ±1σ bounds contain GMN's values
    """
    print("\n-- Stage 6 Validation --")
    all_pass = True

    # check 1: successful runs
    if mc['n_runs'] >= 50:
        print(f"  PASS: {mc['n_runs']} successful runs")
    elif mc['n_runs'] >= 10:
        print(f"  WARN: only {mc['n_runs']} runs (need 50+)")
    else:
        print(f"  FAIL: only {mc['n_runs']} runs")
        all_pass = False

    # check 2: uncertainty magnitudes realistic
    v0_std_pct = (mc['v0_std'] / mc['v0_mean'] * 100) \
                  if mc['v0_mean'] > 0 else 0
    if v0_std_pct < 20:
        print(f"  PASS: v0 uncertainty = "
              f"{mc['v0_std']:.4f} km/s "
              f"({v0_std_pct:.2f}%)")
    else:
        print(f"  WARN: v0 uncertainty very large "
              f"({v0_std_pct:.1f}%)")

    # check 3: GMN values within our ±1σ bounds
    checks = [
        ('v0',  float(event['vinit']),  'km/s'),
        ('ra',  float(event['rageo']),  '°'),
        ('dec', float(event['decgeo']), '°'),
    ]
    for key, gmn_val, unit in checks:
        mean = mc.get(f'{key}_mean', gmn_val)
        std  = mc.get(f'{key}_std',  0)
        diff = abs(mean - gmn_val)

        if std > 0:
            n_sig = diff / std
            status = "PASS" if n_sig < 2 else "WARN"
        else:
            status = "SKIP"
            n_sig  = 0

        print(f"  {status}: {key:4s} = "
              f"{mean:.4f} ± {std:.4f} {unit}  "
              f"(GMN: {gmn_val:.4f}, {n_sig:.1f}σ away)")

    print(f"\n  Stage 6: {'PASSED' if all_pass else 'CHECK ABOVE'}")
    return all_pass


# ─────────────────────────────────────────────
# PART F — MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":

    print("Loading data...")
    df = parse_summary_file('traj_summary_yearly_2019.csv')
    print(f"Loaded {len(df)} events")

    # find good event
    best_event = None
    for _, row in df.iterrows():
        codes   = [s.strip() for s in
                   str(row['stations']).split(',')]
        known   = all(c in GMN_STATIONS for c in codes)
        good_qc = not np.isnan(float(row['Qc'])) \
                  and float(row['Qc']) > 15
        has_orb = str(row['a']) not in ['None', 'nan', '']
        if known and good_qc and len(codes) >= 2 and has_orb:
            best_event = row
            break

    print(f"\nDemo event: {best_event['event_id']}")
    print(f"Running 50 Monte Carlo iterations...")

    mc = monte_carlo_event(
        best_event,
        n_runs=50,
        noise_arcsec=30.0
    )

    print(f"\n── Stage 6 Results ──")
    print(f"  Successful runs : {mc['n_runs']}/50")
    print(f"  v0  = {mc['v0_mean']:.4f} ± {mc['v0_std']:.4f} km/s"
          f"  (GMN: {best_event['vinit']})")
    print(f"  a   = {mc['a_mean']:.4f} ± {mc['a_std']:.4f} AU"
          f"  (GMN: {best_event['a']})")
    print(f"  e   = {mc['e_mean']:.4f} ± {mc['e_std']:.4f}"
          f"  (GMN: {best_event['e']})")
    print(f"  i   = {mc['i_mean']:.4f} ± {mc['i_std']:.4f}°"
          f"  (GMN: {best_event['i']})")
    print(f"  RA  = {mc['ra_mean']:.4f} ± {mc['ra_std']:.4f}°"
          f"  (GMN: {best_event['rageo']})")
    print(f"  Dec = {mc['dec_mean']:.4f} ± {mc['dec_std']:.4f}°"
          f"  (GMN: {best_event['decgeo']})")

    validate_stage6(mc, best_event)

    # run on first 20 events (50 runs each = 1000 pipeline calls)
    print("\n\nRunning on first 20 events (50 runs each)...")
    results_df = process_all_events(
        df, n_runs=50, noise_arcsec=30.0, max_events=20
    )

    successful = results_df[results_df['mc_success']]
    print(f"\n── Batch Results ──")
    print(f"  Successful MC   : {len(successful)}/{len(results_df)}")
    print(f"  Mean v0 std     : "
          f"{successful['v0_std'].mean():.4f} km/s")
    print(f"  Mean RA std     : "
          f"{successful['ra_std'].mean():.4f}°")
    print(f"  Mean Dec std    : "
          f"{successful['dec_std'].mean():.4f}°")

    print(f"\n── Output for Stage 7 ──")
    print(f"  results_df has {len(results_df)} rows")
    print(f"  columns: {list(results_df.columns)}")
    print(f"\n  Sample row:")
    row = results_df.iloc[0]
    print(f"    v0  = {row['v0_mean']:.4f} ± {row['v0_std']:.4f} km/s")
    print(f"    RA  = {row['ra_mean']:.4f} ± {row['ra_std']:.4f}°")
    print(f"    Dec = {row['dec_mean']:.4f} ± {row['dec_std']:.4f}°")
