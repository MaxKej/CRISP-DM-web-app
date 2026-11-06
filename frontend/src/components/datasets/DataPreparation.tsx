
import { useEffect, useState } from "react";
import {
  getDatasetPreview,
  removeDatasetColumns,
  removeEmptyDatasetRows,
  removeDuplicateDatasetRows,
  fillDatasetMissingValues,
  createDatasetSyntheticColumn,
} from "../../api/datasets";
import type {
  PreparationResult,
  MissingValueMethod,
  SyntheticColumnOperator,
} from "../../api/datasets";
import { useNotification } from "../../context/NotificationContext";

interface DataPreparationProps {
  datasetId: number;
}

const DataPreparation = ({ datasetId }: DataPreparationProps) => {
  const { showNotification } = useNotification();

  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [result, setResult] = useState<PreparationResult | null>(null);

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [missingMethods, setMissingMethods] = useState<
    Record<string, MissingValueMethod>
  >({});

  const [syntheticName, setSyntheticName] = useState("");
  const [leftColumn, setLeftColumn] = useState("");
  const [rightColumn, setRightColumn] = useState("");
  const [operator, setOperator] = useState<SyntheticColumnOperator>("+");

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true);

        const data = await getDatasetPreview(datasetId);

        setColumns(data.columns);
        setRows(data.rows);
      } catch {
        showNotification(
          "Nie udało się pobrać podglądu zbioru danych.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [datasetId]);

  const handleColumnSelection = (column: string) => {
    setSelectedColumns((previous) =>
      previous.includes(column)
        ? previous.filter((item) => item !== column)
        : [...previous, column],
    );
  };

  const handleMissingMethodChange = (
    column: string,
    method: MissingValueMethod,
  ) => {
    setMissingMethods((previous) => ({
      ...previous,
      [column]: method,
    }));
  };

  const applyResult = (data: PreparationResult) => {
    setResult(data);

    if (data.saved) {
      setColumns(data.columns);
      setRows(data.rows);
      setSelectedColumns([]);
      setMissingMethods({});

      showNotification("Operacja została zapisana.", "success");
    } else {
      showNotification("Podgląd operacji został wygenerowany.", "success");
    }
  };

  const handleRemoveColumns = async (save: boolean) => {
    if (selectedColumns.length === 0) {
      showNotification("Wybierz kolumny do usunięcia.", "error");
      return;
    }

    try {
      setProcessing(true);

      const data = await removeDatasetColumns(
        datasetId,
        selectedColumns,
        save,
      );

      applyResult(data);
    } catch (error) {
      console.error(error);
      showNotification("Nie udało się usunąć kolumn.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveEmptyRows = async (save: boolean) => {
    try {
      setProcessing(true);

      const data = await removeEmptyDatasetRows(datasetId, save);

      applyResult(data);
    } catch (error) {
      console.error(error);
      showNotification("Nie udało się usunąć pustych wierszy.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveDuplicates = async (save: boolean) => {
    try {
      setProcessing(true);

      const data = await removeDuplicateDatasetRows(datasetId, save);

      applyResult(data);
    } catch (error) {
      console.error(error);
      showNotification("Nie udało się usunąć duplikatów.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleFillMissingValues = async (save: boolean) => {
    if (Object.keys(missingMethods).length === 0) {
      showNotification(
        "Wybierz przynajmniej jedną kolumnę i metodę uzupełniania.",
        "error",
      );
      return;
    }

    try {
      setProcessing(true);

      const data = await fillDatasetMissingValues(
        datasetId,
        missingMethods,
        save,
      );

      applyResult(data);
    } catch (error) {
      console.error(error);
      showNotification(
        "Nie udało się uzupełnić brakujących wartości.",
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateSyntheticColumn = async (save: boolean) => {
    if (!syntheticName.trim() || !leftColumn || !rightColumn) {
      showNotification(
        "Uzupełnij nazwę i wybierz obie kolumny.",
        "error",
      );
      return;
    }

    try {
      setProcessing(true);

      const data = await createDatasetSyntheticColumn(datasetId, {
        name: syntheticName.trim(),
        left_column: leftColumn,
        operator,
        right_column: rightColumn,
        save,
      });

      applyResult(data);

      if (data.saved) {
        setSyntheticName("");
      }
    } catch (error) {
      console.error(error);
      showNotification(
        "Nie udało się utworzyć nowej kolumny.",
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  const renderActionButtons = (
    previewAction: () => void,
    saveAction: () => void,
  ) => (
    <div className="mt-4 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={previewAction}
        disabled={processing}
        className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        Podgląd
      </button>

      <button
        type="button"
        onClick={saveAction}
        disabled={processing}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Zapisz operację
      </button>
    </div>
  );

  const displayedColumns = result?.columns ?? columns;
  const displayedRows = result?.rows ?? rows;

  if (loading) {
    return <p className="text-gray-500">Ładowanie danych...</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Data Preparation</h2>
        <p className="mt-2 text-sm text-gray-600">
          Wybierz operacje przygotowania danych. Możesz najpierw
          wygenerować podgląd, a następnie zapisać wybraną operację.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Liczba kolumn</p>
            <p className="mt-1 text-2xl font-semibold">
              {columns.length}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Wiersze w aktualnym podglądzie
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {rows.length}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold">1. Usuwanie kolumn</h3>
        <p className="mt-1 text-sm text-gray-600">
          Wybierz kolumny, które mają zostać usunięte ze zbioru.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((column) => (
            <label
              key={column}
              className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(column)}
                onChange={() => handleColumnSelection(column)}
              />
              <span>{column}</span>
            </label>
          ))}
        </div>

        {renderActionButtons(
          () => handleRemoveColumns(false),
          () => handleRemoveColumns(true),
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold">2. Usuwanie pustych wierszy</h3>
        <p className="mt-1 text-sm text-gray-600">
          Usuwa wiersze, w których wszystkie wartości są puste.
        </p>

        {renderActionButtons(
          () => handleRemoveEmptyRows(false),
          () => handleRemoveEmptyRows(true),
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold">3. Usuwanie duplikatów</h3>
        <p className="mt-1 text-sm text-gray-600">
          Usuwa powtarzające się wiersze ze zbioru danych.
        </p>

        {renderActionButtons(
          () => handleRemoveDuplicates(false),
          () => handleRemoveDuplicates(true),
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold">
          4. Uzupełnianie brakujących wartości
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Wybierz metodę uzupełniania osobno dla każdej kolumny.
        </p>

        <div className="mt-4 space-y-3">
          {columns.map((column) => (
            <div
              key={column}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <span className="min-w-0 flex-1 text-sm font-medium">
                {column}
              </span>

              <select
                value={missingMethods[column] ?? ""}
                onChange={(event) => {
                  const value = event.target.value;

                  if (value) {
                    handleMissingMethodChange(
                      column,
                      value as MissingValueMethod,
                    );
                  } else {
                    setMissingMethods((previous) => {
                      const updated = { ...previous };
                      delete updated[column];
                      return updated;
                    });
                  }
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Nie uzupełniaj</option>
                <option value="mean">Średnia</option>
                <option value="median">Mediana</option>
                <option value="mode">Dominanta</option>
              </select>
            </div>
          ))}
        </div>

        {renderActionButtons(
          () => handleFillMissingValues(false),
          () => handleFillMissingValues(true),
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold">5. Tworzenie nowej zmiennej</h3>
        <p className="mt-1 text-sm text-gray-600">
          Utwórz nową kolumnę na podstawie działania matematycznego
          na dwóch istniejących kolumnach.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            value={syntheticName}
            onChange={(event) => setSyntheticName(event.target.value)}
            placeholder="Nazwa nowej kolumny"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />

          <select
            value={leftColumn}
            onChange={(event) => setLeftColumn(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Pierwsza kolumna</option>
            {columns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>

          <select
            value={operator}
            onChange={(event) =>
              setOperator(event.target.value as SyntheticColumnOperator)
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="+">Dodawanie (+)</option>
            <option value="-">Odejmowanie (-)</option>
            <option value="*">Mnożenie (*)</option>
            <option value="/">Dzielenie (/)</option>
          </select>

          <select
            value={rightColumn}
            onChange={(event) => setRightColumn(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Druga kolumna</option>
            {columns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </div>

        {renderActionButtons(
          () => handleCreateSyntheticColumn(false),
          () => handleCreateSyntheticColumn(true),
        )}
      </section>

      {result && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-lg font-semibold">Wynik operacji</h3>

          <p className="mt-2 text-sm text-gray-600">
            {result.saved
              ? "Operacja została zapisana w przygotowanym zbiorze danych."
              : "To jest podgląd. Zmiany nie zostały zapisane."}
          </p>

          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium">Podsumowanie</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-gray-700">
              {JSON.stringify(result.summary, null, 2)}
            </pre>
          </div>

          <h4 className="mt-5 font-medium">Podgląd danych</h4>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {displayedColumns.map((column) => (
                    <th
                      key={column}
                      className="border border-gray-200 px-3 py-2 text-left"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayedRows.map((row, index) => (
                  <tr key={index}>
                    {displayedColumns.map((column) => (
                      <td
                        key={column}
                        className="border border-gray-200 px-3 py-2"
                      >
                        {row[column] === null || row[column] === undefined
                          ? "—"
                          : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Wyświetlono {result.preview_rows} wierszy podglądu.
          </p>
        </section>
      )}
    </div>
  );
};

export default DataPreparation;
