"""Download orbital data (TLEs) from CelesTrak"""

import time

import requests

# CelesTrak's "GP" endpoint. CATNR = the NORAD number,
# FORMAT=TLE = the classic two-line format the Satellite table stores.
CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php"

# Identify ourselves politely. Some servers block Python's default.
HEADERS = {"User-Agent": "Zenith/0.1 (satellite pass app)"}

# How many tries before giving up, and how long to wait between them.
# CelesTrak blocks addresses that hammer it with failing requests,
# so both numbers stay modest.
MAX_ATTEMPTS = 3
RETRY_WAIT_SECONDS = 5


def fetch_tle(norad_id):
    """Download the two TLE lines for one satellite.
    
    Returns (line1, line2), or raises an error after MAX_ATTEMPTS failures.
    """
    # requests turns this into ?CATNR=25544&FORMAT=TLE on the end of the URL
    params = {"CATNR": norad_id, "FORMAT": "TLE"}

    # Count attempts 1, 2, 3 (range stops BEFORE its second number)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            # timeout: give up on a stuck request after 15 seconds
            # instead of waiting forever
            r = requests.get(CELESTRAK_URL, params=params, headers=HEADERS, timeout=15)

            if r.status_code == 200:
                # The reply is three lines: the satellite's name, line 1, line 2.
                # splitlines() breaks the text into a list of lines.
                # strip() trims spaces and line-break characters off each one.
                lines = [line.strip() for line in r.text.strip().splitlines()]

                # Check it really is a TLE before trusting it: exactly 3 lines,
                # with line 1 starting "1 " and line 2 starting "2 "
                if len(lines) == 3 and lines[1].startswith("1 ") and lines[2].startswith("2 "):
                    return lines[1], lines[2]

            print(f"Attempt {attempt} for {norad_id}: bad reply (status {r.status_code})")
        except requests.RequestException as e:
            # Network problems: no internet, a timeout, etc.
            print(f"Attempt {attempt} for {norad_id}: request failed ({e})")

        # Wait before trying again, but not after the last attempt
        if attempt < MAX_ATTEMPTS:
            time.sleep(RETRY_WAIT_SECONDS)

    # All attempts failed: stop with a clear message
    raise RuntimeError(f"Couldn't get orbital data for NORAD {norad_id} after {MAX_ATTEMPTS} tries")