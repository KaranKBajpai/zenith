# requests: downloads the orbital data from the internet
# timedelta: lets us do "now + 7 days"
# ZoneInfo: converts UTC times into Pacific time
# Skyfield: does all the orbital math
import requests
from datetime import timedelta
from zoneinfo import ZoneInfo
from skyfield.api import EarthSatellite, load, wgs84

# Location to check. Portland city center by default.
# To check your own spot, swap in your coordinates (rounded to 2 decimals),
# West longitude is negative.
LAT = 45.52
LON = -122.68

# Which satellite to check, by NORAD id
# 25544 = ISS, 48274 = Tiangong, 20580 = Hubble
NORAD_ID = 48274

# The IANA timezone name, same idea as in your API design
LOCAL_TZ = ZoneInfo("America/Los_Angeles")

# Download the satellite's orbital data (the two TLE lines)
# The f"..." lets us drop NORAD_ID into the middle of the URL
headers = {"User-Agent": "Mozilla/5.0 (Zenith-App research script)"}
r = requests.get(f"https://tle.ivanstanojevic.me/api/tle/{NORAD_ID}", headers=headers)
data = r.json()

# Skyfield's clock, used for every time calculation
ts = load.timescale()

# Turn the TLE lines into a satellite Skyfield can track
satellite = EarthSatellite(data["line1"], data["line2"], data["name"], ts)

# The spot on Earth we're checking from
home = wgs84.latlon(LAT, LON)

# de421.bsp holds the positions of the Sun and planets
# We need the Sun to know if the satellite is lit and if your sky is dark
eph = load("de421.bsp")
sun = eph["sun"]
earth = eph["earth"]

# Which satellite, and how old the orbital data is. Fresher = more accurate
print(f"Satellite: {data['name']}")
print(f"Orbit data from: {satellite.epoch.utc_strftime('%Y-%m-%d %H:%M')} UTC\n")


def compass(degrees):
    # Turns a direction in degrees into a compass label, like 247 -> "WSW"
    # 16 compass points split the circle, so each covers 360 / 16 = 22.5 degrees
    points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
              "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    return points[round(degrees / 22.5) % 16]


def local_time(t):
    # Converts a Skyfield time (UTC) into readable Pacific time
    return t.utc_datetime().astimezone(LOCAL_TZ).strftime("%a %b %d  %I:%M %p")


def is_visible(t):
    # You can only see a satellite when BOTH are true:
    # 1. The satellite is in sunlight (it shines by reflecting the Sun)
    sunlit = satellite.at(t).is_sunlit(eph)
    # 2. Your sky is dark: the Sun is more than 6 degrees below your horizon
    sun_altitude = (earth + home).at(t).observe(sun).apparent().altaz()[0].degrees
    return sunlit and sun_altitude < -6


# Search window: right now through 7 days from now
t0 = ts.now()
t1 = ts.now() + timedelta(days=7)

# Find every time the satellite rises above 10 degrees, peaks, and sets
# events come back as numbers: 0 = rise, 1 = peak (culminate), 2 = set
times, events = satellite.find_events(home, t0, t1, altitude_degrees=10.0)

# Skyfield gives us loose events. This groups each rise, peak, and set
# into one complete pass
passes = []
current = {}
for t, event in zip(times, events):
    if event == 0:
        # Rise: start a new pass
        current = {"rise": t}
    elif event == 1 and "rise" in current:
        # Peak: only counts if we already saw this pass rise
        current["culminate"] = t
    elif event == 2 and "culminate" in current:
        # Set: pass is complete, save it and start fresh
        current["set"] = t
        passes.append(current)
        current = {}

# How many passes went above 10 degrees, visible or not
print(f"Passes above 10° in the next 7 days: {len(passes)}\n")

for p in passes:
    # "view" = the satellite as seen from where you're standing
    view = satellite - home

    # Height and compass direction at the highest point
    peak_alt, peak_az, _ = view.at(p["culminate"]).altaz()

    # Compass direction where it comes up, and where it goes down
    rise_az = view.at(p["rise"]).altaz()[1].degrees
    set_az = view.at(p["set"]).altaz()[1].degrees

    # Checked three times: at rise, at peak, at set
    seen = [is_visible(p[k]) for k in ("rise", "culminate", "set")]

    # Skip passes you can't see at any point
    # (Put # in front of these two lines to see every pass, visible or not)
    if not any(seen):
        continue

    # Skyfield gives time differences in days, so x 24 x 60 turns it into minutes
    minutes = (p["set"] - p["rise"]) * 24 * 60

    # Builds the "rise✓ peak✓ set✗" text
    marks = " ".join(f"{label}{'✓' if ok else '✗'}" for label, ok in zip(["rise", "peak", "set"], seen))

    print(f"{local_time(p['rise'])}  |  peaks {peak_alt.degrees:.0f}°  |  "
          f"{compass(rise_az)} → {compass(peak_az.degrees)} → {compass(set_az)}  |  "
          f"{minutes:.0f} min  |  {marks}")