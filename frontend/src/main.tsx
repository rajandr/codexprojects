import React from "react";
import ReactDOM from "react-dom/client";
import {
  UploadCloud,
  ScanText,
  Save,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import "./styles.css";

type DocumentInfo = {
  id: string;
  fileName: string;
  contentType: string;
  pageCount: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FormValues = {
  invoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  totalAmount: string;
  notes: string;
};

const emptyForm: FormValues = {
  invoiceNumber: "",
  vendorName: "",
  invoiceDate: "",
  totalAmount: "",
  notes: ""
};

const fieldLabels: Record<keyof FormValues, string> = {
  invoiceNumber: "Invoice number",
  vendorName: "Vendor name",
  invoiceDate: "Invoice date",
  totalAmount: "Total amount",
  notes: "Notes"
};

function App() {
  const [documentInfo, setDocumentInfo] = React.useState<DocumentInfo | null>(null);
  const [page, setPage] = React.useState(0);
  const [selection, setSelection] = React.useState<Rect | null>(null);
  const [naturalSize, setNaturalSize] = React.useState({ width: 1, height: 1 });
  const [zoom, setZoom] = React.useState(1);
  const [selectedField, setSelectedField] = React.useState<keyof FormValues>("invoiceNumber");
  const [formValues, setFormValues] = React.useState<FormValues>(emptyForm);
  const [status, setStatus] = React.useState("Upload a PDF or TIFF file to begin.");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const imageWrapRef = React.useRef<HTMLDivElement | null>(null);
  const dragStart = React.useRef<{ x: number; y: number } | null>(null);

  const imageUrl = documentInfo ? `/api/documents/${documentInfo.id}/pages/${page}/image` : "";

  async function uploadFile(file: File) {
    setIsUploading(true);
    setStatus("Uploading document...");
    setSelection(null);
    const payload = new FormData();
    payload.append("file", file);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: payload
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const uploaded = (await response.json()) as DocumentInfo;
      setDocumentInfo(uploaded);
      setPage(0);
      setZoom(1);
      setFormValues(emptyForm);
      setStatus(`${uploaded.fileName} uploaded. Drag across the page to select text.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function getPointerPosition(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const scaleX = naturalSize.width / bounds.width;
    const scaleY = naturalSize.height / bounds.height;
    return {
      x: Math.max(0, Math.min(naturalSize.width, (event.clientX - bounds.left) * scaleX)),
      y: Math.max(0, Math.min(naturalSize.height, (event.clientY - bounds.top) * scaleY))
    };
  }

  function startSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (!documentInfo) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPointerPosition(event);
    dragStart.current = point;
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
  }

  function updateSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const point = getPointerPosition(event);
    const start = dragStart.current;
    setSelection({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y)
    });
  }

  function endSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStart.current = null;
  }

  async function extractText() {
    if (!documentInfo || !selection || selection.width < 8 || selection.height < 8) {
      setStatus("Select a larger region before extracting text.");
      return;
    }

    setIsExtracting(true);
    setStatus(`Extracting text for ${fieldLabels[selectedField]}...`);

    try {
      const response = await fetch(`/api/documents/${documentInfo.id}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page,
          fieldName: selectedField,
          ...selection
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as { text: string };
      setFormValues((current) => ({ ...current, [selectedField]: result.text.trim() }));
      setStatus(`Mapped extracted text into ${fieldLabels[selectedField]}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Text extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function saveForm() {
    if (!documentInfo) return;
    setIsSaving(true);
    setStatus("Saving form data...");

    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: documentInfo.id,
          values: formValues
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as { id: number };
      setStatus(`Saved form #${result.id}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const selectionStyle = React.useMemo(() => {
    if (!selection) return undefined;
    return {
      left: `${(selection.x / naturalSize.width) * 100}%`,
      top: `${(selection.y / naturalSize.height) * 100}%`,
      width: `${(selection.width / naturalSize.width) * 100}%`,
      height: `${(selection.height / naturalSize.height) * 100}%`
    };
  }, [selection, naturalSize]);

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Document OCR Mapper</h1>
            <p>{status}</p>
          </div>
          <label className="upload-button">
            <UploadCloud size={18} />
            <span>{isUploading ? "Uploading" : "Upload"}</span>
            <input
              type="file"
              accept=".pdf,.tif,.tiff,application/pdf,image/tiff"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </header>

        <div className="content-grid">
          <section className="viewer-panel" aria-label="Document preview">
            <div className="viewer-toolbar">
              <div className="file-chip">
                <FileText size={16} />
                <span>{documentInfo?.fileName ?? "No document selected"}</span>
              </div>
              <div className="page-controls">
                <button
                  type="button"
                  disabled={!documentInfo || page === 0}
                  onClick={() => {
                    setSelection(null);
                    setZoom(1);
                    setPage((current) => Math.max(0, current - 1));
                  }}
                  title="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  Page {documentInfo ? page + 1 : 0} / {documentInfo?.pageCount ?? 0}
                </span>
                <button
                  type="button"
                  disabled={!documentInfo || page >= documentInfo.pageCount - 1}
                  onClick={() => {
                    setSelection(null);
                    setZoom(1);
                    setPage((current) => Math.min((documentInfo?.pageCount ?? 1) - 1, current + 1));
                  }}
                  title="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="zoom-controls" aria-label="Zoom controls">
                <button
                  type="button"
                  disabled={!documentInfo || zoom <= 0.5}
                  onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))}
                  title="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  type="button"
                  disabled={!documentInfo}
                  onClick={() => setZoom(1)}
                  title="Reset zoom"
                >
                  <RotateCcw size={16} />
                  <span>{Math.round(zoom * 100)}%</span>
                </button>
                <button
                  type="button"
                  disabled={!documentInfo || zoom >= 3}
                  onClick={() => setZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))}
                  title="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
              </div>
            </div>

            <div className="preview-surface">
              {documentInfo ? (
                <div
                  ref={imageWrapRef}
                  className="image-wrap"
                  onPointerDown={startSelection}
                  onPointerMove={updateSelection}
                  onPointerUp={endSelection}
                  onPointerCancel={endSelection}
                >
                  <img
                    key={imageUrl}
                    src={imageUrl}
                    alt={`Page ${page + 1} preview`}
                    draggable={false}
                    style={{
                      width: naturalSize.width > 1 ? `${naturalSize.width * zoom}px` : undefined
                    }}
                    onLoad={(event) => {
                      setNaturalSize({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight
                      });
                    }}
                  />
                  {selectionStyle && <div className="selection-box" style={selectionStyle} />}
                </div>
              ) : (
                <div className="empty-state">
                  <UploadCloud size={42} />
                  <strong>Upload a document</strong>
                  <span>Then drag over the page to choose the text region.</span>
                </div>
              )}
            </div>
          </section>

          <aside className="form-panel">
            <div className="extract-card">
              <label htmlFor="field-select">Map next extraction to</label>
              <select
                id="field-select"
                value={selectedField}
                onChange={(event) => setSelectedField(event.target.value as keyof FormValues)}
              >
                {Object.entries(fieldLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={extractText} disabled={!documentInfo || isExtracting}>
                <ScanText size={18} />
                <span>{isExtracting ? "Extracting" : "Extract selected text"}</span>
              </button>
            </div>

            <form className="data-form" onSubmit={(event) => event.preventDefault()}>
              {(Object.keys(fieldLabels) as Array<keyof FormValues>).map((key) => (
                <label key={key}>
                  <span>{fieldLabels[key]}</span>
                  {key === "notes" ? (
                    <textarea
                      value={formValues[key]}
                      onFocus={() => setSelectedField(key)}
                      onChange={(event) => setFormValues((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  ) : (
                    <input
                      value={formValues[key]}
                      onFocus={() => setSelectedField(key)}
                      onChange={(event) => setFormValues((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  )}
                </label>
              ))}
              <button className="save-button" type="button" disabled={!documentInfo || isSaving} onClick={saveForm}>
                <Save size={18} />
                <span>{isSaving ? "Saving" : "Save form"}</span>
              </button>
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
