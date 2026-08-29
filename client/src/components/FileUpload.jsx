import { useRef, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";

// Reusable evidence/file uploader that reads a file and returns its base64
// data-url via `onSelect`. Accepts images + PDF and enforces a size cap.
export default function FileUpload({ label = "Upload evidence", onSelect, maxSizeMB = 5, multiple = true }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const toDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  async function handleChange(e) {
    const chosen = Array.from(e.target.files || []);
    setError("");
    if (chosen.length === 0) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const sizeOk = chosen.every((f) => f.size <= maxSizeMB * 1024 * 1024);
    if (!sizeOk) {
      setError(`Each file must be under ${maxSizeMB} MB.`);
      return;
    }
    try {
      const loaded = [];
      for (const f of chosen) {
        if (!allowed.includes(f.type)) {
          setError("Only JPG, PNG, WEBP or PDF files are allowed.");
          continue;
        }
        const dataUrl = await toDataUrl(f);
        loaded.push({ name: f.name, dataUrl });
        onSelect(dataUrl);
      }
      setFiles((prev) => [...prev, ...loaded]);
    } catch {
      setError("Could not read the selected file.");
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(i) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary-container/20 transition-all">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Upload size={18} />
        </div>
        <span className="text-[13px] font-semibold text-on-surface">{label}</span>
        <span className="text-[11px] text-on-surface-variant">JPG, PNG, WEBP or PDF · up to {maxSizeMB} MB{multiple ? " each" : ""}</span>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple={multiple} onChange={handleChange} className="hidden" />
      </label>

      {error && <p className="text-[12px] font-semibold text-error">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border border-outline-variant/60 bg-surface px-3 py-2">
              {f.dataUrl.startsWith("data:image") ? (
                <ImageIcon size={16} className="text-primary shrink-0" />
              ) : (
                <FileText size={16} className="text-primary shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-on-surface">{f.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-on-surface-variant hover:text-error cursor-pointer" aria-label={`Remove ${f.name}`}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}