const DEFAULT_RADIUS_METERS = Number(process.env.GEOFENCE_DEFAULT_RADIUS_METERS || 75);
const MAX_ACCURACY_METERS = Number(process.env.GEOFENCE_MAX_ACCURACY_METERS || 100);

const isCoordinate = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;

const validateLocation = ({ latitude, longitude, radiusMeters }) => {
  if (!isCoordinate(latitude, -90, 90) || !isCoordinate(longitude, -180, 180)) {
    return 'Latitude must be between -90 and 90 and longitude must be between -180 and 180.';
  }
  if (radiusMeters !== undefined && (!Number.isFinite(Number(radiusMeters)) || Number(radiusMeters) < 1 || Number(radiusMeters) > 1000)) {
    return 'Allowed radius must be between 1 and 1000 meters.';
  }
  return null;
};

// Haversine distance is appropriate here because classroom and phone coordinates are points on Earth.
const distanceInMeters = (first, second) => {
  const earthRadius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const verifyStudentLocation = (classroom, studentLocation) => {
  // If classroom coordinates are not configured, geofence check is bypassed
  if (classroom?.latitude == null || classroom?.longitude == null) {
    return { ok: true, bypassed: true, message: 'Classroom geofence is not configured; check-in allowed.' };
  }
  if (!studentLocation || !isCoordinate(studentLocation.latitude, -90, 90) || !isCoordinate(studentLocation.longitude, -180, 180)) {
    return { ok: false, message: 'This classroom requires GPS location verification. Please allow location access on your device.' };
  }
  const accuracy = Number(studentLocation.accuracy);
  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    return { ok: false, message: 'Your device returned an invalid location accuracy. Turn on device location and try again.' };
  }
  const maxAccuracy = Math.max(MAX_ACCURACY_METERS, 250);
  if (accuracy > maxAccuracy) {
    return { ok: false, message: `Location accuracy is too low (${Math.round(accuracy)}m). Move near a window or enable high-accuracy location and try again.` };
  }

  const distance = distanceInMeters(classroom, studentLocation);
  const radius = classroom.radiusMeters || DEFAULT_RADIUS_METERS;
  // GPS reports an uncertainty radius. Allowing it avoids rejecting honest users at the edge,
  // while the accuracy cap prevents a very imprecise fix from bypassing the classroom boundary.
  if (distance > radius + accuracy) {
    return { ok: false, message: `You appear to be ${Math.round(distance)}m from the classroom (allowed radius: ${radius}m). Move inside the classroom and try again.` };
  }
  return { ok: true, distance, accuracy };
};

module.exports = { DEFAULT_RADIUS_METERS, validateLocation, verifyStudentLocation };