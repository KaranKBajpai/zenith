# requests to call the internet, timedelta to do date math, and three
# pieces from Skyfield. The satellite object, the time system, and 
# the tool for turning a lat/long into a real poo
import requests
from datetime import timedelta
from skyfield.api import EarthSatellite, load, wgs84

# Step 1: fetch real orbital data
headers = {"User-Agent": "Mozilla/5.0 (Zenith-App research script)"}
r = requests.get("https://tle.ivanstanojevic.me/api/tle/25544", headers=headers)
data = r.json()

print(data)

# Step 2: load into Skyfield, compute current position
satellite = EarthSatellite(data["line1"], data["line2"], data["name"], load.timescale())
print(satellite)

ts = load.timescale()
now = ts.now()

geocentric = satellite.at(now)
print(geocentric.position.km)

# Step 3: convert to observer's view (Portland)
print("\nPORTLAND\n")

portland = wgs84.latlon(45.5152, -122.6784)

difference = satellite - portland
topocentric = difference.at(now)

alt, az, distance = topocentric.altaz()

print(f"Altitude: {alt.degrees:.1f} degrees")
print(f"Azimuth: {az.degrees:.1f} degrees")
print(f"Distance: {distance.km:.1f} km")

# Step 4: find real passes over 7 days, with visibility filtering
eph = load('de421.bsp')
sun = eph['sun']
earth = eph['earth']

t0 = ts.now()
t1 = ts.now() + timedelta(days=7)

t, events = satellite.find_events(portland, t0, t1, altitude_degrees=10.0)

event_names = ['rise', 'culminate', 'set']

for ti, event in zip(t, events):
    name = event_names[event]
    is_sunlit = satellite.at(ti).is_sunlit(eph)
    observer_position = (earth + portland).at(ti)
    sun_altitude = observer_position.observe(sun).apparent().altaz()[0].degrees
    is_dark = sun_altitude < -6

    visible = is_sunlit and is_dark

    print(f"{ti.utc_strftime('%Y-%m-%d %H:%M:%S')} UTC  {name:10s}  sunlit={is_sunlit}  dark={is_dark}  VISIBLE={visible}")
