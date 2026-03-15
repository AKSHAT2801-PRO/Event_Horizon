"""
STAGE 7 — Final JSON Output Generator
=======================================
Combines all pipeline stages into one complete JSON file.
One file, one entry per event — ready for frontend + backend.

Output: meteor_events.json
"""

import numpy as np
import pandas as pd
import json
import os
import warnings
warnings.filterwarnings('ignore')

from stage1_final import (
    parse_summary_file, GMN_STATIONS,
    get_trajectory_endpoints
)
from stage2_revised import (
    compute_trajectory,
    generate_distance_time
)
from stage3_revised import fit_velocity
from stage4_final import compute_orbital_elements
from stage5_final import load_iau_showers, match_shower
from stage6_final import monte_carlo_event


def _safe(val, default=None):
    try:
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else f
    except Exception:
        return default


def _round(val, decimals=4):
    try:
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, decimals)
    except Exception:
        return None


def _tisserand_origin(t):
    if t is None:
        return "Unknown"
    if t < 2:
        return "Jupiter-family comet"
    elif t < 3:
        return "Halley-type comet"
    else:
        return "Asteroidal"


def process_event(event, showers_df, run_monte_carlo=True, mc_runs=50):
    utc_time = str(event['utc_time']).strip()

    result = {
        "id"             : event['event_id'],
        "utc_time"       : utc_time,
        "startLat"       : _safe(event['lat_beg']),
        "startLng"       : _safe(event['lon_beg']),
        "startAltKm"     : _safe(event['ht_beg']),
        "endLat"         : _safe(event['lat_end']),
        "endLng"         : _safe(event['lon_end']),
        "endAltKm"       : _safe(event['ht_end']),
        "speedKmps"      : _safe(event['vinit']),
        "speedKmps_sigma": _safe(event['vinit_sigma']),
        "vavgKmps"       : _safe(event['vavg']),
        "deceleration_A" : None,
        "velocity_curve" : [],
        "mass_kg"        : _safe(event['mass']),
        "peak_mag"       : _safe(event['peak_mag']),
        "peak_ht_km"     : _safe(event['peak_ht']),
        "duration_s"     : _safe(event['duration']),
        "ra_geo"         : _safe(event['rageo']),
        "dec_geo"        : _safe(event['decgeo']),
        "ra_sigma"       : _safe(event['rageo_sigma']),
        "dec_sigma"      : _safe(event['decgeo_sigma']),
        "ra_app"         : _safe(event['raapp']),
        "dec_app"        : _safe(event['decapp']),
        "azim"           : _safe(event['azim']),
        "elev"           : _safe(event['elev']),
        "a"              : _safe(event['a']),
        "e"              : _safe(event['e']),
        "i"              : _safe(event['i']),
        "peri"           : _safe(event['peri']),
        "node"           : _safe(event['node']),
        "q"              : _safe(event['q']),
        "Q_aph"          : _safe(event['Q']),
        "T_years"        : _safe(event['T']),
        "tisserand"      : _safe(event['tisserand']),
        "origin"         : _tisserand_origin(_safe(event['tisserand'])),
        "orbit_type"     : "elliptical",
        "v_geo_kms"      : None,
        "gmn_shower_code": str(event['iau_code']).strip(),
        "shower_code"    : "...",
        "shower_name"    : "sporadic",
        "shower_ang_dist": None,
        "Qc"             : _safe(event['Qc']),
        "median_fit_err" : _safe(event['median_fit_err']),
        "num_stations"   : int(_safe(event['num_stations'], 0)),
        "stations"       : [s.strip() for s in str(event['stations']).split(',')],
        "v0_std"         : _safe(event['vinit_sigma']),
        "ra_std"         : _safe(event['rageo_sigma']),
        "dec_std"        : _safe(event['decgeo_sigma']),
        "a_std"          : _safe(event['a_sigma']),
        "e_std"          : _safe(event['e_sigma']),
        "i_std"          : _safe(event['i_sigma']),
        "v0_lower"       : None,
        "v0_upper"       : None,
        "mc_runs"        : 0
    }

    # stage 2 + 3
    try:
        traj_point, traj_dir, length_km, start, end = compute_trajectory(event)
        times, distances, heights = generate_distance_time(event)
        vel_result = fit_velocity(times, distances, heights, float(event['vinit']))
        result['speedKmps']      = _round(vel_result['v0'])
        result['deceleration_A'] = vel_result['A']
        result['velocity_curve'] = [
            {"t": round(float(t), 4), "v": round(float(v), 4), "h": round(float(h), 2)}
            for t, v, h in zip(times, vel_result['velocities'], heights)
        ]
    except Exception:
        pass

    # stage 4
    try:
        traj_point, traj_dir, length_km, start, end = compute_trajectory(event)
        orb = compute_orbital_elements(traj_point, traj_dir, result['speedKmps'], utc_time)
        result['a']          = _round(orb['a'])
        result['e']          = _round(orb['e'])
        result['i']          = _round(orb['i'])
        result['peri']       = _round(orb['peri'])
        result['node']       = _round(orb['node'])
        result['q']          = _round(orb['q'])
        result['Q_aph']      = _round(orb['Q'])   if np.isfinite(orb['Q']) else None
        result['T_years']    = _round(orb['T'])    if np.isfinite(orb['T']) else None
        result['tisserand']  = _round(orb['tisserand'])
        result['origin']     = _tisserand_origin(orb['tisserand'])
        result['orbit_type'] = "hyperbolic" if not np.isfinite(orb['a']) else "elliptical"
        result['v_geo_kms']  = _round(orb['v_geo_kms'])
    except Exception:
        pass

    # stage 5
    try:
        if result['ra_geo'] and result['dec_geo'] and result['speedKmps']:
            match = match_shower(result['ra_geo'], result['dec_geo'], result['speedKmps'], showers_df)
            result['shower_code']     = match['code']
            result['shower_name']     = match['name']
            result['shower_ang_dist'] = _round(match['ang_dist']) if match['ang_dist'] is not None else None
    except Exception:
        pass

    # stage 6
    if run_monte_carlo:
        try:
            mc = monte_carlo_event(event, n_runs=mc_runs)
            if mc.get('success'):
                result['v0_std']   = _round(mc['v0_std'])
                result['ra_std']   = _round(mc['ra_std'])
                result['dec_std']  = _round(mc['dec_std'])
                result['a_std']    = _round(mc['a_std'])
                result['e_std']    = _round(mc['e_std'])
                result['i_std']    = _round(mc['i_std'])
                result['v0_lower'] = _round(mc['v0_mean'] - mc['v0_std'])
                result['v0_upper'] = _round(mc['v0_mean'] + mc['v0_std'])
                result['mc_runs']  = mc['n_runs']
        except Exception:
            pass

    return result


