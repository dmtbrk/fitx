import {
  type ChangeEvent,
  type DragEvent,
  Suspense,
  lazy,
  useRef,
  useState,
} from "react";
import { IssuesDialog } from "../components/IssuesDialog";
import { StatusPanel } from "../components/StatusPanel";
import { TopBar } from "../components/TopBar";
import { useFitEditorSession } from "../editor";
import { app, content, hiddenFileInput } from "../styles/app.css";

const GpsRepairPanel = lazy(async () => {
  const module = await import("../components/GpsRepairPanel");
  return { default: module.GpsRepairPanel };
});

function App() {
  const session = useFitEditorSession();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadButtonRef = useRef<HTMLButtonElement | null>(null);

  const loaded = session.state.status === "loaded" ? session.state : null;

  function openUpload() {
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
        onUpload={openUpload}
        onDownload={session.download}
        onOpenIssues={session.openIssues}
        uploadButtonRef={uploadButtonRef}
      />
      <main className={content}>
        {loaded && session.view ? (
          <>
            <Suspense fallback={null}>
              <GpsRepairPanel
                open
                runs={session.gpsRepairRuns}
                routeSegments={session.gpsRouteSegments}
                selectedRunIndex={session.selectedGpsRepairRunIndex ?? 0}
                previewRoute={session.gpsRepairPreviewRoute?.points ?? null}
                status={session.gpsRepairStatus}
                errorMessage={session.gpsRepairErrorMessage}
                onClose={session.closeGpsRepair}
                onSelectRun={session.selectGpsRepairRun}
                onRequestPreview={() => {
                  void session.requestGpsRepairPreview();
                }}
                onCancelPreview={session.cancelGpsRepairPreview}
                onApplyPreview={session.applyGpsRepairPreview}
              />
            </Suspense>
          </>
        ) : (
          <StatusPanel
            state={session.state}
            dragging={isDragging}
            onUpload={openUpload}
          />
        )}
      </main>
      <IssuesDialog
        open={session.issuesOpen}
        issues={session.issues}
        showDownloadAction={session.showDownloadAction}
        onClose={session.closeIssues}
        onDownloadAnyway={session.downloadAnyway}
      />
    </div>
  );
}

export default App;
