import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { reportOptions } from "../../constants";
import SearchableDropdown from "../../components/SearchableDropdown";
import ReportRangePicker from "../../components/ReportRangePicker";

export default function ReportsWorkspace({
  assetTagOptions,
  locationOptions,
  moduleLabel,
  reportType,
  reportFrequency,
  reportFuelAssetTag,
  reportFuelScope,
  reportFuelStation,
  reportDateFrom,
  reportDateTo,
  reportPreview,
  reportDownloading,
  onFuelAssetTagChange,
  onFuelScopeChange,
  onFuelStationChange,
  onDownload,
  onReportTypeChange,
  onDateFromChange,
  onDateToChange,
}) {
  const REPORT_PREVIEW_PAGE_SIZE = 10;
  const [reportPreviewSearch, setReportPreviewSearch] = useState("");
  const [reportPreviewPage, setReportPreviewPage] = useState(1);
  const selectedOption = reportOptions.find((option) => option.key === reportType) ?? reportOptions[0];
  const filteredReportRows = useMemo(() => {
    const term = reportPreviewSearch.trim().toLowerCase();
    if (!term) {
      return reportPreview.rows;
    }

    return reportPreview.rows.filter((row) =>
      row.some((cell) => String(cell ?? "").toLowerCase().includes(term)),
    );
  }, [reportPreview.rows, reportPreviewSearch]);
  const reportPreviewTotalPages = Math.max(1, Math.ceil(filteredReportRows.length / REPORT_PREVIEW_PAGE_SIZE));
  const reportPreviewCurrentPage = Math.min(reportPreviewPage, reportPreviewTotalPages);
  const reportPreviewPageRows = filteredReportRows.slice(
    (reportPreviewCurrentPage - 1) * REPORT_PREVIEW_PAGE_SIZE,
    reportPreviewCurrentPage * REPORT_PREVIEW_PAGE_SIZE,
  );

  useEffect(() => {
    setReportPreviewPage(1);
  }, [reportPreviewSearch, reportType, reportDateFrom, reportDateTo, reportFuelScope, reportFuelAssetTag, reportFuelStation]);

  return (
    <section className="reportsWorkspace">
      <section className="panel reportsHeroPanel">
        <div className="reportsHeroCopy">
          <span className="reportsEyebrow">Reporting Suite</span>
          <h2>{selectedOption.label}</h2>
          {/* <p>
            Build polished operational summaries for {moduleLabel} with a clean export format, clear reporting windows,
            and a structured preview before download.
          </p> */}
        </div>
        <div className="reportsHeroMeta">
          <div className="reportsHeroMetaCard">
            <span>Reporting window</span>
            <strong>{reportDateFrom === reportDateTo ? reportDateFrom : `${reportDateFrom} to ${reportDateTo}`}</strong>
          </div>
        </div>
      </section>

      <section className="reportsControlGrid">
        <article className="panel reportControlPanel">
          <div className="panelHeader">
            <h2>Report Builder</h2>
          </div>
          <p className="reportPanelLead">
            Choose a report pack, set the reporting window, and export a presentation-ready PDF from the backend.
          </p>
          <div className="reportTypeGrid">
            {reportOptions.map((option) => (
              <button
                key={option.key}
                className={`reportTypeCard ${reportType === option.key ? "active" : ""}`}
                type="button"
                onClick={() => onReportTypeChange(option.key)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
          <div className="reportToolbar">
            <div className="reportSegment">
              <button
                className={`filterChip ${reportFuelScope === "overall" ? "active" : ""}`}
                type="button"
                onClick={() => onFuelScopeChange("overall")}
              >
                Overall Report
              </button>
              <button
                className={`filterChip ${reportFuelScope === "asset" ? "active" : ""}`}
                type="button"
                onClick={() => onFuelScopeChange("asset")}
              >
                Report By Single Asset
              </button>
              <button
                className={`filterChip ${reportFuelScope === "station" ? "active" : ""}`}
                type="button"
                onClick={() => onFuelScopeChange("station")}
              >
                Report By Station
              </button>
            </div>
            {reportFuelScope === "asset" ? (
              <label className="assetField reportScopeField">
                <span>Vehicle Asset</span>
                <SearchableDropdown
                  label="Vehicle asset"
                  options={assetTagOptions}
                  value={reportFuelAssetTag}
                  placeholder="Select vehicle asset"
                  onChange={onFuelAssetTagChange}
                />
              </label>
            ) : null}
            {reportFuelScope === "station" ? (
              <label className="assetField reportScopeField">
                <span>Station</span>
                <select value={reportFuelStation} onChange={(event) => onFuelStationChange(event.target.value)}>
                  <option value="">Select station</option>
                  {locationOptions.map((locationName) => (
                    <option key={locationName} value={locationName}>
                      {locationName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <ReportRangePicker
              dateFrom={reportDateFrom}
              dateTo={reportDateTo}
              onDateFromChange={onDateFromChange}
              onDateToChange={onDateToChange}
            />
            <button className="reportDownloadButton" type="button" onClick={onDownload} disabled={reportDownloading}>
              {reportDownloading ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>
        </article>

        <article className="panel reportSummaryPanel">
          <div className="panelHeader">
            <h2>Executive Snapshot</h2>
          </div>
          <div className="reportSummaryIntro">
            <strong>{reportPreview.title}</strong>
            <span>{reportPreview.description}</span>
          </div>
          <div className="reportSummaryGrid">
            {reportPreview.summary.map((item) => (
              <div key={item.label} className="reportSummaryCard">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel reportPreviewPanel">
        <div className="panelHeader">
          <div className="reportPreviewHeading">
            <h2>Preview Table</h2>
            <span>{selectedOption.label} ready for export</span>
          </div>
          <label className="settingsSearchField" aria-label="Search preview table">
            <Search size={14} />
            <input
              type="search"
              value={reportPreviewSearch}
              onChange={(event) => setReportPreviewSearch(event.target.value)}
              placeholder="Search this report table"
            />
          </label>
          <button className="reportPreviewAction" type="button" onClick={onDownload}>
            Export {reportPreview.title}
          </button>
        </div>
        {reportPreview.rows.length === 0 ? (
          <div className="emptyState">
            {reportPreview.emptyStateMessage || "No records match the selected reporting period in the current workspace."}
          </div>
        ) : filteredReportRows.length === 0 ? (
          <div className="emptyState">No rows match your search.</div>
        ) : (
          <>
            <div className="reportPreviewTable">
              <div
                className="reportPreviewHeader"
                style={{ gridTemplateColumns: `repeat(${reportPreview.columns.length}, minmax(0, 1fr))` }}
              >
                {reportPreview.columns.map((column) => (
                  <span key={column}>{column}</span>
                ))}
              </div>
              {reportPreviewPageRows.map((row, index) => (
                <div
                  key={`${reportPreview.title}-${(reportPreviewCurrentPage - 1) * REPORT_PREVIEW_PAGE_SIZE + index}`}
                  className="reportPreviewRow"
                  style={{ gridTemplateColumns: `repeat(${reportPreview.columns.length}, minmax(0, 1fr))` }}
                >
                  {row.map((cell, cellIndex) => (
                    <span
                      key={`${reportPreview.title}-${(reportPreviewCurrentPage - 1) * REPORT_PREVIEW_PAGE_SIZE + index}-${cellIndex}`}
                    >
                      {cell}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className="inventoryFooter">
              <span>
                Showing {(reportPreviewCurrentPage - 1) * REPORT_PREVIEW_PAGE_SIZE + 1}-
                {Math.min(reportPreviewCurrentPage * REPORT_PREVIEW_PAGE_SIZE, filteredReportRows.length)} of{" "}
                {filteredReportRows.length}
              </span>
              <div className="inventoryPagination">
                <button
                  type="button"
                  disabled={reportPreviewCurrentPage === 1}
                  onClick={() => setReportPreviewPage((current) => Math.max(1, current - 1))}
                >
                  Prev
                </button>
                <span className="active">{reportPreviewCurrentPage}</span>
                <span>/</span>
                <span>{reportPreviewTotalPages}</span>
                <button
                  type="button"
                  disabled={reportPreviewCurrentPage === reportPreviewTotalPages}
                  onClick={() => setReportPreviewPage((current) => Math.min(reportPreviewTotalPages, current + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </section>
  );
}

