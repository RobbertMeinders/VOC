"use client";

import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { escapeHtml } from "@/lib/text/escape-html";
import type { CompanyListItem } from "./CompanyCard";

// Vierkante "foto-speld" i.p.v. de vorige ronde VOC-rode speld — toont het
// bedrijfslogo zelf (of, zonder logo, de eerste letter van de naam, zelfde
// terugval als CompanyLogo.tsx) in een afgeronde rechthoek met een puntje
// eronder. Bewust vierkant en niet rond: de clusterbubbels (hieronder,
// createClusterIcon) zijn wél rond, dus je ziet in één oogopslag het
// verschil tussen "dit is een getal-cluster" en "dit is een los bedrijf".
const PIN_SIZE = 34;
const PIN_TAIL = 9;

function createCompanyIcon(company: { name: string; logoUrl: string | null }) {
  const content = company.logoUrl
    ? `<img src="${escapeHtml(company.logoUrl)}" alt="" style="width:100%;height:100%;object-fit:contain;padding:2px;box-sizing:border-box;" />`
    : `<span style="font-size:15px;font-weight:700;color:#e8000f;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">${escapeHtml(company.name.charAt(0).toUpperCase())}</span>`;

  return L.divIcon({
    html: `<div style="position:relative;width:${PIN_SIZE}px;height:${PIN_SIZE + PIN_TAIL}px;">
      <div style="width:${PIN_SIZE}px;height:${PIN_SIZE}px;border-radius:9px;background:#ffffff;border:1.5px solid #e8000f;box-shadow:0 1px 4px rgba(0,0,0,.35);overflow:hidden;display:flex;align-items:center;justify-content:center;">${content}</div>
      <div style="position:absolute;left:50%;top:${PIN_SIZE - 2}px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:${PIN_TAIL}px solid #e8000f;"></div>
    </div>`,
    className: "voc-company-icon",
    iconSize: [PIN_SIZE, PIN_SIZE + PIN_TAIL],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE + PIN_TAIL],
    popupAnchor: [0, -(PIN_SIZE + PIN_TAIL)],
  });
}

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
          <Marker
            key={company.id}
            position={[company.latitude, company.longitude]}
            icon={createCompanyIcon({ name: company.name, logoUrl: company.logoUrl })}
          >
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
