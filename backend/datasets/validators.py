from pathlib import Path
from zipfile import BadZipFile, ZipFile

import pandas as pd
from django.core.exceptions import ValidationError


MAX_DATASET_SIZE = 100 * 1024 * 1024  # 100 MB

ALLOWED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls",
    ".ods",
}

OLE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
ZIP_SIGNATURE = b"PK\x03\x04"


def validate_csv(file):
    """
    Sprawdza, czy przesłany plik CSV zawiera
    dane możliwe do odczytania jako tabela.
    """

    file.seek(0)

    try:
        dataframe = pd.read_csv(
            file,
            sep=None,
            engine="python",
            nrows=5,
        )

    except (pd.errors.ParserError, UnicodeDecodeError, ValueError) as exc:
        raise ValidationError(
            "Nie można odczytać pliku CSV. "
            "Plik może być uszkodzony lub mieć nieprawidłowy format."
        ) from exc

    finally:
        file.seek(0)

    if dataframe.empty and len(dataframe.columns) == 0:
        raise ValidationError(
            "Plik CSV nie zawiera danych tabelarycznych."
        )

    if len(dataframe.columns) < 1:
        raise ValidationError(
            "Plik CSV nie zawiera żadnych kolumn."
        )


def validate_excel_or_ods(file, extension):
    """
    Sprawdza, czy plik XLS/XLSX/ODS może zostać
    odczytany przez odpowiedni silnik Pandas.
    """

    file.seek(0)

    try:
        if extension == ".xlsx":
            dataframe = pd.read_excel(
                file,
                engine="openpyxl",
                nrows=5,
            )

        elif extension == ".xls":
            dataframe = pd.read_excel(
                file,
                engine="xlrd",
                nrows=5,
            )

        elif extension == ".ods":
            dataframe = pd.read_excel(
                file,
                engine="odf",
                nrows=5,
            )

        else:
            raise ValidationError(
                "Nieobsługiwany format pliku."
            )

    except (
        ValueError,
        TypeError,
        OSError,
        ImportError,
        pd.errors.ParserError,
    ) as exc:
        raise ValidationError(
            f"Nie można odczytać pliku {extension}. "
            "Plik może być uszkodzony lub mieć nieprawidłową strukturę."
        ) from exc

    finally:
        file.seek(0)

    if len(dataframe.columns) < 1:
        raise ValidationError(
            f"Plik {extension} nie zawiera żadnych kolumn."
        )

def validate_dataset_file(file):
    """
    Waliduje przesłany plik datasetu.

    Sprawdza:
    - obecność pliku,
    - rozmiar,
    - rozszerzenie,
    - rzeczywisty format pliku,
    - możliwość odczytania zawartości przez Pandas.
    """

    if not file:
        raise ValidationError(
            "Nie przesłano pliku."
        )

    if file.size == 0:
        raise ValidationError(
            "Przesłany plik jest pusty."
        )

    if file.size > MAX_DATASET_SIZE:
        raise ValidationError(
            "Plik jest zbyt duży. "
            "Maksymalny rozmiar to 100 MB."
        )

    filename = Path(file.name).name
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            "Niedozwolony format pliku. "
            "Dozwolone formaty: CSV, XLSX, XLS, ODS."
        )

    # ---------------------------------------------------------
    # Sprawdzenie rzeczywistego formatu pliku
    # ---------------------------------------------------------

    file.seek(0)
    header = file.read(8)
    file.seek(0)

    if extension == ".xls":
        if not header.startswith(OLE_SIGNATURE):
            raise ValidationError(
                "Plik XLS ma nieprawidłowy format."
            )

    elif extension in {".xlsx", ".ods"}:
        if not header.startswith(ZIP_SIGNATURE):
            raise ValidationError(
                f"Plik {extension} ma nieprawidłowy format."
            )

        try:
            with ZipFile(file) as archive:

                if archive.testzip() is not None:
                    raise ValidationError(
                        "Archiwum pliku jest uszkodzone."
                    )

                names = archive.namelist()

                if extension == ".xlsx":

                    if "[Content_Types].xml" not in names:
                        raise ValidationError(
                            "Plik XLSX ma nieprawidłową strukturę."
                        )

                    if "xl/workbook.xml" not in names:
                        raise ValidationError(
                            "Plik XLSX ma nieprawidłową strukturę."
                        )

                elif extension == ".ods":

                    if "mimetype" not in names:
                        raise ValidationError(
                            "Plik ODS ma nieprawidłową strukturę."
                        )

        except BadZipFile as exc:
            raise ValidationError(
                "Plik jest uszkodzonym archiwum."
            ) from exc

        finally:
            file.seek(0)

    # ---------------------------------------------------------
    # Sprawdzenie zawartości przez Pandas
    # ---------------------------------------------------------

    if extension == ".csv":
        validate_csv(file)

    elif extension in {".xlsx", ".xls", ".ods"}:
        validate_excel_or_ods(
            file,
            extension,
        )

    file.seek(0)