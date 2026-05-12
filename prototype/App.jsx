import React, { useState } from "react";

const previewStates = ["empty", "drag-over", "loading", "loaded", "error"];

const knownUnits = [
  "semicircles",
  "percent",
  "watts",
  "cycles",
  "bpm",
  "rpm",
  "kcal",
  "m/s",
  "mm",
  "ms",
  "m",
  "s",
];

const realDataStats = {
  fileName: "20655764103_ACTIVITY.fit",
  fileSize: "325 KB",
  messages: 11817,
  hiddenDefinitionMessages: 54,
};

const defaultFilter = "all";

const fileIssues = [
  {
    id: "file-checksum-invalid",
    scope: "file",
    title: "Original file checksum was invalid",
    description:
      "FITx can still edit this file. Downloaded files will be written with a fresh checksum.",
  },
];

const messages = [
  {
    index: "#000001",
    type: "file_id",
    timestamp: "2025-10-11 11:33:18",
    fields: [
      ["serial_number", "3611914245"],
      ["time_created", "1129116798"],
      ["manufacturer", "1"],
      ["garmin_product", "4565"],
      ["type", "4"],
    ],
  },
  {
    index: "#000003",
    type: "activity",
    timestamp: "2025-10-11 11:33:18",
    fields: [
      ["timestamp", "1129116798"],
      ["total_timer_time", "3604.548 s"],
      ["local_timestamp", "1129127598"],
      ["num_sessions", "1"],
      ["event", "26"],
      ["event_type", "1"],
      ["unknown", "90", "unknown"],
    ],
  },
  {
    index: "#000004",
    type: "session",
    timestamp: "2025-10-11 11:33:18",
    fields: [
      ["start_time", "1129116798"],
      ["total_elapsed_time", "3604.548 s"],
      ["total_timer_time", "3604.548 s"],
      ["total_distance", "10177.39 m"],
      ["sport_profile_name", "Running"],
      ["enhanced_avg_speed", "2.823 m/s"],
      ["enhanced_max_speed", "5.268 m/s"],
      ["total_calories", "837 kcal"],
      ["avg_power", "280 watts"],
      ["max_power", "574 watts"],
      ["total_ascent", "89 m"],
      ["total_descent", "89 m"],
      ["avg_heart_rate", "163 bpm"],
      ["max_heart_rate", "183 bpm"],
      ["avg_cadence", "84 rpm"],
      ["max_cadence", "97 rpm"],
    ],
  },
  {
    index: "#000005",
    type: "time_in_zone",
    timestamp: "2025-10-11 11:33:18",
    fields: [
      ["time_in_hr_zone", "16.542|5.0|68.0|1450.638|2064.216|0.0|0.0 s"],
      [
        "time_in_power_zone",
        "9.543|1.999|33.991|257.155|2339.657|962.049|0.0|0.0 s",
      ],
      [
        "power_zone_high_boundary",
        "204|252|282|314|361|4000|65535|65535 watts",
      ],
      ["hr_zone_high_boundary", "145|156|168|179|187|196 bpm"],
      ["max_heart_rate", "196"],
      ["resting_heart_rate", "56"],
    ],
  },
  {
    index: "#000006",
    type: "lap",
    timestamp: "2025-10-11 11:33:18",
    fields: [
      ["start_time", "1129116798"],
      ["start_position_lat", "602000916 semicircles"],
      ["start_position_long", "364317290 semicircles"],
      ["end_position_lat", "602075736 semicircles"],
      ["end_position_long", "364429106 semicircles"],
      ["total_elapsed_time", "350.215 s"],
      ["total_timer_time", "350.215 s"],
      ["total_distance", "1000.0 m"],
      ["avg_power", "282 watts"],
      ["max_power", "504 watts"],
      ["avg_heart_rate", "162 bpm"],
      ["max_heart_rate", "174 bpm"],
      ["avg_cadence", "82 rpm"],
      ["max_cadence", "87 rpm"],
    ],
  },
  {
    index: "#000071",
    type: "event",
    timestamp: "2025-10-11 11:33:18",
    fields: [
      ["timestamp", "1129116798 s"],
      ["timer_trigger", "0"],
      ["event", "0"],
      ["event_type", "0"],
      ["event_group", "0"],
    ],
  },
  {
    index: "#000073",
    type: "device_info",
    timestamp: "2025-10-11 11:33:18",
    fields: [
      ["serial_number", "3611914245"],
      ["manufacturer", "1"],
      ["garmin_product", "4565"],
      ["software_version", "12.72"],
      ["device_index", "0"],
      ["source_type", "5"],
    ],
  },
  {
    index: "#000079",
    type: "record",
    timestamp: "2025-10-11 11:33:18",
    fields: [
      ["timestamp", "1129116798 s"],
      ["position_lat", "602000916 semicircles"],
      ["position_long", "364317290 semicircles"],
      ["distance", "1.5 m"],
      ["enhanced_speed", "1.148 m/s"],
      ["enhanced_altitude", "98.8 m"],
      ["power", "132 watts"],
      ["heart_rate", "140 bpm"],
      ["cadence", "67 rpm"],
      ["vertical_oscillation", "55.5 mm"],
      ["vertical_ratio", "9.15 percent"],
      ["step_length", "477.0 mm"],
      ["unknown", "1123", "unknown"],
    ],
  },
  {
    index: "#000083",
    type: "gps_metadata",
    timestamp: null,
    fields: [
      ["enhanced_altitude", "99.0 m"],
      ["enhanced_speed", "1.607 m/s"],
    ],
  },
  {
    index: "#000087",
    type: "record",
    timestamp: "2025-10-11 11:33:19",
    fields: [
      ["timestamp", "1129116799 s"],
      ["position_lat", "602001038 semicircles"],
      ["position_long", "364317420 semicircles"],
      ["distance", "2.83 m"],
      ["enhanced_speed", "1.773 m/s"],
      ["enhanced_altitude", "99.0 m"],
      ["power", "174 watts"],
      ["heart_rate", "139 bpm"],
      ["cadence", "83 rpm"],
      ["stance_time_percent", "49.25 percent"],
      ["stance_time", "426.0 ms"],
      ["vertical_ratio", "8.63 percent"],
      ["step_length", "642.0 mm"],
      ["unknown", "1735", "unknown"],
    ],
  },
  {
    index: "#000090",
    type: "record",
    timestamp: "2025-10-11 11:33:20",
    fields: [
      ["timestamp", "1129116800 s"],
      ["position_lat", "602001166 semicircles"],
      ["position_long", "364317531 semicircles"],
      ["distance", "4.07 m"],
      ["enhanced_speed", "1.521 m/s"],
      ["enhanced_altitude", "99.0 m"],
      ["power", "172 watts"],
      ["heart_rate", "139 bpm"],
      ["cadence", "83 rpm"],
      ["stance_time", "421.0 ms"],
      ["vertical_ratio", "8.95 percent"],
      ["step_length", "642.0 mm"],
      ["unknown", "19.0", "unknown"],
    ],
  },
  {
    index: "#011555",
    type: "record",
    timestamp: "2025-10-11 12:33:23",
    fields: [
      ["timestamp", "1129120403 s"],
      ["position_lat", "602001046 semicircles"],
      ["position_long", "364316900 semicircles"],
      ["distance", "10177.39 m"],
      ["enhanced_speed", "3.042 m/s"],
      ["enhanced_altitude", "97.6 m"],
      ["power", "463 watts"],
      ["heart_rate", "184 bpm"],
      ["cadence", "83 rpm"],
    ],
  },
];

