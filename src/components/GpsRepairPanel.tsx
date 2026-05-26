import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  ChevronDown,
  MapPinPlus,
  Settings,
} from "lucide-react";
import maplibregl, {
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type Map as MapLibreMap,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import { useVirtualizer } from "@tanstack/react-virtual";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  FitActivitySummary,
  FitLapDataSummary,
  FitMessageDataField,
  FitMessageDataGroup,
  FitMessageDataSummary,
  FitSessionDataSummary,
  FitGpsFixedRepair,
  FitGpsEditRoute,
  FitGpsEditRoutePoint,
  FitGpsMapView,
  FitGpsRepairRun,
  FitRoutePoint,
} from "../editor";
import {
  buildFitMessageDataSummary,
  buildGpsEditRouteDragPreview,
  calculateGpsRepairRunDistanceMeters,
  getFitMessageTimestampLabel,
  makeGpsRepairRunKey,
} from "../editor";
import type { FitDataRecord, FitDocument } from "../fit";
import {
  iconOnlyButton,
  virtualList,
  virtualRow,
} from "../styles/app.css";
import {
  dataPanelHeader,
  dataPanelHeaderText,
  dataActionButton,
  dataSection,
  denseMessagePager,
  denseMessagePagerActions,
  denseMessagePagerButton,
  denseMessageTable,
  denseMessageTableCell,
  denseMessageTableHead,
  denseMessageTableMutedCell,
  denseMessageTableScroller,
  denseMessageTableShell,
  emptyState,
  fitMessagePanel,
  fitMessagePanelFlat,
  mapCanvas,
  mapColumn,
  mapToolBar,
  mapToolButton,
  mapToolButtonActive,
  mapToolGroup,
  messageGroup,
  messageGroupBody,
  messageGroupChevron,
  messageGroupList,
  messageGroupMeta,
  messageGroupSummary,
  messageGroupSummaryText,
  messageGroupTitle,
  mapLegend,
  mapLegendItem,
  mapLegendLabel,
  mapLegendMarker,
  mapLegendMarkerKnown,
  mapShell,
  eraseSelectionActions,
  eraseSelectionPanel,
  eraseSelectionText,
  detailColumn,
  detailDisclosure,
  detailDisclosureBody,
  detailDisclosureTrigger,
  detailDisclosureTriggerMeta,
  panel,
  panelHeader,
  panelHeaderSettings,
  metricPill,
  list,
  listItemButton,
  listItemButtonSelected,
  listItemHeader,
  listItemMeta,
  listItemTitle,
  missingFlag,
  missingFlagMuted,
  missingFlags,
  missingItem,
  missingItemHeader,
  missingItemMeta,
  missingItemTitle,
  sectionTitle,
  selectedSpanList,
  selectedSpanScroll,
  sessionFields,
  sessionFieldsBody,
  sessionFieldsChevron,
  sessionFieldsSummary,
  sessionHeader,
  sessionMetric,
  sessionMetricGrid,
  sessionMetricLabel,
  sessionMetricValue,
  sessionTitle,
  settingsMenuContent,
  settingsMenuIndicator,
  settingsMenuItem,
  workspace,
} from "../styles/gpsRepairPanel.css";

interface SelectableGpsPoint {
  readonly point: FitGpsEditRoutePoint;
  readonly segmentIndex: number;
  readonly pointIndex: number;
  readonly flatIndex: number;
}

type GapRow =
  | {
      readonly kind: "active";
      readonly key: string;
      readonly runIndex: number;
      readonly canFix: boolean;
      readonly anchorPlacement: "start" | "end" | null;
      readonly sortTimestampSeconds: number;
      readonly timeRange: string;
      readonly distanceMeters: number | null;
      readonly distanceLabel: "Estimated";
      readonly focusSegments: readonly (readonly FitRoutePoint[])[];
    }
  | {
      readonly kind: "fixed";
      readonly key: string;
      readonly sortTimestampSeconds: number;
      readonly timeRange: string;
      readonly distanceMeters: number | null;
      readonly distanceLabel: "Actual";
      readonly focusSegments: readonly (readonly FitRoutePoint[])[];
    };

interface SessionMetric {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly fieldIds: readonly string[];
}

type SessionField = FitSessionDataSummary["fields"][number];
type LapField = FitLapDataSummary["fields"][number];
type SummaryField = SessionField | LapField | FitMessageDataField;

export interface GpsRepairPanelProps {
  readonly open: boolean;
  readonly activitySummary: FitActivitySummary;
  readonly sessionDataSummary: FitSessionDataSummary | null;
  readonly lapSummaries: readonly FitLapDataSummary[];
  readonly messageDocument: FitDocument | null;
  readonly timeZone: string;
  readonly runs: readonly FitGpsRepairRun[];
  readonly fixedRepairs: readonly FitGpsFixedRepair[];
  readonly gpsMapView: FitGpsMapView;
  readonly selectedRunIndex: number;
  readonly onClose: () => void;
  readonly onSelectRun: (runIndex: number) => void;
  readonly onMoveGpsRecordPoint: (recordId: string, point: FitRoutePoint) => void;
  readonly onEraseGpsRange: (startRecordId: string, endRecordId: string) => void;
  readonly onPlaceGpsRepairAnchor: (
    runIndex: number,
    point: FitRoutePoint,
  ) => void;
}

interface FitMessageSummaryPanelProps {
  readonly ariaLabel: string;
  readonly className: string;
  readonly container: "li" | "section";
  readonly fieldDisclosureLabel: string;
  readonly fields: readonly SummaryField[] | null;
  readonly heading: "h2" | "h3";
  readonly metrics: readonly SessionMetric[];
  readonly title: string;
}

