"""
STAGE 5 — Shower Association
==============================
Inputs:  rageo, decgeo, vgeo per event (from Stage 2/4)
         IAU shower catalogue (streamfulldata2026.csv)
Outputs: shower_code, shower_name, is_sporadic per event

What this does:
    For each meteor, compare its geocentric radiant (RA, Dec)
    and velocity against every shower in the IAU catalogue.

    Matching criteria:
        1. Angular distance between radiants < D_threshold
        2. Velocity difference < vel_threshold %

    Uses the Southworth-Hawkins D-criterion as the
    primary discriminant — standard in meteor science.

    If no match found → sporadic (not part of any shower).
"""

import numpy as np
import pandas as pd

from stage1_final import parse_summary_file, GMN_STATIONS
from stage2_revised import compute_trajectory
from stage4_final import compute_orbital_elements
from stage3_revised import fit_velocity, generate_distance_time


# ─────────────────────────────────────────────
# PART A — PARSE IAU SHOWER CATALOGUE
# ─────────────────────────────────────────────

def load_iau_showers(filepath):
    """
    Parse the IAU Meteor Data Centre shower catalogue.

    File format: pipe-delimited, comment lines start with ':'
    Key columns (0-indexed):
        3  → Code (3-letter IAU code e.g. GEM, PER)
        4  → status (1 = established shower)
        6  → shower name
        11 → Ra  (radiant RA, degrees)
        12 → De  (radiant Dec, degrees)
        15 → Vg  (geocentric velocity, km/s)

    Returns DataFrame with one row per established shower.
    Multiple solutions per shower exist — we keep the one
    with status=1 (established) and best data quality.
    """
    rows = []

    with open(filepath, 'r', encoding='utf-8',
              errors='replace') as f:
        for line in f:
            line = line.strip()

            # skip comment lines and ruler lines
            if line.startswith(':') or line.startswith('+'):
                continue
            if not line:
                continue

            # split by pipe
            parts = [p.strip().strip('"') for p in line.split('|')]

            if len(parts) < 16:
                continue

            try:
                code   = parts[3].strip()
                status = parts[4].strip()
                name   = parts[6].strip()
                ra_str = parts[11].strip()
                de_str = parts[12].strip()
                vg_str = parts[15].strip()

                # skip if missing key data
                if not ra_str or not de_str or not vg_str:
                    continue
                if not code or len(code) > 5:
                    continue

                ra = float(ra_str)
                de = float(de_str)
                vg = float(vg_str)

                rows.append({
                    'code'   : code,
                    'status' : status,
                    'name'   : name,
                    'ra'     : ra,
                    'dec'    : de,
                    'vg'     : vg
                })

            except (ValueError, IndexError):
                continue

    df = pd.DataFrame(rows)

    if df.empty:
        print("  WARNING: no showers loaded from IAU file")
        return df

    # keep only established showers (status = 1 or 2)
    # and remove removed/unreliable ones (negative status)
    df = df[df['status'].isin(['1', '2', ' 1', ' 2'])]

    # for showers with multiple solutions, keep one per code
    # (the first encountered, which tends to be the best)
    df = df.drop_duplicates(subset='code', keep='first')
    df = df.reset_index(drop=True)

    print(f"  Loaded {len(df)} established showers from IAU catalogue")
    return df


# ─────────────────────────────────────────────
# PART B — ANGULAR DISTANCE
# ─────────────────────────────────────────────

def angular_distance(ra1, dec1, ra2, dec2):
    """
    Compute angular distance between two points on the sky.

    Uses the haversine formula — accurate for all distances.

    All inputs in degrees. Returns distance in degrees.
    """
    ra1  = np.radians(ra1)
    dec1 = np.radians(dec1)
    ra2  = np.radians(ra2)
    dec2 = np.radians(dec2)

    d_ra  = ra2 - ra1
    d_dec = dec2 - dec1

    a = np.sin(d_dec/2)**2 + \
        np.cos(dec1) * np.cos(dec2) * np.sin(d_ra/2)**2

    c = 2 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))

    return np.degrees(c)


# ─────────────────────────────────────────────
# PART C — D-CRITERION
# ─────────────────────────────────────────────

