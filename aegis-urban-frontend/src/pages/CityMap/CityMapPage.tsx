import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import styles from "./CityMapPage.module.css";

// Leaflet se importa aquí → solo descarga cuando el usuario navega a esta página
// (React.lazy en AppRouter garantiza que este chunk no se incluye en el bundle inicial)
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix para los iconos de Leaflet en Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadowUrl });

export default function CityMapPage() {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    // Buenos Aires coords (del seed de BD)
    const map = L.map(mapRef.current, {
      center: [-34.6037, -58.3816],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      className: styles.darkTile,
    }).addTo(map);

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t("nav.cityMap")}</h1>
        <p className={styles.subtitle}>Ciudad AEGIS — Buenos Aires</p>
      </header>
      <div ref={mapRef} className={styles.map} />
    </div>
  );
}