def generate_json(df, showers_df, output_path='meteor_events.json',
                   max_events=None, run_monte_carlo=True, mc_runs=50):
    n = len(df) if max_events is None else min(max_events, len(df))
    print(f"Generating JSON for {n} events...")
    print(f"Monte Carlo : {'ON' if run_monte_carlo else 'OFF'}")

    events = []
    failed = 0

    for idx in range(n):
        event = df.iloc[idx]
        try:
            result = process_event(event, showers_df, run_monte_carlo=run_monte_carlo, mc_runs=mc_runs)
            events.append(result)
        except Exception:
            failed += 1

        if (idx + 1) % 500 == 0:
            print(f"  {idx + 1}/{n} done  (failed: {failed})")

    with open(output_path, 'w') as f:
        json.dump(events, f, indent=2, default=str)

    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"\nWrote {len(events)} events → {output_path}")
    print(f"File size   : {size_mb:.1f} MB")
    print(f"Failed      : {failed}")
    return events


if __name__ == "__main__":

    print("Loading summary file...")
    df = parse_summary_file('traj_summary_yearly_2019.csv')
    print(f"Loaded {len(df)} events")

    print("\nLoading IAU shower catalogue...")
    showers_df = load_iau_showers('streamfulldata2026.csv')

    # demo
    print("\n── Single Event Demo ──")
    result = process_event(df.iloc[0], showers_df, run_monte_carlo=False)
    print(json.dumps(result, indent=2, default=str))

    # generate
    print("\n── Generating meteor_events.json ──")
    events = generate_json(
        df, showers_df,
        output_path     = 'meteor_events.json',
        max_events      = 15000,    # set None for all 50k
        run_monte_carlo = False,  # set True for full MC
        mc_runs         = 50
    )

    print("\n── Sample fields ──")
    e = events[0]
    print(f"  id           : {e['id']}")
    print(f"  speedKmps    : {e['speedKmps']} ± {e['v0_std']}")
    print(f"  a            : {e['a']} AU")
    print(f"  e            : {e['e']}")
    print(f"  i            : {e['i']}°")
    print(f"  shower       : {e['shower_code']} {e['shower_name']}")
    print(f"  origin       : {e['origin']}")
    print(f"  orbit_type   : {e['orbit_type']}")
    print(f"  velocity pts : {len(e['velocity_curve'])} frames")
    print(f"  stations     : {e['stations']}")
    print(f"\nDone — give meteor_events.json to your backend developer.")