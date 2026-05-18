import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import { useVirtualizer } from "@tanstack/react-virtual";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FitGpsRepairRun, FitRoutePoint } from "../editor";
import { getFitMessageTimestampLabel } from "../editor";
import {
  primaryButton,
  secondaryButton,
  virtualList,
  virtualRow,
} from "../styles/app.css";
import {
  detailColumn,
  detailDisclosure,
  detailDisclosureBody,
  detailDisclosureTrigger,
  detailDisclosureTriggerMeta,
  emptyState,
  footer,
  footerActions,
  footerCopy,
  header,
  headerActions,
  headerMeta,
  list,
  listItemButton,
  listItemButtonSelected,
  listItemHeader,
  listItemMeta,
  listItemTitle,
  mapBadge,
  mapBadgeAccent,
  mapBadgeRow,
  mapBadgeWarning,
  mapCanvas,
  mapColumn,
  mapLegend,
  mapLegendItem,
  mapLegendLabel,
  mapLegendMarker,
  mapLegendMarkerKnown,
  mapLegendMarkerMissing,
  mapLegendMarkerPreview,
  mapShell,
  metricPill,
  metricsRow,
  missingFlag,
  missingFlagMuted,
  missingFlags,
  missingItem,
  missingItemHeader,
  missingItemMeta,
  missingItemTitle,
  panel,
  sectionTitle,
  selectedSpanScroll,
  selectedSpanList,
  stateBanner,
  stateBannerError,
  stateBannerLoading,
  statusPill,
  statusPillBusy,
  statusPillError,
  title,
  titleWrap,
  workspace,
} from "../styles/gpsRepairPanel.css";

type GpsRepairStatus = "idle" | "loading" | "preview" | "error";

export interface GpsRepairPanelProps {
  readonly open: boolean;
  readonly runs: readonly FitGpsRepairRun[];
  readonly routeSegments: readonly (readonly FitRoutePoint[])[];
  readonly selectedRunIndex: number;
  readonly previewRoute: readonly FitRoutePoint[] | null;
  readonly status: GpsRepairStatus;
  readonly errorMessage: string | null;
  readonly onClose: () => void;
  readonly activityMenuSlot?: ReactNode;
  readonly onSelectRun: (runIndex: number) => void;
  readonly onRequestPreview: () => void;
  readonly onCancelPreview: () => void;
  readonly onApplyPreview: () => void;
}

const EMPTY_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#f7f2fa",
      },
    },
  ],
};