function FitMessageSummaryPanel({
  ariaLabel,
  className,
  container,
  fieldDisclosureLabel,
  fields,
  heading,
  metrics,
  title,
}: FitMessageSummaryPanelProps) {
  const Container = container;
  const Heading = heading;

  return (
    <Container className={className} aria-label={ariaLabel}>
      <div className={sessionHeader}>
        <Heading className={sessionTitle}>{title}</Heading>
      </div>
      <dl className={sessionMetricGrid}>
        {metrics.map((metric) => (
          <div key={metric.key} className={sessionMetric}>
            <dt className={sessionMetricLabel}>{metric.label}</dt>
            <dd className={sessionMetricValue}>{metric.value}</dd>
          </div>
        ))}
      </dl>
      {fields ? (
        <details className={sessionFields}>
          <summary
            className={sessionFieldsSummary}
            aria-label={fieldDisclosureLabel}
          >
            <ChevronDown
              className={sessionFieldsChevron}
              size={17}
              aria-hidden="true"
            />
          </summary>
          <div className={sessionFieldsBody}>
            <div className={sessionMetricGrid}>
              {fields.map((field) => (
                <div key={field.fieldId} className={sessionMetric}>
                  <span className={sessionMetricLabel}>
                    {field.name} ({field.number})
                  </span>
                  <span className={sessionMetricValue}>{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </Container>
  );
}

interface FitMessageGroupsPanelProps {
  readonly activitySummary: FitActivitySummary;
  readonly sessionDataSummary: FitSessionDataSummary | null;
  readonly lapSummaries: readonly FitLapDataSummary[];
  readonly messageGroups: readonly FitMessageGroupHeader[];
  readonly showAllMessageFields: boolean;
  readonly getMessageSummary: (
    message: FitMessageHeader,
  ) => FitMessageDataSummary;
}

function FitMessageGroupsPanel({
  activitySummary,
  sessionDataSummary,
  lapSummaries,
  messageGroups,
  showAllMessageFields,
  getMessageSummary,
}: FitMessageGroupsPanelProps) {
  const lapSummaryById = useMemo(
    () => new Map(lapSummaries.map((lap) => [lap.lapId, lap] as const)),
    [lapSummaries],
  );

  return (
    <section className={dataSection} aria-label="FIT messages">
      <div className={dataPanelHeader}>
        <div className={dataPanelHeaderText}>
          <h3 className={sectionTitle}>Messages</h3>
        </div>
      </div>
      <div className={messageGroupList}>
        {messageGroups.map((group) => (
          <FitMessageGroupPanel
            key={group.key}
            activitySummary={activitySummary}
            group={group}
            lapSummaryById={lapSummaryById}
            sessionDataSummary={sessionDataSummary}
            showAllMessageFields={showAllMessageFields}
            getMessageSummary={getMessageSummary}
          />
        ))}
      </div>
    </section>
  );
}

interface FitMessageGroupPanelProps {
  readonly activitySummary: FitActivitySummary;
  readonly group: FitMessageGroupHeader;
  readonly lapSummaryById: ReadonlyMap<string, FitLapDataSummary>;
  readonly sessionDataSummary: FitSessionDataSummary | null;
  readonly showAllMessageFields: boolean;
  readonly getMessageSummary: (
    message: FitMessageHeader,
  ) => FitMessageDataSummary;
}

function FitMessageGroupPanel({
  activitySummary,
  group,
  lapSummaryById,
  sessionDataSummary,
  showAllMessageFields,
  getMessageSummary,
}: FitMessageGroupPanelProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(group.count / DENSE_MESSAGE_PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  useEffect(() => {
    if (pageIndex !== safePageIndex) {
      setPageIndex(safePageIndex);
    }
  }, [pageIndex, safePageIndex]);

  return (
    <details className={messageGroup}>
      <summary className={messageGroupSummary}>
        <span className={messageGroupSummaryText}>
          <span className={messageGroupTitle}>{group.label}</span>
          <span className={messageGroupMeta}>
            {group.count} {group.count === 1 ? "message" : "messages"}
          </span>
        </span>
        <ChevronDown
          className={messageGroupChevron}
          size={17}
          aria-hidden="true"
        />
      </summary>
      <div className={messageGroupBody}>
        {group.dense ? (
          <DenseMessageTable
            group={group}
            pageIndex={safePageIndex}
            pageCount={pageCount}
            showAllMessageFields={showAllMessageFields}
            getMessageSummary={getMessageSummary}
            onPageChange={setPageIndex}
          />
        ) : (
          group.messages.map((message) => (
            <FitGroupedMessageSummary
              key={message.id}
              activitySummary={activitySummary}
              lapSummary={lapSummaryById.get(message.id) ?? null}
              message={getMessageSummary(message)}
              sessionDataSummary={sessionDataSummary}
              showAllMessageFields={showAllMessageFields}
            />
          ))
        )}
      </div>
    </details>
  );
}

interface FitGroupedMessageSummaryProps {
  readonly activitySummary: FitActivitySummary;
  readonly lapSummary: FitLapDataSummary | null;
  readonly message: FitMessageDataSummary;
  readonly sessionDataSummary: FitSessionDataSummary | null;
  readonly showAllMessageFields: boolean;
}

function FitGroupedMessageSummary({
  activitySummary,
  lapSummary,
  message,
  sessionDataSummary,
  showAllMessageFields,
}: FitGroupedMessageSummaryProps) {
  const isSession = message.messageId === sessionDataSummary?.sessionId;
  const sourceFields = isSession
    ? sessionDataSummary.fields
    : lapSummary
      ? lapSummary.fields
      : message.fields;
  const visibleFields = showAllMessageFields
    ? sourceFields
    : sourceFields.filter((field) => field.valid);
  const metrics = isSession
    ? buildPrimarySessionMetrics(activitySummary, sessionDataSummary)
    : lapSummary
      ? buildPrimaryLapMetrics(lapSummary)
      : buildPrimaryMessageMetrics(message);
  const metricFieldIds = new Set(metrics.flatMap((metric) => metric.fieldIds));
  const secondaryFields = visibleFields.filter(
    (field) => !metricFieldIds.has(field.fieldId),
  );

  return (
    <FitMessageSummaryPanel
      ariaLabel={message.title}
      className={`${fitMessagePanel} ${fitMessagePanelFlat}`}
      container="section"
      fieldDisclosureLabel={`${message.title} fields`}
      fields={secondaryFields}
      heading="h3"
      metrics={metrics}
      title={isSession ? "Session" : lapSummary ? `Lap ${lapSummary.index + 1}` : message.title}
    />
  );
}

interface DenseMessageTableProps {
  readonly group: FitMessageGroupHeader;
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly showAllMessageFields: boolean;
  readonly getMessageSummary: (
    message: FitMessageHeader,
  ) => FitMessageDataSummary;
  readonly onPageChange: (pageIndex: number) => void;
}

function DenseMessageTable({
  group,
  pageIndex,
  pageCount,
  showAllMessageFields,
  getMessageSummary,
  onPageChange,
}: DenseMessageTableProps) {
  const startIndex = pageIndex * DENSE_MESSAGE_PAGE_SIZE;
  const pageMessages = group.messages.slice(
    startIndex,
    startIndex + DENSE_MESSAGE_PAGE_SIZE,
  ).map(getMessageSummary);
  const columns = buildDenseMessageColumns(pageMessages, showAllMessageFields);
  let previousDateLabel: string | null = null;

  return (
    <div className={denseMessageTableShell}>
      <div className={denseMessagePager}>
        <span>
          {startIndex + 1}-{startIndex + pageMessages.length} of {group.count}
        </span>
        <span className={denseMessagePagerActions}>
          <button
            className={denseMessagePagerButton}
            type="button"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            Previous
          </button>
          <span>
            Page {pageIndex + 1} of {pageCount}
          </span>
          <button
            className={denseMessagePagerButton}
            type="button"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            Next
          </button>
        </span>
      </div>
      <div className={denseMessageTableScroller}>
        <table className={denseMessageTable}>
          <thead className={denseMessageTableHead}>
            <tr>
              <th className={denseMessageTableCell}>#</th>
              <th className={denseMessageTableCell}>Date</th>
              <th className={denseMessageTableCell}>Time</th>
              {columns.map((column) => (
                <th key={column.key} className={denseMessageTableCell}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageMessages.map((message) => {
              const dateLabel =
                message.dateLabel && message.dateLabel !== previousDateLabel
                  ? message.dateLabel
                  : "";
              previousDateLabel = message.dateLabel;
              return (
                <tr key={message.messageId}>
                  <td className={`${denseMessageTableCell} ${denseMessageTableMutedCell}`}>
                    {message.index + 1}
                  </td>
                  <td className={`${denseMessageTableCell} ${denseMessageTableMutedCell}`}>
                    {dateLabel}
                  </td>
                  <td className={denseMessageTableCell}>
                    {message.timeLabel ?? "-"}
                  </td>
                  {columns.map((column) => (
                    <td key={column.key} className={denseMessageTableCell}>
                      {findDenseMessageCell(message, column)?.value ?? "-"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface FitMessageHeader {
  readonly id: string;
  readonly index: number;
  readonly record: FitDataRecord;
  readonly version: number;
}

interface FitMessageGroupHeader {
  readonly key: string;
  readonly globalMessageNumber: number;
  readonly messageName: string;
  readonly label: string;
  readonly count: number;
  readonly dense: boolean;
  readonly order: number;
  readonly messages: readonly FitMessageHeader[];
}

interface MessageVersionEntry {
  readonly record: FitDataRecord;
  readonly version: number;
}

interface DenseMessageColumn {
  readonly key: string;
  readonly number: number;
  readonly name: string;
  readonly label: string;
}

const DENSE_MESSAGE_PAGE_SIZE = 50;
const DENSE_MESSAGE_COLUMN_LIMIT = 8;
const DENSE_MESSAGE_FIELD_PRIORITY = [
  "timestamp",
  "timer_time",
  "position_lat",
  "position_long",
  "distance",
  "total_distance",
  "enhanced_speed",
  "speed",
  "heart_rate",
  "cadence",
  "power",
  "altitude",
  "enhanced_altitude",
] as const;

const SUMMARY_MESSAGE_PRIORITY = new Map<string, number>([
  ["session", 0],
  ["lap", 1],
  ["activity", 2],
  ["file_id", 3],
  ["sport", 4],
]);

const DENSE_MESSAGE_THRESHOLD = 120;

function buildFitMessageGroupHeaders(
  document: Pick<FitDocument, "messages">,
  versions: Map<string, MessageVersionEntry>,
): FitMessageGroupHeader[] {
  const groups = new Map<number, FitMessageHeader[]>();

  for (const message of document.messages) {
    const groupMessages = groups.get(message.globalMessageNumber) ?? [];
    groupMessages.push({
      id: message.id,
      index: groupMessages.length,
      record: message,
      version: resolveMessageVersion(versions, message),
    });
    groups.set(message.globalMessageNumber, groupMessages);
  }

  return [...groups.entries()]
    .map(([globalMessageNumber, messages]) => {
      const firstMessage = messages[0]?.record;
      const messageName =
        firstMessage?.messageName ??
        `unknown_message_${globalMessageNumber}`;
      return {
        key: `${globalMessageNumber}:${messageName}`,
        globalMessageNumber,
        messageName,
        label: titleCase(messageName),
        count: messages.length,
        dense: messageName === "record" || messages.length > DENSE_MESSAGE_THRESHOLD,
        order: firstMessage?.order ?? Number.MAX_SAFE_INTEGER,
        messages,
      };
    })
    .sort(compareMessageGroupHeaders);
}

function resolveMessageVersion(
  versions: Map<string, MessageVersionEntry>,
  message: FitDataRecord,
): number {
  const current = versions.get(message.id);
  if (current?.record === message) {
    return current.version;
  }

  const version = (current?.version ?? 0) + 1;
  versions.set(message.id, { record: message, version });
  return version;
}

function compareMessageGroupHeaders(
  left: FitMessageGroupHeader,
  right: FitMessageGroupHeader,
): number {
  const priorityDelta =
    getMessageGroupPriority(left) - getMessageGroupPriority(right);
  return priorityDelta === 0 ? left.order - right.order : priorityDelta;
}

function getMessageGroupPriority(group: FitMessageGroupHeader): number {
  const summaryPriority = SUMMARY_MESSAGE_PRIORITY.get(group.messageName);
  if (summaryPriority !== undefined) {
    return summaryPriority;
  }

  return group.dense ? 100 : 50;
}

function buildDenseMessageColumns(
  messages: readonly FitMessageDataSummary[],
  showAllMessageFields: boolean,
): DenseMessageColumn[] {
  const columns = new Map<string, DenseMessageColumn & { seen: number }>();

  for (const message of messages) {
    for (const field of message.fields) {
      if (!showAllMessageFields && !field.valid) {
        continue;
      }

      if (field.name === "timestamp" || field.number === 253) {
        continue;
      }

      const key = makeDenseMessageColumnKey(field);
      const current = columns.get(key);
      if (current) {
        columns.set(key, { ...current, seen: current.seen + 1 });
        continue;
      }

      columns.set(key, {
        key,
        number: field.number,
        name: field.name,
        label: `${field.name} (${field.number})`,
        seen: 1,
      });
    }
  }

  return [...columns.values()]
    .sort((left, right) => {
      const priorityDelta =
        getDenseMessageFieldPriority(left.name) -
        getDenseMessageFieldPriority(right.name);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      if (left.seen !== right.seen) {
        return right.seen - left.seen;
      }

      return left.number - right.number;
    })
    .slice(0, DENSE_MESSAGE_COLUMN_LIMIT);
}

function findDenseMessageCell(
  message: FitMessageDataSummary,
  column: DenseMessageColumn,
): FitMessageDataField | undefined {
  return message.fields.find(
    (field) => makeDenseMessageColumnKey(field) === column.key,
  );
}

function makeDenseMessageColumnKey(field: FitMessageDataField): string {
  return `${field.number}:${field.name}`;
}

function getDenseMessageFieldPriority(fieldName: string): number {
  const index = DENSE_MESSAGE_FIELD_PRIORITY.indexOf(
    fieldName as (typeof DENSE_MESSAGE_FIELD_PRIORITY)[number],
  );
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

interface DraggedFixedRepairPoint {
  readonly recordId: string;
}

interface EditableFixedRepairPoint {
  readonly id: string;
  readonly recordId: string;
  readonly kind: FitGpsEditRoutePoint["kind"];
  readonly point: FitRoutePoint;
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

const FIXED_REPAIR_POINT_RADIUS_PX = 4;
const FIXED_REPAIR_POINT_HALO_RADIUS_PX = 5.5;
const FIXED_REPAIR_POINT_HITBOX_RADIUS_PX = 20;
const FIXED_REPAIR_POINT_HOVER_RADIUS_PX = 8;
const FIXED_REPAIR_POINT_STROKE_WIDTH_PX = 1.5;
const FIXED_REPAIR_POINT_HOVER_STROKE_WIDTH_PX = 2;
const FIXED_REPAIR_ROUTE_COLOR = "#4f378b";
const FIXED_REPAIR_ROUTE_HALO_COLOR = "#eaddff";

export function GpsRepairPanel({
  open,
  activitySummary: summary,
  sessionDataSummary,
  lapSummaries,
  messageDocument,
  timeZone,
  runs,
  fixedRepairs,
  gpsMapView,
  selectedRunIndex,
  onSelectRun,
  onMoveGpsRecordPoint,
  onEraseGpsRange,
  onPlaceGpsRepairAnchor,
}: GpsRepairPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [addGpsMode, setAddGpsMode] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [showAllMessageFields, setShowAllMessageFields] = useState(false);
  const [eraseSelection, setEraseSelection] = useState<{
    readonly start: SelectableGpsPoint;
    readonly end: SelectableGpsPoint | null;
  } | null>(null);
  const [anchorPlacementRunKey, setAnchorPlacementRunKey] = useState<string | null>(
    null,
  );
  const selectedSpanScrollRef = useRef<HTMLDivElement | null>(null);
  const mapStyleUrl = resolveMapStyleUrl();
  const selectedRun = runs[selectedRunIndex] ?? null;
  const messageSummaryCacheRef = useRef(
    new Map<
      string,
      {
        readonly record: FitDataRecord;
        readonly version: number;
        readonly summary: FitMessageDataSummary;
      }
    >(),
  );
  const messageVersionRef = useRef(new Map<string, MessageVersionEntry>());
  const messageGroups = useMemo(
    () =>
      messagesOpen && messageDocument
        ? buildFitMessageGroupHeaders(messageDocument, messageVersionRef.current)
        : [],
    [messageDocument, messagesOpen],
  );
  const getMessageSummary = (message: FitMessageHeader) => {
    const cached = messageSummaryCacheRef.current.get(message.id);
    if (
      cached &&
      cached.record === message.record &&
      cached.version === message.version
    ) {
      return cached.summary;
    }

    const summary = buildFitMessageDataSummary(
      message.record,
      message.index,
      { timeZone },
    );
    messageSummaryCacheRef.current.set(message.id, {
      record: message.record,
      version: message.version,
      summary,
    });
    return summary;
  };
  const editRoute = gpsMapView;
  const pendingDragRouteRef = useRef<{
    readonly recordId: string;
    readonly route: FitGpsEditRoute;
  } | null>(null);
  const pendingDragRoute = pendingDragRouteRef.current;
  const displayedEditRoute =
    pendingDragRoute &&
    !doesEditRouteReflectPendingDrag(
      editRoute,
      pendingDragRoute.recordId,
      pendingDragRoute.route,
    )
      ? pendingDragRoute.route
      : editRoute;
  if (pendingDragRoute && displayedEditRoute === editRoute) {
    pendingDragRouteRef.current = null;
  }
  const gapRows = useMemo(
    () => buildGapRows(runs, fixedRepairs),
    [fixedRepairs, runs],
  );
  const selectableGpsPoints = useMemo(
    () => buildSelectableGpsPoints(gpsMapView.points),
    [gpsMapView.points],
  );
  const eraseRange = useMemo(
    () =>
      eraseSelection?.end
        ? buildEraseRange(selectableGpsPoints, eraseSelection.start, eraseSelection.end)
        : null,
    [eraseSelection, selectableGpsPoints],
  );
  const eraseRangeSegments = useMemo(
    () => (eraseRange ? [eraseRange.points.map(({ point }) => point)] : []),
    [eraseRange],
  );
  const editableFixedRepairPoints = useMemo(
    () =>
      addGpsMode
        ? displayedEditRoute.points.map((point) => ({
            id: point.id,
            recordId: point.recordId,
            kind: point.kind,
            point,
          }))
        : [],
    [addGpsMode, displayedEditRoute.points],
  );
  const selectedMissingRecords = selectedRun?.missingRecords ?? [];
  const selectedSpanVirtualizer = useVirtualizer({
    count: selectedMissingRecords.length,
    getScrollElement: () => selectedSpanScrollRef.current,
    getItemKey: (index) => selectedMissingRecords[index]?.record.id ?? index,
    estimateSize: () => 86,
    overscan: 4,
  });
  const editRouteRef = useRef(displayedEditRoute);
  const gapRowsRef = useRef(gapRows);
  const selectableGpsPointsRef = useRef(selectableGpsPoints);
  const eraseModeRef = useRef(eraseMode);
  const addGpsModeRef = useRef(addGpsMode);
  const anchorPlacementRunKeyRef = useRef(anchorPlacementRunKey);
  const onPlaceGpsRepairAnchorRef = useRef(onPlaceGpsRepairAnchor);
  const eraseRangeSegmentsRef = useRef(eraseRangeSegments);
  const editableFixedRepairPointsRef = useRef(editableFixedRepairPoints);
  const onMoveGpsRecordPointRef = useRef(onMoveGpsRecordPoint);
  const draggedFixedRepairPointRef = useRef<DraggedFixedRepairPoint | null>(
    null,
  );
  const draggedFixedRepairLatestPointRef = useRef<FitRoutePoint | null>(null);
  const draggedFixedRepairMovedRef = useRef(false);
  const skipNextMapFitRef = useRef(false);
  editRouteRef.current = displayedEditRoute;
  gapRowsRef.current = gapRows;
  selectableGpsPointsRef.current = selectableGpsPoints;
  eraseModeRef.current = eraseMode;
  addGpsModeRef.current = addGpsMode;
  anchorPlacementRunKeyRef.current = anchorPlacementRunKey;
  eraseRangeSegmentsRef.current = eraseRangeSegments;
  editableFixedRepairPointsRef.current = editableFixedRepairPoints;
  onMoveGpsRecordPointRef.current = onMoveGpsRecordPoint;
  onPlaceGpsRepairAnchorRef.current = onPlaceGpsRepairAnchor;

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
    const canDragFixedRepairPoint = () =>
      !eraseModeRef.current &&
      !anchorPlacementRunKeyRef.current &&
      !draggedFixedRepairPointRef.current;
    const resolveEditableFixedRepairPoint = (
      fixedPoint: DraggedFixedRepairPoint | null,
    ): EditableFixedRepairPoint | null => {
      if (!fixedPoint) {
        return null;
      }

      return (
        editableFixedRepairPointsRef.current.find(
          (point) => point.recordId === fixedPoint.recordId,
        ) ?? null
      );
    };
    const setupMapLayers = () => {
      if (map.getSource("known-route")) {
        return;
      }

      map.addSource("known-route", {
        type: "geojson",
        data: buildLineCollection(editRouteRef.current.segments),
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
      map.addSource("known-route-points", {
        type: "geojson",
        data: buildKnownRoutePointCollection(selectableGpsPointsRef.current),
      });
      map.addLayer({
        id: "known-route-points",
        type: "circle",
        source: "known-route-points",
        paint: {
          "circle-color": "#f59e0b",
          "circle-radius": 6,
          "circle-opacity": eraseModeRef.current || addGpsModeRef.current ? 0.9 : 0,
          "circle-stroke-color": "#7c2d12",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": eraseModeRef.current || addGpsModeRef.current ? 0.9 : 0,
        },
      });
      map.addSource("erase-selection", {
        type: "geojson",
        data: buildLineCollection(eraseRangeSegmentsRef.current),
      });
      map.addLayer({
        id: "erase-selection",
        type: "line",
        source: "erase-selection",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 7,
          "line-opacity": 0.9,
        },
      });
      map.addSource("fixed-route-points", {
        type: "geojson",
        data: buildPointCollection(editableFixedRepairPointsRef.current),
      });
      map.addSource("fixed-route-hover-point", {
        type: "geojson",
        data: buildPointCollection([]),
      });
      map.addLayer({
        id: "fixed-route-point-halos",
        type: "circle",
        source: "fixed-route-points",
        paint: {
          "circle-color": [
            "match",
            ["get", "kind"],
            "gap",
            "#fff3cd",
            FIXED_REPAIR_ROUTE_HALO_COLOR,
          ],
          "circle-radius": FIXED_REPAIR_POINT_HALO_RADIUS_PX,
          "circle-opacity": 0.96,
          "circle-stroke-color": [
            "match",
            ["get", "kind"],
            "gap",
            "#8a5a00",
            FIXED_REPAIR_ROUTE_COLOR,
          ],
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.55,
          "circle-pitch-alignment": "viewport",
          "circle-pitch-scale": "viewport",
        },
      });
      map.addLayer({
        id: "fixed-route-points",
        type: "circle",
        source: "fixed-route-points",
        paint: {
          "circle-color": [
            "match",
            ["get", "kind"],
            "gap",
            "#c78600",
            FIXED_REPAIR_ROUTE_COLOR,
          ],
          "circle-radius": FIXED_REPAIR_POINT_RADIUS_PX,
          "circle-stroke-color": "#fffbfe",
          "circle-stroke-width": FIXED_REPAIR_POINT_STROKE_WIDTH_PX,
          "circle-pitch-alignment": "viewport",
          "circle-pitch-scale": "viewport",
        },
      });
      map.addLayer({
        id: "fixed-route-point-hitboxes",
        type: "circle",
        source: "fixed-route-points",
        paint: {
          "circle-color": FIXED_REPAIR_ROUTE_COLOR,
          "circle-radius": FIXED_REPAIR_POINT_HITBOX_RADIUS_PX,
          "circle-opacity": 0,
          "circle-pitch-alignment": "viewport",
          "circle-pitch-scale": "viewport",
        },
      });
      map.addLayer({
        id: "fixed-route-point-hover",
        type: "circle",
        source: "fixed-route-hover-point",
        paint: {
          "circle-color": FIXED_REPAIR_ROUTE_COLOR,
          "circle-radius": FIXED_REPAIR_POINT_HOVER_RADIUS_PX,
          "circle-opacity": 0.1,
          "circle-stroke-color": FIXED_REPAIR_ROUTE_COLOR,
          "circle-stroke-width": FIXED_REPAIR_POINT_HOVER_STROKE_WIDTH_PX,
          "circle-stroke-opacity": 0.88,
          "circle-pitch-alignment": "viewport",
          "circle-pitch-scale": "viewport",
        },
      });
      map.on("mousedown", "fixed-route-point-hitboxes", (event) => {
        if (!canDragFixedRepairPoint()) {
          return;
        }

        const draggedPoint = getDraggedFixedRepairPoint(event);
        if (!draggedPoint) {
          return;
        }

        event.preventDefault();
        draggedFixedRepairPointRef.current = draggedPoint;
        draggedFixedRepairLatestPointRef.current = null;
        draggedFixedRepairMovedRef.current = false;
        updateHoveredFixedRepairPoint(map, null);
        map.getCanvas().style.cursor = "grabbing";
        map.dragPan.disable();

        const handleMouseMove = (moveEvent: MapMouseEvent) => {
          const currentDraggedPoint = draggedFixedRepairPointRef.current;
          if (!currentDraggedPoint) {
            return;
          }

          const point = {
            lat: moveEvent.lngLat.lat,
            lon: moveEvent.lngLat.lng,
          };
          draggedFixedRepairMovedRef.current = true;
          draggedFixedRepairLatestPointRef.current = point;
          updateDraggedFixedRepairVisual(
            map,
            editRouteRef.current,
            currentDraggedPoint.recordId,
            point,
          );
        };

        const handleMouseUp = () => {
          const currentDraggedPoint = draggedFixedRepairPointRef.current;
          const point = draggedFixedRepairLatestPointRef.current;
          draggedFixedRepairPointRef.current = null;
          draggedFixedRepairLatestPointRef.current = null;
          updateHoveredFixedRepairPoint(map, null);
          map.getCanvas().style.cursor = "";
          map.dragPan.enable();
          map.off("mousemove", handleMouseMove);

          if (currentDraggedPoint && point) {
            skipNextMapFitRef.current = true;
            const preview = buildGpsEditRouteDragPreview(
              editRouteRef.current,
              currentDraggedPoint.recordId,
              point,
            );
            if (preview) {
              pendingDragRouteRef.current = {
                recordId: currentDraggedPoint.recordId,
                route: preview,
              };
              editRouteRef.current = preview;
              editableFixedRepairPointsRef.current = preview.points.map(
                (previewPoint) => ({
                  id: previewPoint.id,
                  recordId: previewPoint.recordId,
                  kind: previewPoint.kind,
                  point: previewPoint,
                }),
              );
              updateLineSource(map, "known-route", preview.segments);
              updatePointSource(
                map,
                "fixed-route-points",
                editableFixedRepairPointsRef.current,
              );
            }
            onMoveGpsRecordPointRef.current(currentDraggedPoint.recordId, point);
          } else {
            updateLineSource(map, "known-route", editRouteRef.current.segments);
            updatePointSource(
              map,
              "fixed-route-points",
              editableFixedRepairPointsRef.current,
            );
          }
        };

        map.on("mousemove", handleMouseMove);
        map.once("mouseup", handleMouseUp);
      });
      map.on("mouseenter", "fixed-route-point-hitboxes", (event) => {
        if (canDragFixedRepairPoint()) {
          updateHoveredFixedRepairPoint(
            map,
            resolveEditableFixedRepairPoint(getDraggedFixedRepairPoint(event)),
          );
          map.getCanvas().style.cursor = "move";
        }
      });
      map.on("mouseleave", "fixed-route-point-hitboxes", () => {
        if (!draggedFixedRepairPointRef.current) {
          updateHoveredFixedRepairPoint(map, null);
          map.getCanvas().style.cursor = "";
        }
      });
      map.on("mousemove", (event) => {
        if (draggedFixedRepairPointRef.current) {
          return;
        }

        if (!canDragFixedRepairPoint()) {
          updateHoveredFixedRepairPoint(map, null);
          if (map.getCanvas().style.cursor === "move") {
            map.getCanvas().style.cursor = "";
          }
          return;
        }

        const hoveredFixedPointFeature = map.queryRenderedFeatures(event.point, {
          layers: ["fixed-route-point-hitboxes"],
        })[0];
        const hoveredFixedPoint = hoveredFixedPointFeature
          ? resolveEditableFixedRepairPoint(
              getDraggedFixedRepairPointFromProperties(
                hoveredFixedPointFeature.properties,
              ),
            )
          : null;
        updateHoveredFixedRepairPoint(map, hoveredFixedPoint);
        map.getCanvas().style.cursor = hoveredFixedPoint ? "move" : "";
      });
      map.on("mouseenter", "known-route-points", () => {
        if (eraseModeRef.current) {
          map.getCanvas().style.cursor = "crosshair";
        }
      });
      map.on("mouseleave", "known-route-points", () => {
        if (eraseModeRef.current) {
          map.getCanvas().style.cursor = "";
        }
      });
      map.on("click", "known-route-points", (event) => {
        if (!eraseModeRef.current) {
          return;
        }

        const point = getSelectableGpsPointFromEvent(
          event,
          selectableGpsPointsRef.current,
        );
        if (!point) {
          return;
        }

        event.preventDefault();
        setEraseSelection((currentSelection) =>
          !currentSelection || currentSelection.end
            ? { start: point, end: null }
            : { start: currentSelection.start, end: point },
        );
      });
      map.on("click", "fixed-route-point-hitboxes", (event) => {
        if (eraseModeRef.current) {
          return;
        }

        if (anchorPlacementRunKeyRef.current) {
          return;
        }

        if (draggedFixedRepairMovedRef.current) {
          draggedFixedRepairMovedRef.current = false;
          return;
        }

        const point = getDraggedFixedRepairPoint(event);
        if (!point) {
          return;
        }

        const routePoint = editRouteRef.current.points.find(
          (currentPoint) => currentPoint.recordId === point.recordId,
        );
        if (!routePoint) {
          return;
        }

        new maplibregl.Popup({ closeButton: true, maxWidth: "360px" })
          .setLngLat(event.lngLat)
          .setDOMContent(buildEditRoutePointPopupContent(routePoint))
          .addTo(map);
      });
      map.on("click", (event) => {
        const placementRunKey = anchorPlacementRunKeyRef.current;
        if (!placementRunKey) {
          return;
        }

        const row = gapRowsRef.current.find(
          (currentRow) => currentRow.key === placementRunKey,
        );
        if (row?.kind !== "active" || !row.anchorPlacement) {
          return;
        }

        skipNextMapFitRef.current = true;
        onPlaceGpsRepairAnchorRef.current(row.runIndex, {
          lat: event.lngLat.lat,
          lon: event.lngLat.lng,
        });
        setAnchorPlacementRunKey(null);
      });
      fitMapToData(map, [
        ...editRouteRef.current.segments,
      ]);
    };
    map.on("load", setupMapLayers);
    if (map.isStyleLoaded()) {
      setupMapLayers();
    }
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

    updateKnownRoutePointSource(map, "known-route-points", selectableGpsPoints);
    if (!draggedFixedRepairPointRef.current) {
      updateLineSource(map, "known-route", displayedEditRoute.segments);
    }
    updateLineSource(map, "erase-selection", eraseRangeSegments);
    updatePointSource(map, "fixed-route-points", editableFixedRepairPoints);
    map.setPaintProperty(
      "known-route-points",
      "circle-opacity",
      0,
    );
    map.setPaintProperty(
      "known-route-points",
      "circle-stroke-opacity",
      0,
    );
    if (eraseMode || addGpsMode || anchorPlacementRunKey) {
      updateHoveredFixedRepairPoint(map, null);
    }
    if ((eraseMode || addGpsMode) && map.getCanvas().style.cursor === "move") {
      map.getCanvas().style.cursor = "";
    }
    raiseLayer(map, "erase-selection");
    raiseLayer(map, "fixed-route-point-halos");
    raiseLayer(map, "fixed-route-points");
    raiseLayer(map, "fixed-route-point-hitboxes");
    raiseLayer(map, "fixed-route-point-hover");
    if (skipNextMapFitRef.current) {
      skipNextMapFitRef.current = false;
    } else if (!draggedFixedRepairPointRef.current) {
      fitMapToData(
        map,
        eraseRangeSegments.length > 0
          ? eraseRangeSegments
          : displayedEditRoute.segments,
      );
    }
  }, [
    editableFixedRepairPoints,
    addGpsMode,
    eraseMode,
    eraseRangeSegments,
    anchorPlacementRunKey,
    displayedEditRoute,
    selectableGpsPoints,
  ]);

  useEffect(() => {
    if (
      anchorPlacementRunKey &&
      !gapRows.some(
        (row) =>
          row.kind === "active" &&
          row.key === anchorPlacementRunKey &&
          row.anchorPlacement,
      )
    ) {
      setAnchorPlacementRunKey(null);
    }
  }, [anchorPlacementRunKey, gapRows]);

  useEffect(() => {
    if (
      eraseSelection &&
      !selectableGpsPoints.some(
        (point) => point.point.recordId === eraseSelection.start.point.recordId,
      )
    ) {
      setEraseSelection(null);
    }
  }, [eraseSelection, selectableGpsPoints]);

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

  const renderRepairSpans = false;
  const eraseSelectionLabel = eraseSelection
    ? formatEraseSelectionLabel(eraseSelection.start, eraseSelection.end)
    : "Select two route points";
  const addGpsLabel = "Drag GPS points to edit the route";
  const anchorPlacementRow =
    anchorPlacementRunKey === null
      ? null
      : gapRows.find((row) => row.key === anchorPlacementRunKey) ?? null;
  const anchorPlacementLabel =
    anchorPlacementRow?.kind === "active" && anchorPlacementRow.anchorPlacement
      ? `Click map to place ${anchorPlacementRow.anchorPlacement}`
      : null;
  return (
    <section className={panel} aria-label="GPS repair workspace">
      <div className={panelHeader}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className={`${iconOnlyButton} ${panelHeaderSettings}`}
            aria-label="Map page settings"
          >
            <Settings size={18} aria-hidden="true" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={8}
              align="end"
              className={settingsMenuContent}
            >
              <DropdownMenu.CheckboxItem
                className={settingsMenuItem}
                checked={showAllMessageFields}
                onCheckedChange={(checked) => {
                  setShowAllMessageFields(checked === true);
                }}
              >
                <span className={settingsMenuIndicator}>
                  <DropdownMenu.ItemIndicator>
                    <Check size={14} aria-hidden="true" />
                  </DropdownMenu.ItemIndicator>
                </span>
                Show all present fields
              </DropdownMenu.CheckboxItem>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <div className={workspace}>
        <div className={mapColumn}>
          <div className={mapShell}>
            <div ref={mapContainerRef} className={mapCanvas} aria-label="GPS repair map" />
            <div className={mapToolBar}>
              <div className={mapToolGroup}>
                <button
                  className={[
                    mapToolButton,
                    addGpsMode ? mapToolButtonActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  aria-pressed={addGpsMode}
                  onClick={() => {
                    skipNextMapFitRef.current = true;
                    setAddGpsMode((current) => !current);
                    setEraseMode(false);
                    setEraseSelection(null);
                    setAnchorPlacementRunKey(null);
                  }}
                >
                  <MapPinPlus size={16} aria-hidden="true" />
                  {addGpsMode ? "View GPS" : "Edit GPS"}
                </button>
              </div>
              {eraseMode ? (
                <div className={eraseSelectionPanel}>
                  <span className={eraseSelectionText}>
                    {eraseSelectionLabel}
                  </span>
                  <span className={eraseSelectionActions}>
                    <button
                      className={mapToolButton}
                      type="button"
                      disabled={!eraseRange}
                      onClick={() => {
                        if (!eraseRange) {
                          return;
                        }

                        skipNextMapFitRef.current = true;
                        onEraseGpsRange(
                          eraseRange.start.point.recordId,
                          eraseRange.end.point.recordId,
                        );
                        setEraseSelection(null);
                      }}
                    >
                      Erase
                    </button>
                    <button
                      className={mapToolButton}
                      type="button"
                      onClick={() => {
                        skipNextMapFitRef.current = true;
                        setEraseSelection(null);
                      }}
                    >
                      Clear
                    </button>
                  </span>
                </div>
              ) : null}
              {addGpsMode ? (
                <div className={eraseSelectionPanel}>
                  <span className={eraseSelectionText}>
                    {addGpsLabel}
                  </span>
                  <span className={eraseSelectionActions}>
                    <button
                      className={mapToolButton}
                      type="button"
                      onClick={() => {
                        skipNextMapFitRef.current = true;
                        setAddGpsMode(false);
                      }}
                    >
                      Done
                    </button>
                  </span>
                </div>
              ) : null}
              {!eraseMode && anchorPlacementLabel ? (
                <div className={eraseSelectionPanel}>
                  <span className={eraseSelectionText}>
                    {anchorPlacementLabel}
                  </span>
                  <span className={eraseSelectionActions}>
                    <button
                      className={mapToolButton}
                      type="button"
                      onClick={() => setAnchorPlacementRunKey(null)}
                    >
                      Cancel
                    </button>
                  </span>
                </div>
              ) : null}
            </div>
            <ul className={mapLegend} aria-label="Map legend">
              <li className={mapLegendItem}>
                <span
                  className={`${mapLegendMarker} ${mapLegendMarkerKnown}`}
                  aria-hidden="true"
                />
                <span className={mapLegendLabel}>GPS route</span>
              </li>
            </ul>
          </div>
          {messagesOpen ? (
            <FitMessageGroupsPanel
              activitySummary={summary}
              sessionDataSummary={sessionDataSummary}
              lapSummaries={lapSummaries}
              messageGroups={messageGroups}
              showAllMessageFields={showAllMessageFields}
              getMessageSummary={getMessageSummary}
            />
          ) : (
            <section className={dataSection} aria-label="FIT messages">
              <div className={dataPanelHeader}>
                <div className={dataPanelHeaderText}>
                  <h3 className={sectionTitle}>Messages</h3>
                </div>
                <button
                  className={dataActionButton}
                  type="button"
                  onClick={() => setMessagesOpen(true)}
                >
                  Show messages
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
      {renderRepairSpans ? (
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
                          <li key={makeGpsRepairRunKey(run)}>
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
                                  {isSelected ? (
                                    <span className={metricPill}>selected</span>
                                  ) : null}
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
                    <div className={emptyState}>
                      No bounded missing GPS spans were found.
                    </div>
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
                                          formatDebugTimestamp(missingRecord.timestampSeconds)}
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
      ) : null}
    </section>
  );
}

function formatSummaryValue(value: string | null): string {
  return value ?? "Unavailable";
}

function buildPrimarySessionMetrics(
  summary: FitActivitySummary,
  sessionDataSummary: FitSessionDataSummary | null,
): SessionMetric[] {
  const start = findValidSessionField(sessionDataSummary, ["start_time"]);
  const timer = findValidSessionField(sessionDataSummary, ["total_timer_time"]);
  const distance = findValidSessionField(sessionDataSummary, ["total_distance"]);
  const metrics: SessionMetric[] = [
    {
      key: "start",
      label: "Started",
      value: start?.value ?? formatSummaryValue(summary.startTime),
      fieldIds: getSessionFieldIds(sessionDataSummary, ["start_time"]),
    },
    {
      key: "timer",
      label: "Timer",
      value: timer?.value ?? formatSummaryValue(summary.duration),
      fieldIds: getSessionFieldIds(sessionDataSummary, ["total_timer_time"]),
    },
    {
      key: "distance",
      label: "Distance",
      value: distance?.value ?? formatSummaryValue(summary.distance),
      fieldIds: getSessionFieldIds(sessionDataSummary, ["total_distance"]),
    },
  ];

  const elapsed = findValidSessionField(sessionDataSummary, ["total_elapsed_time"]);
  if (elapsed && elapsed.value !== timer?.value) {
    metrics.push({
      key: "elapsed",
      label: "Elapsed",
      value: elapsed.value,
      fieldIds: getSessionFieldIds(sessionDataSummary, ["total_elapsed_time"]),
    });
  }

  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "calories",
    label: "Calories",
    names: ["total_calories"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "avg-speed",
    label: "Avg speed",
    names: ["enhanced_avg_speed", "avg_speed"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "max-speed",
    label: "Max speed",
    names: ["enhanced_max_speed", "max_speed"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "ascent",
    label: "Ascent",
    names: ["total_ascent"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "descent",
    label: "Descent",
    names: ["total_descent"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "avg-heart-rate",
    label: "Avg HR",
    names: ["avg_heart_rate"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "max-heart-rate",
    label: "Max HR",
    names: ["max_heart_rate"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "avg-power",
    label: "Avg power",
    names: ["avg_power"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "max-power",
    label: "Max power",
    names: ["max_power"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "avg-cadence",
    label: "Avg cadence",
    names: ["avg_cadence"],
  });
  addSessionFieldMetric(metrics, sessionDataSummary, {
    key: "max-cadence",
    label: "Max cadence",
    names: ["max_cadence"],
  });

  return metrics;
}

function addSessionFieldMetric(
  metrics: SessionMetric[],
  sessionDataSummary: FitSessionDataSummary | null,
  options: {
    readonly key: string;
    readonly label: string;
    readonly names: readonly string[];
  },
): void {
  const field = findValidSessionField(sessionDataSummary, options.names);
  if (!field) {
    return;
  }

  metrics.push({
    key: options.key,
    label: options.label,
    value: field.value,
    fieldIds: getSessionFieldIds(sessionDataSummary, options.names),
  });
}

function buildPrimaryLapMetrics(lap: FitLapDataSummary): SessionMetric[] {
  const start = findValidLapField(lap, ["start_time"]);
  const timer = findValidLapField(lap, ["total_timer_time"]);
  const distance = findValidLapField(lap, ["total_distance"]);
  const metrics: SessionMetric[] = [];

  if (start) {
    metrics.push({
      key: "start",
      label: "Started",
      value: start.value,
      fieldIds: getLapFieldIds(lap, ["start_time"]),
    });
  }

  if (timer) {
    metrics.push({
      key: "timer",
      label: "Timer",
      value: timer.value,
      fieldIds: getLapFieldIds(lap, ["total_timer_time"]),
    });
  }

  if (distance) {
    metrics.push({
      key: "distance",
      label: "Distance",
      value: distance.value,
      fieldIds: getLapFieldIds(lap, ["total_distance"]),
    });
  }

  const elapsed = findValidLapField(lap, ["total_elapsed_time"]);
  if (elapsed && elapsed.value !== timer?.value) {
    metrics.push({
      key: "elapsed",
      label: "Elapsed",
      value: elapsed.value,
      fieldIds: getLapFieldIds(lap, ["total_elapsed_time"]),
    });
  }

  addLapFieldMetric(metrics, lap, {
    key: "calories",
    label: "Calories",
    names: ["total_calories"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "avg-speed",
    label: "Avg speed",
    names: ["enhanced_avg_speed", "avg_speed"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "max-speed",
    label: "Max speed",
    names: ["enhanced_max_speed", "max_speed"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "ascent",
    label: "Ascent",
    names: ["total_ascent"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "descent",
    label: "Descent",
    names: ["total_descent"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "avg-heart-rate",
    label: "Avg HR",
    names: ["avg_heart_rate"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "max-heart-rate",
    label: "Max HR",
    names: ["max_heart_rate"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "avg-power",
    label: "Avg power",
    names: ["avg_power"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "max-power",
    label: "Max power",
    names: ["max_power"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "avg-cadence",
    label: "Avg cadence",
    names: ["avg_cadence"],
  });
  addLapFieldMetric(metrics, lap, {
    key: "max-cadence",
    label: "Max cadence",
    names: ["max_cadence"],
  });

  return metrics;
}

function addLapFieldMetric(
  metrics: SessionMetric[],
  lap: FitLapDataSummary,
  options: {
    readonly key: string;
    readonly label: string;
    readonly names: readonly string[];
  },
): void {
  const field = findValidLapField(lap, options.names);
  if (!field) {
    return;
  }

  metrics.push({
    key: options.key,
    label: options.label,
    value: field.value,
    fieldIds: getLapFieldIds(lap, options.names),
  });
}

function buildPrimaryMessageMetrics(
  message: FitMessageDataSummary,
): SessionMetric[] {
  const validFields = message.fields.filter((field) => field.valid);
  const primaryFields = validFields.length > 0
    ? validFields
    : message.fields;

  return primaryFields.slice(0, 8).map((field) => ({
    key: field.fieldId,
    label: titleCase(field.name),
    value: field.value,
    fieldIds: [field.fieldId],
  }));
}

function findValidLapField(
  lap: FitLapDataSummary,
  fieldNames: readonly string[],
): LapField | null {
  return (
    lap.fields.find(
      (field) => field.valid && fieldNames.includes(field.name),
    ) ?? null
  );
}

function getLapFieldIds(
  lap: FitLapDataSummary,
  fieldNames: readonly string[],
): string[] {
  return lap.fields
    .filter((field) => fieldNames.includes(field.name))
    .map((field) => field.fieldId);
}

function findValidSessionField(
  sessionDataSummary: FitSessionDataSummary | null,
  fieldNames: readonly string[],
): SessionField | null {
  return (
    sessionDataSummary?.fields.find(
      (field) => field.valid && fieldNames.includes(field.name),
    ) ?? null
  );
}

function getSessionFieldIds(
  sessionDataSummary: FitSessionDataSummary | null,
  fieldNames: readonly string[],
): string[] {
  return (
    sessionDataSummary?.fields
      .filter((field) => fieldNames.includes(field.name))
      .map((field) => field.fieldId) ?? []
  );
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

function buildPointCollection(points: readonly EditableFixedRepairPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map(({ id, recordId, kind, point }) => ({
      type: "Feature" as const,
      properties: {
        id,
        recordId,
        kind,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [point.lon, point.lat],
      },
    })),
  };
}

function buildSelectableGpsPoints(
  routePoints: readonly FitGpsEditRoutePoint[],
): SelectableGpsPoint[] {
  return routePoints.map((point, index) => ({
    point,
    segmentIndex: 0,
    pointIndex: index,
    flatIndex: index,
  }));
}

function buildKnownRoutePointCollection(points: readonly SelectableGpsPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      properties: {
        recordId: point.point.recordId,
        flatIndex: point.flatIndex,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [point.point.lon, point.point.lat],
      },
    })),
  };
}

function buildEraseRange(
  points: readonly SelectableGpsPoint[],
  start: SelectableGpsPoint,
  end: SelectableGpsPoint,
): {
  readonly start: SelectableGpsPoint;
  readonly end: SelectableGpsPoint;
  readonly points: readonly SelectableGpsPoint[];
} | null {
  if (start.segmentIndex !== end.segmentIndex) {
    return null;
  }

  const startIndex = Math.min(start.flatIndex, end.flatIndex);
  const endIndex = Math.max(start.flatIndex, end.flatIndex);
  const rangePoints = points.filter(
    (point) =>
      point.segmentIndex === start.segmentIndex &&
      point.flatIndex >= startIndex &&
      point.flatIndex <= endIndex,
  );
  if (rangePoints.length === 0) {
    return null;
  }

  return start.flatIndex <= end.flatIndex
    ? { start, end, points: rangePoints }
    : { start: end, end: start, points: rangePoints };
}

function updateLineSource(
  map: MapLibreMap,
  sourceId: string,
  segments: readonly (readonly FitRoutePoint[])[],
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(buildLineCollection(segments));
}

function updateKnownRoutePointSource(
  map: MapLibreMap,
  sourceId: string,
  points: readonly SelectableGpsPoint[],
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(buildKnownRoutePointCollection(points));
}

function updatePointSource(
  map: MapLibreMap,
  sourceId: string,
  points: readonly EditableFixedRepairPoint[],
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(buildPointCollection(points));
}

function updateHoveredFixedRepairPoint(
  map: MapLibreMap,
  point: EditableFixedRepairPoint | null,
) {
  updatePointSource(map, "fixed-route-hover-point", point ? [point] : []);
}

function getSelectableGpsPointFromEvent(
  event: MapLayerMouseEvent,
  points: readonly SelectableGpsPoint[],
): SelectableGpsPoint | null {
  const properties = event.features?.[0]?.properties;
  if (!properties) {
    return null;
  }

  const recordId =
    typeof properties.recordId === "string" ? properties.recordId : null;
  const flatIndex =
    typeof properties.flatIndex === "number"
      ? properties.flatIndex
      : Number(properties.flatIndex);
  if (!recordId || !Number.isInteger(flatIndex)) {
    return null;
  }

  return (
    points.find(
      (point) =>
        point.flatIndex === flatIndex && point.point.recordId === recordId,
    ) ?? null
  );
}

function updateDraggedFixedRepairVisual(
  map: MapLibreMap,
  editRoute: FitGpsEditRoute,
  recordId: string,
  point: FitRoutePoint,
) {
  const preview = buildGpsEditRouteDragPreview(editRoute, recordId, point);
  if (!preview) {
    return;
  }

  updateLineSource(map, "known-route", preview.segments);
  updatePointSource(
    map,
    "fixed-route-points",
    preview.points.map((previewPoint) => ({
      id: previewPoint.id,
      recordId: previewPoint.recordId,
      kind: previewPoint.kind,
      point: previewPoint,
    })),
  );
}

function doesEditRouteReflectPendingDrag(
  route: FitGpsEditRoute,
  recordId: string,
  pendingRoute: FitGpsEditRoute,
): boolean {
  const pendingPoint = pendingRoute.points.find(
    (point) => point.recordId === recordId,
  );
  const committedPoint = route.points.find((point) => point.recordId === recordId);
  if (!pendingPoint || !committedPoint) {
    return false;
  }

  return (
    Math.abs(committedPoint.lat - pendingPoint.lat) < 0.000001 &&
    Math.abs(committedPoint.lon - pendingPoint.lon) < 0.000001
  );
}

function getDraggedFixedRepairPoint(
  event: MapLayerMouseEvent,
): DraggedFixedRepairPoint | null {
  return getDraggedFixedRepairPointFromProperties(
    event.features?.[0]?.properties,
  );
}

function getDraggedFixedRepairPointFromProperties(
  properties: unknown,
): DraggedFixedRepairPoint | null {
  if (!properties) {
    return null;
  }

  const typedProperties = properties as Record<string, unknown>;
  const recordId =
    typeof typedProperties.recordId === "string"
      ? typedProperties.recordId
      : null;

  if (!recordId) {
    return null;
  }

  return { recordId };
}

function buildEditRoutePointPopupContent(
  point: FitGpsEditRoutePoint,
): HTMLElement {
  const root = document.createElement("div");
  root.style.display = "grid";
  root.style.gap = "8px";
  root.style.color = "#1d1b20";
  root.style.fontSize = "12px";
  root.style.lineHeight = "1.35";

  const title = document.createElement("div");
  title.textContent = point.kind === "gap" ? "Gap point" : "GPS point";
  title.style.fontWeight = "700";
  title.style.fontSize = "13px";
  root.append(title);

  const meta = document.createElement("dl");
  meta.style.display = "grid";
  meta.style.gridTemplateColumns = "auto minmax(0, 1fr)";
  meta.style.gap = "4px 10px";
  meta.style.margin = "0";
  appendDebugRow(meta, "record", `${point.recordId} / order ${point.recordOrder}`);
  appendDebugRow(meta, "type", point.kind);
  appendDebugRow(meta, "lat", point.lat.toFixed(7));
  appendDebugRow(meta, "lon", point.lon.toFixed(7));
  root.append(meta);
  return root;
}

function appendDebugRow(list: HTMLDListElement, label: string, value: string) {
  const term = document.createElement("dt");
  term.textContent = label;
  term.style.color = "#79747e";
  term.style.fontWeight = "650";
  term.style.margin = "0";

  const description = document.createElement("dd");
  description.textContent = value;
  description.style.margin = "0";
  description.style.minWidth = "0";
  description.style.overflowWrap = "anywhere";

  list.append(term, description);
}

function formatDebugTimestamp(timestampSeconds: number | null): string {
  if (timestampSeconds === null) {
    return "-";
  }

  const date = new Date((timestampSeconds + 631065600) * 1000);
  return `${date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })} (${timestampSeconds}s)`;
}

function raiseLayer(map: MapLibreMap, layerId: string) {
  if (map.getLayer(layerId)) {
    map.moveLayer(layerId);
  }
}

function fitMapToData(
  map: MapLibreMap,
  segments: readonly (readonly FitRoutePoint[])[],
) {
  const points = segments.flat();
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

function formatRunLabel(run: FitGpsRepairRun): string {
  const beforeLabel =
    run.before
      ? getFitMessageTimestampLabel(run.before.record) ??
        `${run.before.timestampSeconds}s`
      : "Open start";
  const afterLabel =
    run.after
      ? getFitMessageTimestampLabel(run.after.record) ??
        `${run.after.timestampSeconds}s`
      : "Open end";
  return `${beforeLabel} to ${afterLabel}`;
}

function buildGapRows(
  runs: readonly FitGpsRepairRun[],
  fixedRepairs: readonly FitGpsFixedRepair[],
): GapRow[] {
  const fixedKeys = new Set(fixedRepairs.map((repair) => repair.key));
  const activeRows: GapRow[] = runs.flatMap((run, runIndex) => {
    const key = makeGpsRepairRunKey(run);
    if (fixedKeys.has(key)) {
      return [];
    }

    return [
      {
        kind: "active" as const,
        key,
        runIndex,
        canFix: Boolean(run.before && run.after),
        anchorPlacement: resolveAnchorPlacement(run),
        sortTimestampSeconds: resolveGapSortTimestamp(run),
        timeRange: formatGapTimeRange(run),
        distanceMeters: calculateGpsRepairRunDistanceMeters(run),
        distanceLabel: "Estimated",
        focusSegments:
          run.before && run.after
            ? [
                [
                  {
                    lat: run.before.latitudeDegrees,
                    lon: run.before.longitudeDegrees,
                  },
                  {
                    lat: run.after.latitudeDegrees,
                    lon: run.after.longitudeDegrees,
                  },
                ],
              ]
            : [],
      },
    ];
  });
  const fixedRows: GapRow[] = fixedRepairs.map((repair) => ({
    kind: "fixed",
    key: repair.key,
    sortTimestampSeconds: repair.beforeTimestampSeconds,
    timeRange: formatElapsedRange(
      repair.beforeTimerTimeSeconds,
      repair.afterTimerTimeSeconds,
    ),
    distanceMeters: repair.fixedDistanceMeters,
    distanceLabel: "Actual",
    focusSegments: [repair.routePoints],
  }));

  return [...activeRows, ...fixedRows].sort(
    (left, right) => left.sortTimestampSeconds - right.sortTimestampSeconds,
  );
}

function resolveAnchorPlacement(
  run: FitGpsRepairRun,
): "start" | "end" | null {
  if (run.before && !run.after) {
    return "end";
  }

  if (!run.before && run.after) {
    return "start";
  }

  return null;
}

function formatEraseSelectionLabel(
  start: SelectableGpsPoint,
  end: SelectableGpsPoint | null,
): string {
  if (!end) {
    return `${formatRoutePointTime(start.point)} selected`;
  }

  if (start.segmentIndex !== end.segmentIndex) {
    return "Select points on the same route segment";
  }

  const first = start.flatIndex <= end.flatIndex ? start : end;
  const last = start.flatIndex <= end.flatIndex ? end : start;
  const count = Math.abs(end.flatIndex - start.flatIndex) + 1;
  return `${formatRoutePointTime(first.point)}-${formatRoutePointTime(last.point)} ${count} records`;
}

function formatRoutePointTime(point: FitGpsEditRoutePoint): string {
  return `Record ${point.recordOrder + 1}`;
}

function resolveGapSortTimestamp(run: FitGpsRepairRun): number {
  return (
    run.missingRecords.find(
      (missingRecord) => missingRecord.timestampSeconds !== null,
    )?.timestampSeconds ??
    run.before?.timestampSeconds ??
    run.after?.timestampSeconds ??
    Number.MAX_SAFE_INTEGER
  );
}

function formatGapTimeRange(run: FitGpsRepairRun): string {
  const firstRecord = run.missingRecords[0] ?? null;
  const lastRecord = run.missingRecords.at(-1) ?? null;
  const firstTimer = firstRecord?.timerTimeSeconds ?? null;
  const lastTimer = lastRecord?.timerTimeSeconds ?? null;
  if (firstTimer !== null || lastTimer !== null) {
    return formatElapsedRange(firstTimer, lastTimer);
  }

  return formatNullableTimestampRange(
    firstRecord?.timestampSeconds ?? null,
    lastRecord?.timestampSeconds ?? null,
  );
}

function formatElapsedRange(
  startSeconds: number | null,
  endSeconds: number | null,
): string {
  if (
    startSeconds === null ||
    endSeconds === null ||
    !Number.isFinite(startSeconds) ||
    !Number.isFinite(endSeconds)
  ) {
    return "-";
  }

  return `${formatElapsedSeconds(startSeconds)}-${formatElapsedSeconds(endSeconds)}`;
}

function formatNullableTimestampRange(
  startSeconds: number | null,
  endSeconds: number | null,
): string {
  if (startSeconds === null || endSeconds === null) {
    return "-";
  }

  if (startSeconds === endSeconds) {
    return formatDebugTimestamp(startSeconds);
  }

  return `${formatDebugTimestamp(startSeconds)} - ${formatDebugTimestamp(endSeconds)}`;
}

function formatElapsedSeconds(rawSeconds: number): string {
  const sign = rawSeconds < 0 ? "-" : "";
  const seconds = Math.abs(Math.round(rawSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${sign}${hours}:${padTimePart(minutes)}:${padTimePart(remainingSeconds)}`;
  }

  return `${sign}${padTimePart(minutes)}:${padTimePart(remainingSeconds)}`;
}

function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}
