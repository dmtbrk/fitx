import {
  activeFilterButton,
  activeIssueFilterButton,
  filterBar,
  filterButton,
  filterCount,
  filterWrap,
  issueFilterButton,
} from "../styles/app.css";
import type { FitFilterOption, FitMessageFilter } from "../editor";

interface FilterBarProps {
  options: readonly FitFilterOption[];
  activeFilter: FitMessageFilter;
  onFilterChange: (filter: FitMessageFilter) => void;
}

export function FilterBar({
  options,
  activeFilter,
  onFilterChange,
}: FilterBarProps) {
  return (
    <div className={filterWrap}>
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
              onClick={() => onFilterChange(filter)}
            >
              {label}
              <span className={filterCount}>{option.count}</span>
            </button>
          );
        })}
      </div>
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