const stateCopy = {
  empty: {
    status: "",
    title: "Inspect and repair activity data",
    helper:
      "Drop a .fit file to review activity messages in order and find GPS, time, altitude, or sensor issues.",
  },
  "drag-over": {
    status: "",
    title: "Release to inspect",
    helper:
      "The file will be parsed locally into repair-relevant activity messages.",
  },
  loading: {
    status: "",
    title: "Reading activity data",
    helper: "Decoding timestamps, GPS points, laps, events, and sensor values…",
  },
  loaded: {
    status: `${realDataStats.fileName} · ${realDataStats.messages.toLocaleString()} messages`,
    title: realDataStats.fileName,
    helper: `${realDataStats.messages.toLocaleString()} activity messages parsed.`,
  },
  error: {
    status: "",
    title: "Couldn’t read this FIT file",
    helper: "The file could not be parsed into editable activity data.",
  },
};

const iconPaths = {
  download: (
    <>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M20 20H4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
    </>
  ),
  fileCode: (
    <>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="m10 13-2 2 2 2" />
      <path d="m14 17 2-2-2-2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 1-9 9 9.7 9.7 0 0 1-6.7-2.7L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 9-9 9.7 9.7 0 0 1 6.7 2.7L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
};

function Icon({ name, size = 20, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={`block shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function getTimestampMeta(timestamp) {
  if (!timestamp) return "";
  return `${timestamp} UTC+03:00`;
}

function splitUnit(rawValue) {
  const text = String(rawValue);
  const parts = text.trim().split(" ");
  const possibleUnit = parts[parts.length - 1];

  if (knownUnits.includes(possibleUnit)) {
    return {
      valueText: parts.slice(0, -1).join(" "),
      unit: possibleUnit,
    };
  }

  return {
    valueText: text,
    unit: "",
  };
}

function parseFieldValue(rawValue) {
  const { valueText, unit } = splitUnit(rawValue);

  if (valueText.includes("|")) {
    return {
      isArray: true,
      unit,
      values: valueText
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  return {
    isArray: false,
    unit,
    values: [valueText],
  };
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function expectsNumericValue(name, unit) {
  if (unit) return true;
  return /^(timestamp|local_timestamp|time_created|serial_number|manufacturer|garmin_product|type|event|event_type|event_group|timer_trigger|num_sessions|device_index|source_type)$/i.test(
    name,
  );
}

function validateSingleValue(name, unit, value) {
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return "Required";
  if (!expectsNumericValue(name, unit)) return "";

  const numericValue = Number(trimmed);
  if (!Number.isFinite(numericValue)) return "Enter a number";
  if (unit === "percent" && (numericValue < 0 || numericValue > 100))
    return "Must be 0–100";
  if (
    [
      "watts",
      "cycles",
      "bpm",
      "rpm",
      "kcal",
      "m/s",
      "mm",
      "ms",
      "m",
      "s",
    ].includes(unit) &&
    numericValue < 0
  )
    return "Must be 0 or greater";
  return "";
}

function validateFieldValues(name, unit, values) {
  for (const value of values) {
    const issue = validateSingleValue(name, unit, value);
    if (issue) return [values.length > 1 ? `One value: ${issue}` : issue];
  }
  return [];
}

function getFieldKey(message, fieldIndex) {
  const fieldName = message.fields[fieldIndex]?.[0] ?? "field";
  return `${message.index}-${fieldIndex}-${fieldName}`;
}

function messageHasTrackedField(message, trackedFields) {
  return message.fields.some((_, fieldIndex) =>
    Boolean(trackedFields[getFieldKey(message, fieldIndex)]),
  );
}

function messageMatchesFilter(message, filter, editedFields, invalidFields) {
  if (filter === "all") return true;
  if (filter === "edited") return messageHasTrackedField(message, editedFields);
  if (filter === "issues")
    return messageHasTrackedField(message, invalidFields);
  return message.type === filter;
}

function getFieldIssuesList(invalidFields) {
  return messages.flatMap((message) =>
    message.fields.flatMap((field, fieldIndex) => {
      const fieldKey = getFieldKey(message, fieldIndex);
      const issues = invalidFields[fieldKey] ?? [];
      return issues.map((issue) => ({
        id: `${fieldKey}-${issue}`,
        scope: "field",
        fieldKey,
        messageType: message.type,
        timestamp: message.timestamp,
        fieldName: field[0],
        title: `${field[0]} has invalid data`,
        description: issue,
        canShow: true,
      }));
    }),
  );
}

function getIssuesList(invalidFields) {
  return [...fileIssues, ...getFieldIssuesList(invalidFields)];
}

function getMessageIssueCount(invalidFields) {
  return messages.filter((message) =>
    messageHasTrackedField(message, invalidFields),
  ).length;
}

function getEditedMessageCount(editedFields) {
  return messages.filter((message) =>
    messageHasTrackedField(message, editedFields),
  ).length;
}

function getFilterOptions(editedFields, invalidFields) {
  const messageIssueCount = getMessageIssueCount(invalidFields);
  const orderedTypes = [
    "record",
    "gps_metadata",
    "lap",
    "session",
    "device_info",
    "time_in_zone",
    "event",
  ];
  const typeOptions = orderedTypes
    .map((type) => ({
      id: type,
      label: type,
      count: messages.filter((message) => message.type === type).length,
    }))
    .filter((option) => option.count > 0);

  return [
    { id: "all", label: "All", count: messages.length, fixed: true },
    {
      id: "issues",
      label: "Issues",
      count: messageIssueCount,
      intent: "issue",
      fixed: true,
    },
    {
      id: "edited",
      label: "Edited",
      count: getEditedMessageCount(editedFields),
      intent: "edited",
      fixed: true,
    },
    ...typeOptions,
  ];
}

function runSmokeTests() {
  console.assert(previewStates.length === 5, "Expected five preview states.");
  console.assert(
    previewStates.includes("loaded"),
    "Expected loaded preview state.",
  );
  console.assert(
    Object.keys(stateCopy).length === previewStates.length,
    "Each preview state should have copy.",
  );
  console.assert(
    realDataStats.messages === 11817,
    "Expected real parsed message count.",
  );
  console.assert(
    realDataStats.hiddenDefinitionMessages === 54,
    "Expected definitions to be tracked but hidden.",
  );
  console.assert(
    !messages.some((message) => message.kind === "definition"),
    "Definition rows should not be shown in repair view.",
  );
  console.assert(
    messages.some((message) => message.type === "record"),
    "Expected at least one record message.",
  );
  console.assert(
    messages.some((message) => message.type === "gps_metadata"),
    "Expected GPS metadata examples.",
  );
  console.assert(
    messages.some((message) =>
      message.fields.some((field) => field[2] === "unknown"),
    ),
    "Expected unknown fields to remain visible inside data rows.",
  );
  console.assert(
    getTimestampMeta("2025-10-11 11:33:18") === "2025-10-11 11:33:18 UTC+03:00",
    "Expected timestamp to render with full date, time, and timezone.",
  );
  console.assert(
    getTimestampMeta(null) === "",
    "Expected missing timestamps to render quietly.",
  );
  console.assert(
    parseFieldValue("574 watts").unit === "watts",
    "Expected units to move into the field label.",
  );
  console.assert(
    parseFieldValue("574 watts").values[0] === "574",
    "Expected scalar field value to render without unit duplication.",
  );
  console.assert(
    parseFieldValue("2.823 m/s").unit === "m/s",
    "Expected compound speed units to move into the field label.",
  );
  console.assert(
    parseFieldValue("2.823 m/s").values[0] === "2.823",
    "Expected compound speed unit to be removed from the editable value.",
  );
  console.assert(
    parseFieldValue("16.542|5.0|68.0 s").isArray,
    "Expected pipe-separated values to render as an array field.",
  );
  console.assert(
    parseFieldValue("16.542|5.0|68.0 s").values.length === 3,
    "Expected array fields to preserve item order.",
  );
  console.assert(
    Boolean(
      iconPaths.upload &&
      iconPaths.download &&
      iconPaths.fileCode &&
      iconPaths.alert,
    ),
    "Expected local inline icons to be defined.",
  );
  console.assert(
    !iconPaths.moreVertical,
    "Expected message overflow action icon to be removed until actions are defined.",
  );
  console.assert(
    validateFieldValues("heart_rate", "bpm", ["abc"])[0] === "Enter a number",
    "Expected invalid numeric input to be reported.",
  );
  console.assert(
    "edit" !== "issue",
    "Expected edit and issue counts to be represented independently in the header.",
  );
  console.assert(
    validateFieldValues("vertical_ratio", "percent", ["120"])[0] ===
      "Must be 0–100",
    "Expected percentage range validation.",
  );
  console.assert(
    validateFieldValues("time_in_hr_zone", "s", ["16.542", "bad"])[0] ===
      "One value: Enter a number",
    "Expected array validation to report bad values.",
  );
  console.assert(
    arraysEqual(["1", "2"], ["1", "2"]),
    "Expected array equality helper to work.",
  );
  console.assert(
    stateCopy.loading.title === "Reading activity data",
    "Expected loading state copy to be available.",
  );
  console.assert(
    stateCopy.empty.title && stateCopy["drag-over"].title,
    "Expected empty and drag-over copy to exist.",
  );
  console.assert(
    stateCopy.empty.status === "" && stateCopy["drag-over"].status === "",
    "Expected empty and drag-over header status to stay quiet.",
  );
  console.assert(
    stateCopy.empty.status === stateCopy["drag-over"].status,
    "Expected empty and drag-over to share quiet header behavior.",
  );
  console.assert(
    stateCopy.loading.status === "",
    "Expected loading header status to stay quiet.",
  );
  console.assert(
    stateCopy.error.status === "",
    "Expected error header status to stay quiet.",
  );
  console.assert(
    typeof StatusPanel === "function",
    "Expected StatusPanel to be defined before rendering.",
  );
  console.assert(
    messageMatchesFilter(
      messages.find((message) => message.type === "record"),
      "record",
      {},
      {},
    ),
    "Expected type filter to match messages by type.",
  );
  console.assert(
    getFilterOptions({}, {}).some((option) => option.id === "issues"),
    "Expected issues filter option to exist.",
  );
  console.assert(
    getFilterOptions({}, {})
      .slice(0, 3)
      .map((option) => option.id)
      .join(",") === "all,issues,edited",
    "Expected fixed filters to come first in the single wrapping filter row.",
  );
  console.assert(
    getFilterOptions({}, {}).find((option) => option.id === "issues")?.count ===
      0,
    "Expected issues filter to show only message-level issues.",
  );
  console.assert(
    getFilterOptions({}, {}).find((option) => option.id === "edited")?.count ===
      0,
    "Expected edited filter to show a stable zero count.",
  );
  console.assert(
    getEditedMessageCount({}) === 0,
    "Expected edited message count to start at zero.",
  );
  console.assert(
    Array.isArray(getIssuesList({})),
    "Expected issues list helper to return an array.",
  );
  console.assert(
    getIssuesList({}).some((issue) => issue.scope === "file"),
    "Expected non-field file issues to appear in the issues list.",
  );
  console.assert(
    !getIssuesList({}).some((issue) => issue.id === "unknown-message-types"),
    "Expected unknown message types not to be treated as issues.",
  );
  console.assert(
    getMessageIssueCount({}) === 0,
    "Expected message issue count to exclude file-level issues.",
  );
  console.assert(
    getMessageIssueCount({ "#000079-0-timestamp": ["Enter a number"] }) === 1,
    "Expected one invalid field to count as one issue message.",
  );
  console.assert(
    getMessageIssueCount({
      "#000079-0-timestamp": ["Enter a number"],
      "#000079-1-position_lat": ["Enter a number"],
    }) === 1,
    "Expected multiple invalid fields in one message to count as one issue message.",
  );
  console.assert(
    getFilterOptions({ "#000079-0-timestamp": ["1"] }, {}).find(
      (option) => option.id === "edited",
    )?.count === 1,
    "Expected edited filter to count edited messages, not fields.",
  );
  console.assert(
    getFilterOptions(
      { "#000079-0-timestamp": ["1"], "#000079-1-position_lat": ["2"] },
      {},
    ).find((option) => option.id === "edited")?.count === 1,
    "Expected multiple edited fields in one message to count as one edited message.",
  );
}

function PreviewSwitch({ state, setState }) {
  return (
    <div className="mx-auto mb-5 flex w-full max-w-6xl items-center justify-between gap-3 rounded-[28px] border border-[#CAC4D0] bg-white/70 p-2 shadow-sm backdrop-blur">
      <span className="hidden px-3 text-sm font-medium text-[#49454F] sm:inline">
        Preview state
      </span>
      <div className="flex flex-1 flex-wrap justify-end gap-1">
        {previewStates.map((item) => (
          <button
            key={item}
            onClick={() => setState(item)}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              state === item
                ? "bg-[#6750A4] text-white"
                : "text-[#49454F] hover:bg-[#F3EDF7]"
            }`}
          >
            {item.replace("-", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

function TopBar({
  state,
  dirtyCount = 0,
  invalidCount = 0,
  onOpenIssues,
  onDownload,
}) {
  const loaded = state === "loaded";
  const status = loaded ? realDataStats.fileName : stateCopy[state].status;
  const showStatus = Boolean(status);
  const messageCount = loaded
    ? `${realDataStats.messages.toLocaleString()} messages`
    : null;

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#EADDFF] text-[#4F378B]">
          <Icon name="fileCode" size={21} />
        </div>
        <h1 className="shrink-0 text-xl font-semibold tracking-[-0.01em] text-[#1D1B20] sm:text-2xl">
          FITx
        </h1>
        {showStatus ? (
          <>
            <span className="hidden h-6 w-px shrink-0 bg-[#CAC4D0] sm:block" />
            <span className="min-w-0 truncate text-sm font-medium text-[#1D1B20] sm:text-base">
              {status}
            </span>
          </>
        ) : null}
        {messageCount ? (
          <>
            <span className="hidden shrink-0 text-sm font-medium text-[#79747E] sm:inline">
              ·
            </span>
            <span className="hidden shrink-0 text-sm text-[#49454F] sm:inline">
              {messageCount}
            </span>
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {loaded ? (
          <>
            {invalidCount > 0 ? (
              <button
                onClick={onOpenIssues}
                className="hidden rounded-full bg-[#FFDAD6] px-3 py-1.5 text-xs font-semibold text-[#BA1A1A] transition hover:bg-[#F9C7C1] sm:inline"
              >
                {invalidCount} {invalidCount === 1 ? "issue" : "issues"}
              </button>
            ) : null}
            {dirtyCount > 0 ? (
              <span className="hidden rounded-full bg-[#EADDFF] px-3 py-1.5 text-xs font-semibold text-[#4F378B] sm:inline">
                {dirtyCount} {dirtyCount === 1 ? "edit" : "edits"}
              </span>
            ) : null}
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#6750A4] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5B4698]"
              title={
                invalidCount > 0
                  ? "Review validation issues before downloading"
                  : "Download edited FIT file"
              }
              onClick={onDownload}
            >
              <Icon name="download" size={17} />
              <span className="hidden sm:inline">Download</span>
            </button>
          </>
        ) : null}
        <button
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${loaded ? "border border-[#79747E] bg-transparent text-[#6750A4] hover:bg-[#F3EDF7]" : "bg-[#6750A4] text-white shadow-sm hover:bg-[#5B4698]"}`}
        >
          <Icon name="upload" size={17} />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>
    </header>
  );
}

function IssuesDialog({
  open,
  issues,
  showDownloadAction,
  onClose,
  onShowIssues,
  onDownloadAnyway,
}) {
  if (!open) return null;

  const hasIssues = issues.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1B20]/28 px-4 py-6"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="issues-dialog-title"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#FFFBFE] shadow-2xl"
      >
        <div className="border-b border-[#E7E0EC] bg-[#F7F2FA] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Icon name="alert" size={22} className="text-[#6750A4]" />
              <h2
                id="issues-dialog-title"
                className="truncate text-xl font-semibold tracking-[-0.01em] text-[#1D1B20]"
              >
                Issues
              </h2>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          {hasIssues ? (
            <div className="space-y-2">
              {issues.map((issue) => (
                <article
                  key={issue.id}
                  className="rounded-[18px] border border-[#E7E0EC] bg-[#FFFBFE] p-4 shadow-[inset_3px_0_0_#EADDFF]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-[#1D1B20]">
                          {issue.title}
                        </span>
                        {issue.messageType ? (
                          <>
                            <span className="text-sm text-[#79747E]">·</span>
                            <span className="text-sm text-[#49454F]">
                              {issue.messageType}
                            </span>
                          </>
                        ) : null}
                        {issue.timestamp ? (
                          <>
                            <span className="text-sm text-[#79747E]">·</span>
                            <span className="text-sm text-[#79747E]">
                              {getTimestampMeta(issue.timestamp)}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {issue.description ? (
                        <p className="mt-1 text-sm font-medium text-[#49454F]">
                          {issue.description}
                        </p>
                      ) : null}
                    </div>
                    {issue.canShow ? (
                      <button
                        onClick={onShowIssues}
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#79747E] px-3 py-2 text-sm font-semibold text-[#6750A4] transition hover:bg-[#F3EDF7]"
                      >
                        Show
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] bg-[#F7F2FA] px-5 py-8 text-center text-sm font-medium text-[#49454F]">
              The current edits pass basic field validation.
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#E7E0EC] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#6750A4] transition hover:bg-[#F3EDF7]"
          >
            Keep editing
          </button>
          {showDownloadAction ? (
            <button
              onClick={onDownloadAnyway}
              className="rounded-full bg-[#6750A4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B4698]"
            >
              Download anyway
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FilterButton({ option, active, onClick }) {
  const isIssue = option.intent === "issue";
  const isEdited = option.intent === "edited";
  const countLabel = option.fixed
    ? option.count
    : option.count > 0
      ? option.count
      : null;

  return (
    <button
      key={option.id}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
        active
          ? isIssue
            ? "bg-[#BA1A1A] text-white"
            : "bg-[#6750A4] text-white"
          : isIssue && option.count > 0
            ? "bg-[#FFDAD6] text-[#BA1A1A] hover:bg-[#F9C7C1]"
            : isEdited && option.count > 0
              ? "bg-[#EADDFF] text-[#4F378B] hover:bg-[#DED0F7]"
              : "bg-[#FFFBFE] text-[#49454F] hover:bg-[#EADDFF]"
      }`}
    >
      {option.label}
      {countLabel !== null ? (
        <span
          className={`ml-1.5 inline-block min-w-3 text-right tabular-nums ${active ? "text-white/80" : "text-[#79747E]"}`}
        >
          {countLabel}
        </span>
      ) : null}
    </button>
  );
}

function FilterBar({
  activeFilter,
  onFilterChange,
  editedFields,
  invalidFields,
}) {
  const filterOptions = getFilterOptions(editedFields, invalidFields);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap gap-2 rounded-[24px] bg-[#F7F2FA] p-2">
        {filterOptions.map((option) => (
          <FilterButton
            key={option.id}
            option={option}
            active={activeFilter === option.id}
            onClick={() => onFilterChange(option.id)}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyStatePanel({ state }) {
  const drag = state === "drag-over";

  return (
    <section
      className={`flex min-h-[168px] w-full rounded-[28px] border px-6 py-10 transition sm:px-8 sm:py-12 ${
        drag
          ? "border-dashed border-[#6750A4] bg-[#F7F2FA]"
          : "border-transparent bg-[#F7F2FA]"
      }`}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#EADDFF] text-[#4F378B]">
          <Icon name="fileCode" size={22} />
        </div>

        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#1D1B20]">
            {drag
              ? "Release to open this FIT file"
              : "Upload a FIT file to start"}
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-[#49454F]">
            {drag
              ? "Drop the file here to parse it locally and open the editable message list."
              : "Use Upload in the header, or drop a .fit file here to inspect and edit its messages."}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatusPanel({ state }) {
  const copy = stateCopy[state];
  const loading = state === "loading";
  const error = state === "error";

  return (
    <section
      className={`w-full rounded-[28px] px-6 py-10 transition sm:px-8 sm:py-12 ${
        error ? "bg-[#FCEEEE]" : "bg-[#F7F2FA]"
      }`}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
              error
                ? "bg-[#FFDAD6] text-[#BA1A1A]"
                : "bg-[#EADDFF] text-[#4F378B]"
            }`}
          >
            {error ? (
              <Icon name="alert" size={22} />
            ) : (
              <Icon
                name="refresh"
                className={loading ? "animate-spin" : ""}
                size={22}
              />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#1D1B20]">
              {copy.title}
            </h2>
            <p className="mt-2 max-w-xl text-base leading-7 text-[#49454F]">
              {copy.helper}
            </p>
            {loading ? (
              <div className="mt-5 flex items-center gap-3">
                <div className="h-1.5 w-44 overflow-hidden rounded-full bg-[#EADDFF]">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-[#6750A4]" />
                </div>
                <span className="text-sm font-medium text-[#79747E]">
                  Parsing…
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <button className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#BA1A1A] px-5 py-3 text-sm font-semibold text-white">
            Try another file
          </button>
        ) : null}
      </div>
    </section>
  );
}

function FieldMeta({ children, tone = "neutral" }) {
  const toneClass = tone === "error" ? "text-[#BA1A1A]" : "text-[#79747E]";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold leading-4 ${toneClass}`}
    >
      <span className={tone === "error" ? "text-[#BA1A1A]" : "text-[#CAC4D0]"}>
        ·
      </span>
      <span>{children}</span>
    </span>
  );
}

function FieldValueRow({ value, isArray, onChange, hasError }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`block w-full min-w-0 bg-transparent text-sm font-semibold leading-5 outline-none [font-variant-numeric:tabular-nums] placeholder:text-[#79747E] ${
        hasError ? "text-[#BA1A1A]" : "text-[#1D1B20]"
      } ${isArray ? "py-0.5" : "py-0.5"}`}
      spellCheck={false}
      aria-invalid={hasError}
    />
  );
}

function Field({
  field,
  messageIndex,
  fieldIndex,
  editedValues,
  onFieldChange,
  onValidationChange,
}) {
  const [name, rawValue, tag] = field;
  const parsed = parseFieldValue(rawValue);
  const fieldKey = `${messageIndex}-${fieldIndex}-${name}`;
  const draftValues = editedValues ?? parsed.values;
  const validationIssues = validateFieldValues(name, parsed.unit, draftValues);
  const hasError = validationIssues.length > 0;
  const isEdited =
    Boolean(editedValues) && !arraysEqual(editedValues, parsed.values);

  function updateValue(itemIndex, nextValue) {
    const nextValues = draftValues.map((value, index) =>
      index === itemIndex ? nextValue : value,
    );
    const nextIssues = validateFieldValues(name, parsed.unit, nextValues);
    onFieldChange(fieldKey, parsed.values, nextValues);
    onValidationChange(fieldKey, nextIssues);
  }

  const fieldStateClass = hasError
    ? "border-[#BA1A1A] focus-within:border-[#BA1A1A] focus-within:ring-[#BA1A1A]/15"
    : isEdited
      ? "border-[#6750A4] focus-within:border-[#6750A4] focus-within:ring-[#6750A4]/15"
      : "border-[#CAC4D0] hover:border-[#6750A4] focus-within:border-[#6750A4] focus-within:ring-[#6750A4]/15";

  return (
    <div
      className={`group min-w-0 rounded-[14px] border bg-[#FFFBFE] px-2.5 py-2 transition focus-within:ring-2 ${fieldStateClass}`}
    >
      <div className="mb-1 flex min-h-5 items-start justify-between gap-2">
        <div className="min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold leading-4 text-[#79747E]">
          <span className="min-w-0 break-all">{name}</span>
          {parsed.unit ? <FieldMeta>{parsed.unit}</FieldMeta> : null}
          {tag === "unknown" ? <FieldMeta>unknown</FieldMeta> : null}
          {hasError ? (
            <FieldMeta tone="error">{validationIssues[0]}</FieldMeta>
          ) : null}
        </div>
      </div>
      <div className={parsed.isArray ? "space-y-0.5" : ""}>
        {draftValues.map((value, itemIndex) => (
          <FieldValueRow
            key={`${messageIndex}-${name}-${fieldIndex}-${itemIndex}`}
            value={value}
            isArray={parsed.isArray}
            hasError={hasError}
            onChange={(nextValue) => updateValue(itemIndex, nextValue)}
          />
        ))}
      </div>
    </div>
  );
}

function MessageCard({
  message,
  editedFields,
  onFieldChange,
  onValidationChange,
}) {
  const timestampMeta = getTimestampMeta(message.timestamp);

  return (
    <article className="rounded-[24px] border border-[#E7E0EC] bg-[#FFFBFE] p-4 shadow-[0_1px_2px_rgba(29,27,32,0.05)] sm:p-5">
      <div className="mb-4 flex items-center gap-4">
        <h2 className="min-w-0 truncate text-lg font-semibold tracking-[-0.01em] text-[#1D1B20]">
          <span>{message.type}</span>
          {timestampMeta ? (
            <>
              <span className="mx-2 font-medium text-[#79747E]">·</span>
              <span className="text-sm font-medium tracking-normal text-[#79747E]">
                {timestampMeta}
              </span>
            </>
          ) : null}
        </h2>
      </div>
      <dl className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {message.fields.map((field, fieldIndex) => (
          <Field
            key={`${message.index}-${field[0]}-${fieldIndex}`}
            field={field}
            messageIndex={message.index}
            fieldIndex={fieldIndex}
            editedValues={
              editedFields[`${message.index}-${fieldIndex}-${field[0]}`]
            }
            onFieldChange={onFieldChange}
            onValidationChange={onValidationChange}
          />
        ))}
      </dl>
    </article>
  );
}

function MessageStream({
  activeFilter,
  editedFields,
  invalidFields,
  onFieldChange,
  onValidationChange,
}) {
  const visibleMessages = messages.filter((message) =>
    messageMatchesFilter(message, activeFilter, editedFields, invalidFields),
  );

  return (
    <section className="rounded-[28px] bg-[#F7F2FA] p-3 sm:p-4">
      {visibleMessages.length > 0 ? (
        <div className="space-y-3">
          {visibleMessages.map((message) => (
            <MessageCard
              key={message.index}
              message={message}
              editedFields={editedFields}
              onFieldChange={onFieldChange}
              onValidationChange={onValidationChange}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] bg-[#FFFBFE] px-5 py-8 text-center text-sm font-medium text-[#79747E]">
          No messages match this filter.
        </div>
      )}
    </section>
  );
}

function MainContent({
  state,
  activeFilter,
  editedFields,
  invalidFields,
  onFieldChange,
  onValidationChange,
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
      {state === "loaded" ? (
        <MessageStream
          activeFilter={activeFilter}
          editedFields={editedFields}
          invalidFields={invalidFields}
          onFieldChange={onFieldChange}
          onValidationChange={onValidationChange}
        />
      ) : state === "empty" || state === "drag-over" ? (
        <EmptyStatePanel state={state} />
      ) : (
        <StatusPanel state={state} />
      )}
    </main>
  );
}

runSmokeTests();

export default function FitxMaterial3Mockup() {
  const [state, setState] = useState("loaded");
  const [activeFilter, setActiveFilter] = useState(defaultFilter);
  const [editedFields, setEditedFields] = useState({});
  const [invalidFields, setInvalidFields] = useState({});
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [issuesOpenedFromDownload, setIssuesOpenedFromDownload] =
    useState(false);

  function handleFieldChange(fieldKey, originalValues, nextValues) {
    setEditedFields((currentFields) => {
      const nextFields = { ...currentFields };
      if (arraysEqual(originalValues, nextValues)) {
        delete nextFields[fieldKey];
      } else {
        nextFields[fieldKey] = nextValues;
      }
      return nextFields;
    });
  }

  function handleValidationChange(fieldKey, validationIssues) {
    setInvalidFields((currentFields) => {
      const nextFields = { ...currentFields };
      if (validationIssues.length === 0) {
        delete nextFields[fieldKey];
      } else {
        nextFields[fieldKey] = validationIssues;
      }
      return nextFields;
    });
  }

  const dirtyCount = Object.keys(editedFields).length;
  const issues = getIssuesList(invalidFields);
  const issueCount = issues.length;
  const invalidCount = issueCount;

  function openIssues() {
    setIssuesOpenedFromDownload(false);
    setIssuesOpen(true);
  }

  function showIssuesInList() {
    setActiveFilter("issues");
    setIssuesOpen(false);
  }

  function handleDownload() {
    if (issueCount > 0) {
      setIssuesOpenedFromDownload(true);
      setIssuesOpen(true);
      return;
    }
  }

  function handleDownloadAnyway() {
    setIssuesOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#FFFBFE] font-sans text-[#1D1B20]">
      <div className="px-4 pt-4">
        <PreviewSwitch state={state} setState={setState} />
      </div>
      <TopBar
        state={state}
        dirtyCount={dirtyCount}
        invalidCount={invalidCount}
        onOpenIssues={openIssues}
        onDownload={handleDownload}
      />
      {state === "loaded" ? (
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          editedFields={editedFields}
          invalidFields={invalidFields}
        />
      ) : null}
      <MainContent
        state={state}
        activeFilter={activeFilter}
        editedFields={editedFields}
        invalidFields={invalidFields}
        onFieldChange={handleFieldChange}
        onValidationChange={handleValidationChange}
      />
      <IssuesDialog
        open={issuesOpen}
        issues={issues}
        showDownloadAction={issuesOpenedFromDownload}
        onClose={() => setIssuesOpen(false)}
        onShowIssues={showIssuesInList}
        onDownloadAnyway={handleDownloadAnyway}
      />
    </div>
  );
}