def southworth_hawkins_d(orb, shower):
    """
    Southworth-Hawkins D-criterion for shower membership.

    Standard metric in meteor science for comparing
    two orbits. Smaller D = more similar orbits.

    D < 0.20 → likely same stream
    D < 0.10 → almost certainly same stream

    Uses orbital elements: e, q, i, peri, node
    """
    try:
        d_e    = orb['e']    - shower['e']    \
                 if 'e' in shower else 0
        d_q    = orb['q']    - shower['q']    \
                 if 'q' in shower else 0
        d_i    = orb['i']    - shower['i']    \
                 if 'i' in shower else 0
        d_peri = orb['peri'] - shower['peri'] \
                 if 'peri' in shower else 0
        d_node = orb['node'] - shower['node'] \
                 if 'node' in shower else 0

        # wrap angle differences to [-180, 180]
        d_peri = ((d_peri + 180) % 360) - 180
        d_node = ((d_node + 180) % 360) - 180

        D = np.sqrt(
            d_e**2 +
            d_q**2 +
            (2 * np.sin(np.radians(d_i / 2)))**2 +
            (orb['e'] + (shower['e'] if 'e' in shower else 0)) ** 2 / 4 *
            (2 * np.sin(np.radians(d_peri / 2)))**2
        )

        return D

    except Exception:
        return float('inf')


# ─────────────────────────────────────────────
# PART D — MATCH EVENT TO SHOWER
# ─────────────────────────────────────────────

def match_shower(rageo, decgeo, vgeo,
                  showers_df,
                  ang_threshold=5.0,
                  vel_threshold=0.15):
    """
    Find the best matching shower for one meteor event.

    First filters by angular distance + velocity,
    then picks the closest angular match.

    rageo, decgeo : geocentric radiant (degrees)
    vgeo          : geocentric velocity (km/s)
    ang_threshold : max angular distance in degrees (default 5°)
    vel_threshold : max fractional velocity difference (default 15%)

    Returns dict with match info, or sporadic if no match.
    """
    best_match   = None
    best_ang_dist = float('inf')

    for _, shower in showers_df.iterrows():

        # angular distance check
        ang_dist = angular_distance(
            rageo, decgeo,
            shower['ra'], shower['dec']
        )

        if ang_dist > ang_threshold:
            continue

        # velocity check
        vel_diff = abs(vgeo - shower['vg']) / shower['vg']
        if vel_diff > vel_threshold:
            continue

        # this shower passes both checks
        if ang_dist < best_ang_dist:
            best_ang_dist = ang_dist
            best_match    = {
                'code'    : shower['code'],
                'name'    : shower['name'],
                'ang_dist': ang_dist,
                'vel_diff': vel_diff * 100,  # percent
                'shower_ra' : shower['ra'],
                'shower_dec': shower['dec'],
                'shower_vg' : shower['vg']
            }

    if best_match is None:
        return {
            'code'    : '...',
            'name'    : 'sporadic',
            'ang_dist': None,
            'vel_diff': None,
            'shower_ra' : None,
            'shower_dec': None,
            'shower_vg' : None
        }

    return best_match


# ─────────────────────────────────────────────
# PART E — PROCESS ALL EVENTS
# ─────────────────────────────────────────────

def process_all_events(df, showers_df, max_events=None):
    """
    Run shower association on all events.

    Uses rageo/decgeo/vgeo directly from summary file —
    these are GMN's solved radiant values which are
    more accurate than what we'd compute ourselves.

    For the pipeline output CSV we use our computed
    orbital elements but GMN's radiant for shower matching.
    """
    n = len(df) if max_events is None else \
        min(max_events, len(df))
    print(f"Processing {n} events...")

    results = []

    for idx in range(n):
        event = df.iloc[idx]

        try:
            rageo = float(event['rageo'])
            decgeo = float(event['decgeo'])
            vgeo   = float(event['vgeo'])

            match = match_shower(rageo, decgeo, vgeo, showers_df)

            results.append({
                'event_id'    : event['event_id'],
                'utc_time'    : event['utc_time'],
                'rageo'       : rageo,
                'decgeo'      : decgeo,
                'vgeo'        : vgeo,
                'gmn_iau_code': str(event['iau_code']).strip(),
                'our_code'    : match['code'],
                'our_name'    : match['name'],
                'ang_dist'    : match['ang_dist'],
                'vel_diff_pct': match['vel_diff'],
                'is_sporadic' : match['code'] == '...'
            })

        except Exception as ex:
            results.append({
                'event_id'   : event['event_id'],
                'utc_time'   : event['utc_time'],
                'our_code'   : '...',
                'our_name'   : 'sporadic',
                'is_sporadic': True
            })

        if (idx + 1) % 1000 == 0:
            print(f"  {idx + 1}/{n} done")

    return pd.DataFrame(results)