export function GpsRepairPanel({
  open,
  runs,
  routeSegments,
  selectedRunIndex,
  previewRoute,
  status,
  errorMessage,
  activityMenuSlot,
  onSelectRun,
  onRequestPreview,
  onCancelPreview,
  onApplyPreview,
}: GpsRepairPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedSpanScrollRef = useRef<HTMLDivElement | null>(null);
  const selectedRun = runs[selectedRunIndex] ?? null;
  const mapStyleUrl = resolveMapStyleUrl();
  const gapSegments = useMemo(
    () =>
      runs.map((run) => [
        { lat: run.before.latitudeDegrees, lon: run.before.longitudeDegrees },
        { lat: run.after.latitudeDegrees, lon: run.after.longitudeDegrees },
      ]),
    [runs],
  );
  const routeMetrics = useMemo(
    () => ({
      knownPointCount: routeSegments.reduce(
        (total, segment) => total + segment.length,
        0,
      ),
      previewPointCount: previewRoute?.length ?? 0,
      }),
    [previewRoute, routeSegments],
  );
  const selectedSpanVirtualizer = useVirtualizer({
    count: selectedRun?.missingRecords.length ?? 0,
    getScrollElement: () => selectedSpanScrollRef.current,
    getItemKey: (index) => selectedRun?.missingRecords[index]?.record.id ?? index,
    estimateSize: () => 86,
    overscan: 4,
  });
  const routeSegmentsRef = useRef(routeSegments);
  const gapSegmentsRef = useRef(gapSegments);
  const previewRouteRef = useRef(previewRoute);
  routeSegmentsRef.current = routeSegments;
  gapSegmentsRef.current = gapSegments;
  previewRouteRef.current = previewRoute;

  useEffect(() => {
    if (!open || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyleUrl ?? EMPTY_STYLE,
      center: [0, 0],
      zoom: 1,
      attributionControl: { compact: false },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("known-route", {
        type: "geojson",
        data: buildLineCollection(routeSegmentsRef.current),
      });
      map.addLayer({
        id: "known-route",
        type: "line",
        source: "known-route",
        paint: {
          "line-color": "#6750a4",
          "line-width": 4,
        },
      });
      map.addSource("missing-gaps", {
        type: "geojson",
        data: buildLineCollection(gapSegmentsRef.current),
      });
      map.addLayer({
        id: "missing-gaps",
        type: "line",
        source: "missing-gaps",
        paint: {
          "line-color": "#ba1a1a",
          "line-width": 4,
          "line-dasharray": [1.5, 1.5],
        },
      });
      map.addSource("preview-route", {
        type: "geojson",
        data: buildLineCollection(
          previewRouteRef.current ? [previewRouteRef.current] : [],
        ),
      });
      map.addLayer({
        id: "preview-route",
        type: "line",
        source: "preview-route",
        paint: {
          "line-color": "#006c4c",
          "line-width": 5,
        },
      });
      fitMapToData(
        map,
        routeSegmentsRef.current,
        gapSegmentsRef.current,
        previewRouteRef.current,
      );
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    updateLineSource(map, "known-route", routeSegments);
    updateLineSource(map, "missing-gaps", gapSegments);
    updateLineSource(map, "preview-route", previewRoute ? [previewRoute] : []);
    fitMapToData(map, routeSegments, gapSegments, previewRoute);
  }, [gapSegments, previewRoute, routeSegments]);

  useEffect(() => {
    if (!detailsOpen) {
      if (recordsOpen) {
        setRecordsOpen(false);
      }
      return;
    }

    if (!recordsOpen) {
      return;
    }

    selectedSpanScrollRef.current?.scrollTo({ top: 0 });
  }, [detailsOpen, recordsOpen, selectedRunIndex]);

  if (!open) {
    return null;
  }

  const selectedMissingRecords = selectedRun?.missingRecords ?? [];
  const statusLabel = getStatusLabel(status, errorMessage);
  const statusPillClass = [
    statusPill,
    status === "loading" ? statusPillBusy : "",
    status === "error" ? statusPillError : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={panel} aria-label="GPS repair workspace">
      <header className={header}>
        <div className={titleWrap}>
          <h2 className={title}>GPS repair</h2>
          <div className={headerMeta}>
            <span className={statusPillClass}>{statusLabel}</span>
            <span>
              {runs.length} repairable {runs.length === 1 ? "span" : "spans"}
            </span>
          </div>
        </div>
        {activityMenuSlot ? <div className={headerActions}>{activityMenuSlot}</div> : null}
      </header>

      {status === "loading" ? (
        <div className={`${stateBanner} ${stateBannerLoading}`}>
          Building preview.
        </div>
      ) : null}
      {status === "error" ? (
        <div className={`${stateBanner} ${stateBannerError}`}>
          {errorMessage ?? "The GPS repair preview could not be generated."}
        </div>
      ) : null}

      <div className={workspace}>
        <div className={mapColumn}>
          <div className={mapShell}>
            <div ref={mapContainerRef} className={mapCanvas} aria-label="GPS repair map" />
            <div className={mapBadgeRow}>
              <span className={`${mapBadge} ${mapBadgeAccent}`}>
                {routeMetrics.knownPointCount} known points
              </span>
              <span className={mapBadge}>{runs.length} gaps</span>
              <span className={`${mapBadge} ${status === "error" ? mapBadgeWarning : ""}`}>
                {routeMetrics.previewPointCount} preview points
              </span>
            </div>
            <ul className={mapLegend} aria-label="Map legend">
              <li className={mapLegendItem}>
                <span
                  className={`${mapLegendMarker} ${mapLegendMarkerKnown}`}
                  aria-hidden="true"
                />
                <span className={mapLegendLabel}>Known</span>
              </li>
              <li className={mapLegendItem}>
                <span
                  className={`${mapLegendMarker} ${mapLegendMarkerMissing}`}
                  aria-hidden="true"
                />
                <span className={mapLegendLabel}>Gap</span>
              </li>
              <li className={mapLegendItem}>
                <span
                  className={`${mapLegendMarker} ${mapLegendMarkerPreview}`}
                  aria-hidden="true"
                />
                <span className={mapLegendLabel}>Preview</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <section className={detailDisclosure} aria-label="Repair spans">
        <button
          className={detailDisclosureTrigger}
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((current) => !current)}
        >
          <span>Spans ({runs.length})</span>
          <span className={detailDisclosureTriggerMeta}>
            {selectedRun
              ? `Selected: Span ${selectedRunIndex + 1}, ${selectedMissingRecords.length} records`
              : "No span selected"}
          </span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>

        {detailsOpen ? (
          <div className={detailDisclosureBody}>
            <div className={detailColumn}>
              <section aria-label="Repair span list">
                <h3 className={sectionTitle}>Spans</h3>
                {runs.length > 0 ? (
                  <ul className={list}>
                    {runs.map((run, runIndex) => {
                      const isSelected = runIndex === selectedRunIndex;
                      return (
                        <li key={`${run.before.record.id}:${run.after.record.id}`}>
                          <button
                            className={[
                              listItemButton,
                              isSelected ? listItemButtonSelected : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            type="button"
                            onClick={() => onSelectRun(runIndex)}
                          >
                            <div className={listItemHeader}>
                              <span className={listItemTitle}>
                                Span {runIndex + 1}
                                {isSelected ? <span className={metricPill}>selected</span> : null}
                              </span>
                              <span className={listItemMeta}>
                                {run.missingRecords.length} records
                              </span>
                            </div>
                            <div className={listItemMeta}>{formatRunLabel(run)}</div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className={emptyState}>No bounded missing GPS spans were found.</div>
                )}
              </section>

              <section className={detailDisclosure} aria-label="Selected span records">
                <button
                  className={detailDisclosureTrigger}
                  type="button"
                  aria-expanded={recordsOpen}
                  onClick={() => setRecordsOpen((current) => !current)}
                >
                  <span>Records</span>
                  <span className={detailDisclosureTriggerMeta}>
                    {selectedRun
                      ? `${selectedMissingRecords.length} records`
                      : "No span selected"}
                  </span>
                  <ChevronDown size={17} aria-hidden="true" />
                </button>

                {recordsOpen ? (
                  <div className={detailDisclosureBody}>
                    {selectedMissingRecords.length > 0 ? (
                      <div ref={selectedSpanScrollRef} className={selectedSpanScroll}>
                        <ul
                          className={`${virtualList} ${selectedSpanList}`}
                          aria-label="Selected span records"
                          style={{ height: selectedSpanVirtualizer.getTotalSize() }}
                        >
                          {selectedSpanVirtualizer.getVirtualItems().map((item) => {
                            const missingRecord = selectedMissingRecords[item.index];
                            if (!missingRecord) {
                              return null;
                            }

                            return (
                              <li
                                key={missingRecord.record.id}
                                ref={selectedSpanVirtualizer.measureElement}
                                className={virtualRow}
                                data-index={item.index}
                                style={{ transform: `translateY(${item.start}px)` }}
                              >
                                <div className={missingItem}>
                                  <div className={missingItemHeader}>
                                    <h4 className={missingItemTitle}>
                                      {getFitMessageTimestampLabel(missingRecord.record) ??
                                        `${missingRecord.timestampSeconds}s`}
                                    </h4>
                                    <span className={missingItemMeta}>
                                      Record {missingRecord.record.order + 1}
                                    </span>
                                  </div>
                                  <div className={missingFlags}>
                                    {missingRecord.missingLatitude ? (
                                      <span className={missingFlag}>Latitude missing</span>
                                    ) : null}
                                    {missingRecord.missingLongitude ? (
                                      <span className={`${missingFlag} ${missingFlagMuted}`}>
                                        Longitude missing
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : (
                      <div className={emptyState}>
                        Select a repairable span to inspect its records.
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        ) : null}
      </section>

      <footer className={footer}>
        <p className={footerCopy}>
          {status === "preview" ? "Preview ready." : "No preview staged."}
        </p>
        <div className={footerActions}>
          <button
            className={secondaryButton}
            type="button"
            onClick={onRequestPreview}
            disabled={status === "loading" || selectedRun === null}
          >
            Preview repair
          </button>
          <button
            className={secondaryButton}
            type="button"
            onClick={onCancelPreview}
            disabled={status !== "loading" && status !== "preview"}
          >
            Cancel preview
          </button>
          <button
            className={primaryButton}
            type="button"
            onClick={onApplyPreview}
            disabled={status !== "preview"}
          >
            Apply preview
          </button>
        </div>
      </footer>
    </section>
  );
}

function buildLineCollection(segments: readonly (readonly FitRoutePoint[])[]) {
  return {
    type: "FeatureCollection" as const,
    features: segments
      .filter((segment) => segment.length >= 2)
      .map((segment) => ({
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: segment.map((point) => [point.lon, point.lat]),
        },
      })),
  };
}

function updateLineSource(
  map: MapLibreMap,
  sourceId: string,
  segments: readonly (readonly FitRoutePoint[])[],
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(buildLineCollection(segments));
}

function fitMapToData(
  map: MapLibreMap,
  routeSegments: readonly (readonly FitRoutePoint[])[],
  gapSegments: readonly (readonly FitRoutePoint[])[],
  previewRoute: readonly FitRoutePoint[] | null,
) {
  const points = [
    ...routeSegments.flat(),
    ...gapSegments.flat(),
    ...(previewRoute ?? []),
  ];
  if (points.length === 0) {
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const point of points) {
    bounds.extend([point.lon, point.lat]);
  }
  map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 16 });
}

function resolveMapStyleUrl(): string | null {
  const styleUrl = (
    import.meta as ImportMeta & {
      readonly env?: { readonly VITE_MAP_STYLE_URL?: string };
    }
  ).env?.VITE_MAP_STYLE_URL?.trim();

  return styleUrl && styleUrl.length > 0 ? styleUrl : null;
}

function getStatusLabel(status: GpsRepairStatus, errorMessage: string | null): string {
  if (status === "error") {
    return errorMessage ? "Preview error" : "Preview unavailable";
  }

  if (status === "loading") {
    return "Building preview";
  }

  if (status === "preview") {
    return "Preview ready";
  }

  return "Idle";
}

function formatRunLabel(run: FitGpsRepairRun): string {
  const beforeLabel =
    getFitMessageTimestampLabel(run.before.record) ??
    `${run.before.timestampSeconds}s`;
  const afterLabel =
    getFitMessageTimestampLabel(run.after.record) ??
    `${run.after.timestampSeconds}s`;
  return `${beforeLabel} to ${afterLabel}`;
}
