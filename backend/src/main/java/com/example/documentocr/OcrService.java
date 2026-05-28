package com.example.documentocr;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;

@Service
class OcrService {
    String extractText(BufferedImage image) throws IOException, InterruptedException {
        if (!isTesseractAvailable()) {
            return "OCR engine not available. Install Tesseract and retry this extraction.";
        }

        Path input = Files.createTempFile("ocr-selection-", ".png");
        Path outputBase = Files.createTempFile("ocr-output-", "");
        Files.deleteIfExists(outputBase);

        try {
            ImageIO.write(image, "png", input.toFile());
            Process process = new ProcessBuilder("tesseract", input.toString(), outputBase.toString(), "--psm", "6")
                    .redirectErrorStream(true)
                    .start();
            String processOutput = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new IllegalStateException("Tesseract failed: " + processOutput);
            }
            Path textFile = Path.of(outputBase + ".txt");
            return Files.exists(textFile) ? Files.readString(textFile).trim() : "";
        } finally {
            Files.deleteIfExists(input);
            Files.deleteIfExists(Path.of(outputBase + ".txt"));
        }
    }

    private boolean isTesseractAvailable() {
        try {
            Process process = new ProcessBuilder("tesseract", "--version")
                    .redirectErrorStream(true)
                    .start();
            return process.waitFor() == 0;
        } catch (IOException | InterruptedException error) {
            if (error instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return false;
        }
    }
}