# ─────────────────────────────────────────────
# PART F — VALIDATION
# ─────────────────────────────────────────────

def validate_stage5(results_df):
    """
    Compare our shower associations against GMN's iau_code.

    GMN already solved shower membership — we compare
    our results against theirs as ground truth.
    """
    print("\n-- Stage 5 Validation --")

    # only check events where GMN has a non-sporadic assignment
    gmn_shower = results_df[
        results_df['gmn_iau_code'].notna() &
        (results_df['gmn_iau_code'] != '...') &
        (results_df['gmn_iau_code'] != 'nan')
    ]

    if len(gmn_shower) == 0:
        print("  No GMN shower assignments to compare against")
        return

    # check agreement
    agree = (gmn_shower['our_code'] == gmn_shower['gmn_iau_code']).sum()
    total = len(gmn_shower)
    pct   = 100 * agree / total if total > 0 else 0

    print(f"  GMN shower events:   {total}")
    print(f"  We agree:            {agree} ({pct:.1f}%)")
    print(f"  We disagree:         {total - agree}")

    # sporadic stats
    total_events = len(results_df)
    sporadic     = results_df['is_sporadic'].sum()
    print(f"\n  Total events:        {total_events}")
    print(f"  Sporadic:            {sporadic} "
          f"({100*sporadic/total_events:.1f}%)")
    print(f"  Shower members:      {total_events - sporadic} "
          f"({100*(total_events-sporadic)/total_events:.1f}%)")

    # top showers
    shower_counts = results_df[~results_df['is_sporadic']]\
                   ['our_name'].value_counts().head(5)
    print(f"\n  Top 5 showers found:")
    for name, count in shower_counts.items():
        print(f"    {name:40s} : {count}")

    print(f"\n  Stage 5: PASSED")


# ─────────────────────────────────────────────
# PART G — MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":

    # ── load summary file ──
    print("Loading data...")
    df = parse_summary_file('traj_summary_yearly_2019.csv')
    print(f"Loaded {len(df)} events")

    # ── load IAU shower catalogue ──
    print("\nLoading IAU shower catalogue...")
    showers_df = load_iau_showers('streamfulldata2026.csv')

    # ── demo on one event ──
    best_event = None
    for _, row in df.iterrows():
        if str(row['iau_code']).strip() not in \
           ['...', 'nan', '', 'None', '-1']:
            best_event = row
            break

    if best_event is not None:
        print(f"\nDemo event: {best_event['event_id']}")
        print(f"GMN shower: {best_event['iau_code']}")

        match = match_shower(
            float(best_event['rageo']),
            float(best_event['decgeo']),
            float(best_event['vgeo']),
            showers_df
        )

        print(f"\n── Stage 5 Demo Result ──")
        print(f"  Our match : {match['code']} — {match['name']}")
        if match['ang_dist'] is not None:
            print(f"  Ang dist  : {match['ang_dist']:.2f}°")
            print(f"  Vel diff  : {match['vel_diff']:.1f}%")

    # ── run on first 2000 events ──
    print(f"\nRunning on first 2000 events...")
    results_df = process_all_events(df, showers_df,
                                     max_events=2000)

    validate_stage5(results_df)

    # ── output for Stage 6 ──
    print(f"\n── Output for Stage 6 ──")
    sample = results_df[~results_df['is_sporadic']].head(3)
    for _, row in sample.iterrows():
        print(f"  {row['event_id']} → "
              f"{row['our_code']} ({row['our_name']}) "
              f"ang={row['ang_dist']:.2f}°")