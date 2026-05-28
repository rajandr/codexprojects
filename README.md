# Document OCR Mapper

A working full-stack starter for uploading TIFF/PDF files, selecting a region on a page, extracting text from that region, mapping it into a form, and saving the form data to a Spring backend.

## Requirements

- Node.js 20+
- Java 17+
- Maven 3.9+
- Optional: `tesseract` CLI installed and available on `PATH` for real OCR extraction

## Run

```bash
npm install --prefix frontend
npm run dev
```

In another terminal:

```bash
cd backend
mvn spring-boot:run
```

Frontend: http://localhost:5173

Backend: http://localhost:8080

## Notes

- Upload accepts `.pdf`, `.tif`, and `.tiff`.
- PDF page previews use Apache PDFBox.
- TIFF previews use ImageIO with TwelveMonkeys TIFF support.
- Region OCR calls the local `tesseract` command. If Tesseract is missing, the API returns a helpful message instead of crashing.
- Saved forms are stored in an in-memory H2 database for easy local development.
