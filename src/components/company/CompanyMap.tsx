"use client";

import { useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { escapeHtml } from "@/lib/text/escape-html";
import { useResolvedTheme } from "@/lib/theme/useResolvedTheme";
import { CompanyLogo } from "./CompanyLogo";
import type { CompanyListItem } from "./CompanyCard";

// Vierkante "foto-speld" i.p.v. de vorige ronde VOC-rode speld — toont het
// bedrijfslogo zelf (of, zonder logo, de eerste letter van de naam, zelfde
// terugval als CompanyLogo.tsx) in een afgeronde rechthoek met een puntje
// eronder. Bewust vierkant en niet rond: de clusterbubbels (hieronder,
// createClusterIcon) zijn wél rond, dus je ziet in één oogopslag het
// verschil tussen "dit is een getal-cluster" en "dit is een los bedrijf".
//
// Twee maten i.p.v. één vaste: uitgezoomd (veel spelden tegelijk, overzicht
// staat voorop) mag een logo klein en indicatief zijn, maar zodra je
// inzoomt tot het niveau waarop clustering toch al oplost (zie
// disableClusteringAtZoom hieronder) wil je een los bedrijf ook echt
// kunnen herkennen — vandaar een flinke sprong in grootte op dat punt i.p.v.
// een vaste pixelmaat die op elk zoomniveau even (on)leesbaar blijft.
const PIN_SIZE_COMPACT = 32;
const PIN_SIZE_CLOSE = 48;
const CLOSE_ZOOM_THRESHOLD = 15;
const PIN_TAIL_RATIO = 0.27;

// Afwerkronde blok 3: witte speld met een petrol ring i.p.v. VOC-rood — rood
// is schaars geworden en hoort hier bij de ene geselecteerde speld (zie
// `selected` hieronder), niet bij elk bedrijf op de kaart. var(--petrol)/
// var(--voc-red) i.p.v. een vaste hex: deze HTML wordt in de echte DOM
// ingevoegd (Leaflet divIcon), dus custom properties lossen gewoon op tegen
// de cascade — automatisch mee met licht/donker, zonder dat dit bestand
// zelf de paletwaarden hoeft te kennen.
function createCompanyIcon(company: { name: string; logoUrl: string | null }, pinSize: number, selected: boolean) {
  const tail = Math.round(pinSize * PIN_TAIL_RATIO);
  const accent = selected ? "var(--voc-red)" : "var(--petrol)";
  const content = company.logoUrl
    ? `<img src="${escapeHtml(company.logoUrl)}" alt="" style="width:108%;height:108%;object-fit:contain;" />`
    : `<span style="font-size:${Math.round(pinSize * 0.44)}px;font-weight:700;color:${accent};font-family:-apple-system,'Segoe UI',Arial,sans-serif;">${escapeHtml(company.name.charAt(0).toUpperCase())}</span>`;

  return L.divIcon({
    html: `<div style="position:relative;width:${pinSize}px;height:${pinSize + tail}px;">
      <div style="width:${pinSize}px;height:${pinSize}px;border-radius:9px;background:#ffffff;border:1.5px solid ${accent};box-shadow:0 1px 4px rgba(0,0,0,.35);overflow:hidden;display:flex;align-items:center;justify-content:center;">${content}</div>
      <div style="position:absolute;left:50%;top:${pinSize - 2}px;transform:translateX(-50%);width:0;height:0;border-left:${tail * 0.67}px solid transparent;border-right:${tail * 0.67}px solid transparent;border-top:${tail}px solid ${accent};"></div>
    </div>`,
    className: "voc-company-icon",
    iconSize: [pinSize, pinSize + tail],
    iconAnchor: [pinSize / 2, pinSize + tail],
    popupAnchor: [0, -(pinSize + tail + 8)],
  });
}

// Houdt het huidige zoomniveau bij (herrendert de pins met de passende
// maat) — moet als kind van MapContainer staan om bij de Leaflet-
// kaartinstantie te kunnen via useMapEvents.
function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({ zoomend: (e) => onZoomChange(e.target.getZoom()) });
  return null;
}

