"use client";

import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import type { CompanyListItem } from "./CompanyCard";

// Een eigen, in VOC-rood gestylede speld i.p.v. Leaflets standaard blauwe
// marker-afbeelding — een losse SVG als data-URI heeft geen externe
// CDN-afhankelijkheid nodig en blijft op elk schermformaat scherp.
const PIN_SVG = `<svg width="27" height="38" viewBox="0 0 27 38" xmlns="http://www.w3.org/2000/svg">
  <path d="M13.5 0C6.04 0 0 6.04 0 13.5 0 23.63 13.5 38 13.5 38S27 23.63 27 13.5C27 6.04 20.96 0 13.5 0z" fill="#e8000f"/>
  <circle cx="13.5" cy="13.5" r="5.5" fill="#ffffff"/>
</svg>`;

const markerIcon = L.icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(PIN_SVG)}`,
  iconSize: [27, 38],
  iconAnchor: [13.5, 38],
  popupAnchor: [0, -34],
});

// Eigen clusterbubbel i.p.v. leaflet.markercluster's standaard geel/oranje
// — drie oplopende maten naar aantal bedrijven, altijd in VOC-rood.
function createClusterIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 34 : count < 50 ? 40 : 46;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:#e8000f;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;box-shadow:0 0 0 4px rgba(232,0,15,0.18);">${count}</div>`,
    className: "voc-cluster-icon",
    iconSize: L.point(size, size),
  });
}

export type MappableCompany = CompanyListItem & { latitude: number; longitude: number };

export function CompanyMap({
  companies,
  heightClass = "h-[640px]",
  zoom = 12,
}: {
  companies: MappableCompany[];
  heightClass?: string;
  zoom?: number;
}) {
  if (companies.length === 0) {
    return (
      <div className={`flex ${heightClass} items-center justify-center rounded-2xl border border-border bg-surface text-sm text-muted`}>
        Geen bedrijven met een bekende locatie.
      </div>
    );
  }

  const center: [number, number] = [companies[0].latitude, companies[0].longitude];

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className={`${heightClass} w-full rounded-2xl border border-border`}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-auteurs'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Bij veel bedrijven dicht bij elkaar (bv. hele binnenstad) groepeert
          dit tot één getal-bubbel i.p.v. een onleesbare stapel spelden —
          inzoomen of erop klikken splitst 'm vanzelf weer op. Een kleinere
          straal dan de standaard (25 i.p.v. 80px) en een harde grens vanaf
          zoomniveau 15 houden het bewust spaarzaam: zodra je dichtbij genoeg
          inzoomt om los van elkaar liggende bedrijven te onderscheiden, mag
          het ook gewoon wat drukker ogen met losse spelden. */}
      <MarkerClusterGroup chunkedLoading maxClusterRadius={25} disableClusteringAtZoom={15} iconCreateFunction={createClusterIcon}>
        {companies.map((company) => (
          <Marker key={company.id} position={[company.latitude, company.longitude]} icon={markerIcon}>
            <Popup>
              <Link
                href={company.href ?? `/bedrijven/${company.id}`}
                onClick={company.onClick}
                className="font-medium text-voc-red hover:underline"
              >
                {company.name}
              </Link>
              {company.city && <p className="mt-0.5 text-xs text-gray-600">{company.city}</p>}
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
