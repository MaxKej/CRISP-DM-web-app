import { useState } from "react";

import {
  updateDatasetColumnType,
  type SemanticType,
} from "../../api/datasets";

interface ColumnTypeSelectorProps {
  datasetId: number;
  columnName: string;
  semanticType: SemanticType;
  onUpdated: (columnName: string, type: SemanticType) => void;
}

export default function ColumnTypeSelector({
  datasetId,
  columnName,
  semanticType,
  onUpdated,
}: ColumnTypeSelectorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (type: SemanticType) => {
    setIsSaving(true);
    setError("");

    try {
      await updateDatasetColumnType(datasetId, columnName, type);
      onUpdated(columnName, type);
    } catch {
      setError("Nie udało się zapisać typu kolumny.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <select
        value={semanticType}
        disabled={isSaving}
        onChange={(event) =>
          void handleChange(event.target.value as SemanticType)
        }
        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
        aria-label={`Typ analityczny kolumny ${columnName}`}
      >
        <option value="quantitative">Ilościowa</option>
        <option value="qualitative">Jakościowa</option>
      </select>

      {isSaving && (
        <p className="text-xs text-gray-500">Zapisywanie...</p>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}