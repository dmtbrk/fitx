import { useLayoutEffect, useId, useRef, useState } from "react";
import { Filter, Plus, X } from "lucide-react";
import type { FitFilterOption, FitMessageFilter } from "../editor";
import { FilterBar } from "./FilterBar";
import {
  messageToolbar,
  messageToolbarActions,
  messageToolbarDisclosure,
  messageToolbarDisclosureActive,
  messageToolbarDisclosureIcon,
  messageToolbarFilters,
  messageToolbarRow,
  messageToolbarSummary,
  messageToolbarSurface,
  secondaryButton,
} from "../styles/app.css";

interface MessageToolbarProps {
  readonly addMessageMode: boolean;
  readonly activeFilter: FitMessageFilter;
  readonly filterOptions: readonly FitFilterOption[];
  readonly onAddMessage: () => void;
  readonly onFilterChange: (filter: FitMessageFilter) => void;
}

export function MessageToolbar({
  addMessageMode,
  activeFilter,
  filterOptions,
  onAddMessage,
  onFilterChange,
}: MessageToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const filtersDisclosureRef = useRef<HTMLButtonElement>(null);
  const restoreDisclosureFocusRef = useRef(false);
  const activeFilterSummary = filtersOpen
    ? null
    : getActiveFilterSummary(filterOptions, activeFilter);

  useLayoutEffect(() => {
    if (!filtersOpen || !restoreDisclosureFocusRef.current) {
      return;
    }

    restoreDisclosureFocusRef.current = false;
    filtersDisclosureRef.current?.focus();
  }, [filtersOpen]);

  return (
    <div className={messageToolbar}>
      <div className={messageToolbarSurface}>
        <div className={messageToolbarRow}>
          <button className={secondaryButton} type="button" onClick={onAddMessage}>
            {addMessageMode ? (
              <X size={17} aria-hidden="true" />
            ) : (
              <Plus size={17} aria-hidden="true" />
            )}
            <span>{addMessageMode ? "Cancel add message" : "Add message"}</span>
          </button>

          <div className={messageToolbarActions}>
            {activeFilterSummary ? (
              <button
                className={messageToolbarSummary}
                type="button"
                onClick={() => {
                  restoreDisclosureFocusRef.current = true;
                  setFiltersOpen(true);
                }}
              >
                {activeFilterSummary}
              </button>
            ) : null}
            <button
              ref={filtersDisclosureRef}
              className={[
                secondaryButton,
                messageToolbarDisclosure,
                !filtersOpen && activeFilter !== "all"
                  ? messageToolbarDisclosureActive
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              data-active={!filtersOpen && activeFilter !== "all" ? "true" : undefined}
              onClick={() => setFiltersOpen((current) => !current)}
            >
              <Filter className={messageToolbarDisclosureIcon} size={16} aria-hidden="true" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {filtersOpen ? (
          <div id={filtersId} className={messageToolbarFilters}>
            <FilterBar
              options={filterOptions}
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
              disabled={addMessageMode}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getActiveFilterSummary(
  filterOptions: readonly FitFilterOption[],
  activeFilter: FitMessageFilter,
): string | null {
  if (activeFilter === "all") {
    return null;
  }

  const option =
    activeFilter === "issues" || activeFilter === "edited"
      ? filterOptions.find((candidate) => candidate.kind === activeFilter)
      : filterOptions.find(
          (candidate) =>
            candidate.kind === "message-type" &&
            candidate.globalMessageNumber === activeFilter.globalMessageNumber,
        );
  if (!option) {
    return null;
  }

  if (option.kind === "message-type") {
    return `${option.messageName} ${option.count}`;
  }

  return `${option.label} ${option.count}`;
}
