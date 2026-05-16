import {
  activeFilterButton,
  activeIssueFilterButton,
  filterBar,
  filterButton,
  filterCount,
  issueFilterButton,
} from "../styles/app.css";
import type { FitFilterOption, FitMessageFilter } from "../editor";

interface FilterBarProps {
  options: readonly FitFilterOption[];
  activeFilter: FitMessageFilter;
  onFilterChange: (filter: FitMessageFilter) => void;
  disabled?: boolean;
}

export function FilterBar({
  options,
  activeFilter,
  onFilterChange,
  disabled = false,
}: FilterBarProps) {
  return (
    <div className={filterBar}>
      {options.map((option) => {
        const filter =
          option.kind === "message-type"
            ? {
                kind: "message-type" as const,
                globalMessageNumber: option.globalMessageNumber,
              }
            : option.kind;
        const active = isActiveFilter(activeFilter, filter);
        const isIssue = option.kind === "issues";
        const className = [
          filterButton,
          isIssue && option.count > 0 ? issueFilterButton : "",
          active ? activeFilterButton : "",
          active && isIssue ? activeIssueFilterButton : "",
        ]
          .filter(Boolean)
          .join(" ");
        const label =
          option.kind === "message-type" ? option.messageName : option.label;

        return (
          <button
            key={`${option.kind}-${label}`}
            className={className}
            type="button"
            disabled={disabled}
            onClick={() => onFilterChange(filter)}
          >
            {label}
            <span className={filterCount}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function isActiveFilter(
  active: FitMessageFilter,
  candidate: FitMessageFilter,
): boolean {
  if (typeof active === "string" || typeof candidate === "string") {
    return active === candidate;
  }

  return active.globalMessageNumber === candidate.globalMessageNumber;
}
