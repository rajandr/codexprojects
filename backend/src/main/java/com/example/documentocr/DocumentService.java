package com.example.documentocr;

import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
class DocumentService {
    private final Path storageDir;
    private final Map<String, DocumentRecord> documents = new ConcurrentHashMap<>();

    DocumentService(@Value("${app.storage-dir}") Path storageDir) throws IOException {
        this.storageDir = storageDir;
        Files.createDirectories(storageDir);
    }

    DocumentRecord store(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String normalized = originalName.toLowerCase();
        if (!normalized.endsWith(".pdf") && !normalized.endsWith(".tif") && !normalized.endsWith(".tiff")) {
            throw new IllegalArgumentException("Only PDF, TIF, and TIFF files are supported.");
        }

        String id = UUID.randomUUID().toString();
        Path destination = storageDir.resolve(id + "-" + originalName.replaceAll("[^a-zA-Z0-9._-]", "_"));
        file.transferTo(destination);

        String contentType = file.getContentType() == null ? detectContentType(destination, normalized) : file.getContentType();
        int pageCount = countPages(destination, normalized, contentType);
        DocumentRecord document = new DocumentRecord(id, originalName, contentType, pageCount, destination);
        documents.put(id, document);
        return document;
    }

    DocumentRecord find(String id) {
        DocumentRecord document = documents.get(id);
        if (document == null) {
            throw new IllegalArgumentException("Document not found: " + id);
        }
        return document;
    }

    byte[] renderPage(String id, int page) throws IOException {
        BufferedImage image = renderPageImage(find(id), page);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    BufferedImage cropSelection(String id, ExtractRequest request) throws IOException {
        BufferedImage page = renderPageImage(find(id), request.page());
        Rectangle crop = clampRectangle(request, page.getWidth(), page.getHeight());
        return page.getSubimage(crop.x, crop.y, crop.width, crop.height);
    }

    private BufferedImage renderPageImage(DocumentRecord document, int page) throws IOException {
        if (isPdf(document)) {
            try (PDDocument pdf = Loader.loadPDF(document.path().toFile())) {
                validatePage(page, pdf.getNumberOfPages());
                PDFRenderer renderer = new PDFRenderer(pdf);
                return renderer.renderImageWithDPI(page, 200, ImageType.RGB);
            }
        }
        return readTiffPage(document.path(), page);
    }

    private int countPages(Path path, String fileName, String contentType) throws IOException {
        if (contentType.contains("pdf") || fileName.endsWith(".pdf")) {
            try (PDDocument pdf = Loader.loadPDF(path.toFile())) {
                return pdf.getNumberOfPages();
            }
        }

        try (ImageInputStream input = ImageIO.createImageInputStream(path.toFile())) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("Unable to read TIFF document.");
            }
            ImageReader reader = readers.next();
            reader.setInput(input);
            try {
                return reader.getNumImages(true);
            } finally {
                reader.dispose();
            }
        }
    }

    private BufferedImage readTiffPage(Path path, int page) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(path.toFile())) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("Unable to read TIFF document.");
            }
            ImageReader reader = readers.next();
            reader.setInput(input);
            try {
                validatePage(page, reader.getNumImages(true));
                return reader.read(page);
            } finally {
                reader.dispose();
            }
        }
    }

    private Rectangle clampRectangle(ExtractRequest request, int imageWidth, int imageHeight) {
        int x = clamp((int) Math.round(request.x()), 0, imageWidth - 1);
        int y = clamp((int) Math.round(request.y()), 0, imageHeight - 1);
        int width = clamp((int) Math.round(request.width()), 1, imageWidth - x);
        int height = clamp((int) Math.round(request.height()), 1, imageHeight - y);
        return new Rectangle(x, y, width, height);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private void validatePage(int page, int pageCount) {
        if (page < 0 || page >= pageCount) {
            throw new IllegalArgumentException("Page must be between 0 and " + (pageCount - 1) + ".");
        }
    }

    private boolean isPdf(DocumentRecord document) {
        return document.contentType().contains("pdf") || document.fileName().toLowerCase().endsWith(".pdf");
    }

    private String detectContentType(Path path, String fileName) throws IOException {
        String detected = Files.probeContentType(path);
        if (detected != null) {
            return detected;
        }
        return fileName.endsWith(".pdf") ? "application/pdf" : "image/tiff";
    }
}
