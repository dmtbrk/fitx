import { MapPinned, Plus, SquareCheck, Trash2, X } from "lucide-react";
import type { FitFilterOption, FitMessageFilter } from "../editor";
import { FilterBar } from "./FilterBar";
import {
  dangerButton,
  messageToolbar,
  messageToolbarFilters,
  messageToolbarRow,
  messageToolbarSelectionCount,
  messageToolbarSurface,
  secondaryButton,
} from "../styles/app.css";

interface MessageToolbarProps {
  readonly addMessageMode: boolean;
  readonly selectionMode: boolean;
  readonly selectedMessageCount: number;
  readonly selectionDisabled: boolean;
  readonly activeFilter: FitMessageFilter;
  readonly filterOptions: readonly FitFilterOption[];
  readonly selectButtonRef?: (element: HTMLButtonElement | null) => void;
  readonly onAddMessage: () => void;
  readonly onStartSelection: () => void;
  readonly onOpenGpsRepair: () => void;
  readonly onDeleteSelected: () => void;
  readonly onClearSelection: () => void;
  readonly onFilterChange: (filter: FitMessageFilter) => void;
}

export function MessageToolbar({
  addMessageMode,
  selectionMode,
  selectedMessageCount,
  selectionDisabled,
  activeFilter,
  filterOptions,
  selectButtonRef,
  onAddMessage,
  onStartSelection,
  onOpenGpsRepair,
  onDeleteSelected,
  onClearSelection,
  onFilterChange,
}: MessageToolbarProps) {
  return (
    <div className={messageToolbar}>
      <div className={messageToolbarSurface}>
        <div className={messageToolbarRow}>
          {selectionMode ? (
            <>
              <span className={messageToolbarSelectionCount}>
                {selectedMessageCount} selected
              </span>
              <button
                className={dangerButton}
                type="button"
                onClick={onDeleteSelected}
                disabled={selectedMessageCount === 0}
              >
                <Trash2 size={17} aria-hidden="true" />
                <span>Delete selected</span>
              </button>
              <button className={secondaryButton} type="button" onClick={onClearSelection}>
                <X size={17} aria-hidden="true" />
                <span>Clear selection</span>
              </button>
            </>
          ) : (
            <>
              <button className={secondaryButton} type="button" onClick={onAddMessage}>
                {addMessageMode ? (
                  <X size={17} aria-hidden="true" />
                ) : (
                  <Plus size={17} aria-hidden="true" />
                )}
                <span>{addMessageMode ? "Cancel add message" : "Add message"}</span>
              </button>
              <button
                className={secondaryButton}
                type="button"
                ref={selectButtonRef}
                onClick={onStartSelection}
                disabled={selectionDisabled}
              >
                <SquareCheck size={17} aria-hidden="true" />
                <span>Select</span>
              </button>
              <button
                className={secondaryButton}
                type="button"
                onClick={onOpenGpsRepair}
              >
                <MapPinned size={17} aria-hidden="true" />
                <span>Map repair</span>
              </button>
            </>
          )}
        </div>
        <div className={messageToolbarFilters}>
          <FilterBar
            options={filterOptions}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            disabled={addMessageMode || selectionMode}
          />
        </div>
      </div>
    </div>
  );
}
