from skyfield.api import load 

# The sun must be at least this far below the horizon for the sky to be
# dark enough to see satellites. Named, so nobody has to guess what -6 means
DARK_SKY_SUN_ALTITUDE = -6

# Passes lower than this barely clear trees and rooftops, so we skip them
MIN_PASS_ALTITUDE = 10.0

# How often to check visibility during a pass.
# Here we have 10 seconds.
# Smaller = more precise appear / fade times, but more calculations
VISIBILITY_STEP_SECONDS = 10

# Load Skyfield's clock and the sun / planet position file once, when this
# file is first imported. Loading the 17 MB file on every calculation
# would be slow, so it happens once and then gets reused. 
ts = load.timescale()
eph = load("de421.bsp")
sun = eph["sun"]
earth = eph["earth"]


def is_visible(satellite, observer, t):
    """Return True if you could see the satellite at time t"""
    # 1. The satellite must be in sunlight. It has no light of its own.
    # It shines by reflecting off of the Sun.
    sunlit = satellite.at(t).is_sunlit(eph)

    # 2. The observer's sky must be dark with the Sun well below their
    # horizon.
    sun_altitude = (earth + observer).at(t).observe(sun).apparent().altaz()[0].degrees
    sky_is_dark = sun_altitude < DARK_SKY_SUN_ALTITUDE

    return sunlit and sky_is_dark


def find_passes(satellite, observer, start, end):
    """Return every pass between start and end.
    
    Each pass is a dictionary with "rise", "culminate", and "set" times.
    """

    # Skyfield gives back two separate lists: the times of each event.
    # and what kind of event each one was. 0 = rise, 1 = peak, 2 = set
    times, events = satellite.find_events(
        observer, start, end, altitude_degrees=MIN_PASS_ALTITUDE
    )

    passes = []
    current = {}

    # zip pairs the two lists up item by item:
    # (first time, first event), (second time, second event), ...
    for t, event in zip(times, events):
        if event == 0:
            # Rise: start a new pass
            current = {"rise": t}
        elif event == 1 and "rise" in current:
            # Peak: only counts if we saw this pass rise
            # If the search started mid-pass, there's no rise, so skip it
            current["culminate"] = t
        elif event == 2 and "culminate" in current:
            # Set: the pass is complete. Save it and start fresh.
            current["set"] = t
            passes.append(current)
            current = {}

    return passes


def describe_pass(satellite, observer, p):
    """Work out the details of one pass from find_passes
    
    Returns a dictionary whose keys match the columns in the Pass table,
    plus whether the satellite is visible at rise, peak, and set.
    """

    # The satellite as seen from where the observer is standing
    view = satellite - observer

    # altaz() gives back three things: altitude (how high above the horizon),
    # azimuth (compass direction), and distance. 
    # "_" means "This one is not needed."
    peak_alt, peak_az, _ = view.at(p["culminate"]).altaz()
    _, rise_az, _ = view.at(p["rise"]).altaz()
    _, set_az, _ = view.at(p["set"]).altaz()

    return {
        # Skyfield times converted to regular Python datetimes in UTC,
        # which is what DateTime(timezone=True) columns store
        "rise_time": p["rise"].utc_datetime(),
        "culminate_time": p["culminate"].utc_datetime(),
        "set_time": p["set"].utc_datetime(),

        # Compass directions, in degrees: 0 = north, 90 = east
        "rise_azimuth": rise_az.degrees,
        "culminate_azimuth": peak_az.degrees,
        "set_azimuth": set_az.degrees,

        # How high it gets: 0 = horizon, 90 = straight overhead
        "max_altitude": peak_alt.degrees,

        # Can you see it at each of these moments?
        # This feeds the partial-pass decision
        "visible": {
            "rise": is_visible(satellite, observer, p["rise"]),
            "culminate": is_visible(satellite, observer, p["culminate"]),
            "set": is_visible(satellite, observer, p["set"])
        },
    }


def find_visible_window(satellite, observer, p):
    """Find when the satellite actually appears and fades during one pass.
    
    Return (appears, fades) as Skyfield times,
    or (None, None) if it's never visible during the pass.
    """

    # How long the pass lasts, in seconds
    # Skyfield time differences come out in days, so x 24 x 60 x 60
    duration_seconds = (p["set"] - p["rise"]) * 24 * 60 * 60

    # How many checks to make, spaced VISIBILITY_STEP_SECONDS apart
    # The +1 makes sure both the rise and the set get checked
    steps = int(duration_seconds / VISIBILITY_STEP_SECONDS) + 1

    # linspace = evenly spaced times from rise to set,
    # such as 6:17:00, 6:17:10, 6:17:20, ... 6:23:00
    check_times = ts.linspace(p["rise"], p["set"], steps)

    # None means "not found yet"
    appears = None
    fades = None

    for t in check_times:
        if is_visible(satellite, observer, t):
            if appears is None:
                # The first visible moment we've seen: it just appeared
                appears = t
            # Keep moving this forward everytime it is visible
            # When the loop ends, it's sitting on the LAST visible moment.
            fades = t

    return appears, fades