// Eigen clusterbubbel i.p.v. leaflet.markercluster's standaard geel/oranje
// — drie oplopende maten naar aantal bedrijven. Donkerpetrol i.p.v. VOC-rood
// (afwerkronde blok 3): --petrol-deep blijft bewust gelijk in licht/donker
// (zie globals.css), dus geen aparte donkere variant nodig.
function createClusterIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 34 : count < 50 ? 40 : 46;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:var(--petrol-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;box-shadow:0 0 0 4px color-mix(in srgb, var(--petrol-deep) 18%, transparent);">${count}</div>`,
    className: "voc-cluster-icon",
    iconSize: L.point(size, size),
  });
}

const TILE_LAYERS = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-auteurs &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-auteurs &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const;

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
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pinSize = currentZoom >= CLOSE_ZOOM_THRESHOLD ? PIN_SIZE_CLOSE : PIN_SIZE_COMPACT;
  const resolvedTheme = useResolvedTheme();
  const tileLayer = TILE_LAYERS[resolvedTheme];

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
      <ZoomWatcher onZoomChange={setCurrentZoom} />
      {/* Afwerkronde blok 3: een gedempte basiskaart (CARTO Positron/Dark
          Matter) i.p.v. de fel-gekleurde standaard-OpenStreetMap-tegels, die
          in donker thema ook nog eens altijd fel wit bleven. */}
      <TileLayer key={resolvedTheme} attribution={tileLayer.attribution} url={tileLayer.url} />
      {/* Bij veel bedrijven dicht bij elkaar (bv. hele binnenstad) groepeert
          dit tot één getal-bubbel i.p.v. een onleesbare stapel spelden —
          inzoomen of erop klikken splitst 'm vanzelf weer op. Een kleinere
          straal dan de standaard (25 i.p.v. 80px) en een harde grens vanaf
          zoomniveau 15 houden het bewust spaarzaam: zodra je dichtbij genoeg
          inzoomt om los van elkaar liggende bedrijven te onderscheiden, mag
          het ook gewoon wat drukker ogen met losse spelden. Dat is ook
          precies het punt waarop de pins zelf groter worden (zie
          CLOSE_ZOOM_THRESHOLD) — vanaf hier gaat het om losse bedrijven
          herkennen, niet meer om overzicht. */}
      <MarkerClusterGroup chunkedLoading maxClusterRadius={25} disableClusteringAtZoom={15} iconCreateFunction={createClusterIcon}>
        {companies.map((company) => (
          <Marker
            key={company.id}
            position={[company.latitude, company.longitude]}
            icon={createCompanyIcon({ name: company.name, logoUrl: company.logoUrl }, pinSize, selectedId === company.id)}
            eventHandlers={{
              popupopen: () => setSelectedId(company.id),
              popupclose: () => setSelectedId((current) => (current === company.id ? null : current)),
            }}
          >
            <Popup className="voc-company-popup" minWidth={200}>
              <Link href={company.href ?? `/bedrijven/${company.id}`} onClick={company.onClick} className="group flex items-center gap-3">
                <CompanyLogo logoUrl={company.logoUrl} name={company.name} size={40} />
                <span className="min-w-0 flex-1">
                  {/* Vaste grijstinten i.p.v. text-foreground/text-muted: de
                      Leaflet-popup zelf volgt het donkere thema van de app
                      niet (blijft altijd een witte balon), dus de
                      thema-afhankelijke tokens zouden hier in donker thema
                      bijna-wit-op-wit en onleesbaar worden. */}
                  <span className="block truncate text-sm font-medium text-gray-900 group-hover:text-petrol">{company.name}</span>
                  {company.city && <span className="block truncate text-xs text-gray-600">{company.city}</span>}
                </span>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
