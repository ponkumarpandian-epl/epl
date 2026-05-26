"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMapEvents } from "react-leaflet";
import type { LatLngExpression, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./forms.css";
import "./map-picker.css";

// Electronic City, Bengaluru
const DEFAULT_CENTER: LatLngExpression = [12.8456, 77.6603];
const DEFAULT_ZOOM = 14;

// react-leaflet primitives — dynamic-imported so they never run on the server.
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false });

interface Value {
  lat:     number;
  lng:     number;
  address: string;
}

export interface MapPickerProps {
  defaultValue?: Partial<Value>;
  onChange?:    (v: Value) => void;
  error?:       string;
}

export function MapPicker({ defaultValue, onChange, error }: MapPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue]     = useState<Value | null>(
    defaultValue?.lat && defaultValue?.lng
      ? { lat: defaultValue.lat, lng: defaultValue.lng, address: defaultValue.address ?? "" }
      : null
  );
  const [busy, setBusy] = useState<"geo" | "reverse" | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const mapRef    = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    setMounted(true);
    // Fix the default Leaflet marker icon (it doesn't auto-resolve in webpack/Next).
    (async () => {
      const L = (await import("leaflet")).default;
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    })();
  }, []);

  async function reverseGeocode(lat: number, lng: number) {
    setBusy("reverse");
    try {
      const res  = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      const data = res.ok ? await res.json() : { address: "" };
      const v: Value = { lat: round6(lat), lng: round6(lng), address: data.address ?? "" };
      setValue(v);
      onChange?.(v);
    } catch {
      const v: Value = { lat: round6(lat), lng: round6(lng), address: "" };
      setValue(v);
      onChange?.(v);
    } finally {
      setBusy(null);
    }
  }

  async function onMapClick(lat: number, lng: number) {
    await reverseGeocode(lat, lng);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Your browser does not support location.");
      return;
    }
    setBusy("geo");
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current) mapRef.current.flyTo([lat, lng], 17, { duration: 0.8 });
        await reverseGeocode(lat, lng);
      },
      (err) => {
        setBusy(null);
        setGeoError(err.code === err.PERMISSION_DENIED
          ? "Location permission denied. Click on the map to pick instead."
          : "Could not detect your location. Click on the map to pick instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className={`mapPickerField${error ? " fieldHasError" : ""}`}>
      <div className="mapPickerHeader">
        <label className="fieldLabel" htmlFor="apartmentAddress">Apartment location *</label>
        <button
          type="button"
          className="mapLocateBtn"
          onClick={useMyLocation}
          disabled={busy !== null}
          aria-busy={busy === "geo"}
        >
          {busy === "geo" ? <><span className="spinner" /> Locating…</> : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" />
                <line x1="12" y1="1" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="23" />
                <line x1="1"  y1="12" x2="4"  y2="12" /><line x1="20" y1="12" x2="23" y2="12" />
              </svg>
              Use my location
            </>
          )}
        </button>
      </div>

      <p className="fieldHint">Tap the map to drop a pin on your apartment. The address fills automatically.</p>

      <div className="mapBox" role="application" aria-label="Apartment location map">
        {mounted && (
          <MapContainer
            center={value ? [value.lat, value.lng] : DEFAULT_CENTER}
            zoom={value ? 16 : DEFAULT_ZOOM}
            scrollWheelZoom
            ref={(m) => { mapRef.current = m; }}
            className="mapInner"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <MapEvents onPick={onMapClick} />
            {value && (
              <Marker
                position={[value.lat, value.lng]}
                draggable
                ref={(m) => { markerRef.current = m; }}
                eventHandlers={{
                  dragend: async (e) => {
                    const { lat, lng } = (e.target as LeafletMarker).getLatLng();
                    await reverseGeocode(lat, lng);
                  },
                }}
              />
            )}
          </MapContainer>
        )}
        {!mounted && (
          <div className="mapPlaceholder" aria-hidden="true">Loading map…</div>
        )}
      </div>

      {/* Read-only address surface — the parent form picks this up via the hidden inputs below. */}
      <div className="field">
        <textarea
          id="apartmentAddress"
          name="apartmentAddress"
          className="fieldTextarea"
          rows={2}
          placeholder="The address will be filled in when you pick a location on the map."
          value={value?.address ?? ""}
          onChange={(e) => {
            const v: Value = { lat: value?.lat ?? 0, lng: value?.lng ?? 0, address: e.target.value };
            setValue(v);
            onChange?.(v);
          }}
        />
      </div>

      <input type="hidden" name="apartmentLat" value={value?.lat ?? ""} readOnly />
      <input type="hidden" name="apartmentLng" value={value?.lng ?? ""} readOnly />

      {value && (
        <p className="mapPickerLinkRow">
          <span className="mapPickerCoord">{value.lat.toFixed(6)}, {value.lng.toFixed(6)}</span>
          <a
            href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mapPickerLink"
          >
            Open in Google Maps ↗
          </a>
        </p>
      )}

      {busy === "reverse" && <p className="fieldHint">Looking up address…</p>}
      {geoError && <p className="fieldError">{geoError}</p>}
      {error    && <p className="fieldError">{error}</p>}
    </div>
  );
}

function round6(n: number) { return Math.round(n * 1e6) / 1e6; }

// Tiny child that registers map click handler — must live inside <MapContainer>.
function MapEvents({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}
