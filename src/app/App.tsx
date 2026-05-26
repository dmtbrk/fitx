import {
  type ChangeEvent,
  type DragEvent,
  Suspense,
  lazy,
  useMemo,
  useRef,
  useState,
} from "react";
import { IssuesDialog } from "../components/IssuesDialog";
import { StatusPanel } from "../components/StatusPanel";
import { TopBar } from "../components/TopBar";
import {
  buildFitActivitySummary,
  buildFitLapDataSummaries,
  buildFitSessionDataSummary,
  useFitEditorSession,
} from "../editor";
import { app, content, hiddenFileInput } from "../styles/app.css";

const GpsRepairPanel = lazy(async () => {
  const module = await import("../components/GpsRepairPanel");
  return { default: module.GpsRepairPanel };
});

const requestTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function App() {
  const session = useFitEditorSession();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);

  const loaded = session.state.status === "loaded" ? session.state : null;
  const activitySummary = useMemo(
    () =>
      session.effectiveDocument
        ? buildFitActivitySummary(session.effectiveDocument, {
            timeZone: requestTimeZone,
          })
        : null,
    [session.effectiveDocument],
  );
  const lapSummaries = useMemo(
    () =>
      loaded?.document
        ? buildFitLapDataSummaries(loaded.document, {
            timeZone: requestTimeZone,
          })
        : [],
    [loaded?.document],
  );
  const sessionDataSummary = useMemo(
    () =>
      session.effectiveDocument
        ? buildFitSessionDataSummary(session.effectiveDocument, {
            timeZone: requestTimeZone,
          })
        : null,
    [session.effectiveDocument],
  );
  function openFile() {
    inputRef.current?.click();
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void session.loadFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    void session.loadFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      className={app}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setIsDragging(false);
        }
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        className={hiddenFileInput}
        type="file"
        accept=".fit,.FIT,application/octet-stream"
        onChange={onInputChange}
      />
      <TopBar
        fileName={loaded?.fileName}
        messageCount={session.view?.counts.messages ?? 0}
        loaded={Boolean(loaded)}
        issueCount={session.issueCount}
        editCount={session.editCount}
        onOpenFile={openFile}
        onSave={session.download}
        onOpenIssues={session.openIssues}
        openButtonRef={openButtonRef}
      />
      <main className={content}>
        {loaded && session.view && activitySummary && session.gpsMapView ? (
          <>
            <Suspense fallback={null}>
              <GpsRepairPanel
                open
                activitySummary={activitySummary}
                sessionDataSummary={sessionDataSummary}
                lapSummaries={lapSummaries}
                messageDocument={session.effectiveDocument}
                timeZone={requestTimeZone}
                runs={session.gpsRepairRuns}
                fixedRepairs={session.gpsFixedRepairs}
                gpsMapView={session.gpsMapView}
                selectedRunIndex={session.selectedGpsRepairRunIndex ?? 0}
                onClose={session.closeGpsRepair}
                onSelectRun={session.selectGpsRepairRun}
                onMoveGpsRecordPoint={session.moveGpsRecordPoint}
                onEraseGpsRange={session.eraseGpsRange}
                onPlaceGpsRepairAnchor={session.placeGpsRepairAnchor}
              />
            </Suspense>
          </>
        ) : (
          <StatusPanel
            state={session.state}
            dragging={isDragging}
            onOpenFile={openFile}
          />
        )}
      </main>
      <IssuesDialog
        open={session.issuesOpen}
        issues={session.issues}
        showSaveAction={session.showDownloadAction}
        onClose={session.closeIssues}
        onSaveAnyway={session.downloadAnyway}
      />
    </div>
  );
}

export default App;
