"use client";

import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CompanyListItem } from "./CompanyCard";

// react-leaflet's default marker icon references image files that a
// bundler doesn't resolve the way Leaflet expects — loading them straight
// from the same CDN the leaflet package itself is versioned against avoids
// the well-known "broken marker icon" issue under Next.js/webpack.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type MappableCompany = CompanyListItem & { latitude: number; longitude: number };

export function CompanyMap({ companies }: { companies: MappableCompany[] }) {
  if (companies.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-2xl border border-border bg-surface text-sm text-muted">
        Geen bedrijven met een bekende locatie.
      </div>
    );
  }

  const center: [number, number] = [companies[0].latitude, companies[0].longitude];

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-[500px] w-full rounded-2xl border border-border"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-auteurs'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {companies.map((company) => (
        <Marker key={company.id} position={[company.latitude, company.longitude]} icon={markerIcon}>
          <Popup>
            <Link href={`/bedrijven/${company.id}`} className="font-medium text-voc-red hover:underline">
              {company.name}
            </Link>
            {company.city && <p className="mt-0.5 text-xs text-gray-600">{company.city}</p>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
