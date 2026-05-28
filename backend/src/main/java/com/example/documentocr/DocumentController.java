package com.example.documentocr;

import java.awt.image.BufferedImage;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
class DocumentController {
    private final DocumentService documentService;
    private final OcrService ocrService;

    DocumentController(DocumentService documentService, OcrService ocrService) {
        this.documentService = documentService;
        this.ocrService = ocrService;
    }

    @PostMapping
    DocumentResponse upload(@RequestParam("file") MultipartFile file) throws IOException {
        return DocumentResponse.from(documentService.store(file));
    }

    @GetMapping(value = "/{id}/pages/{page}/image", produces = MediaType.IMAGE_PNG_VALUE)
    byte[] pageImage(@PathVariable String id, @PathVariable int page) throws IOException {
        return documentService.renderPage(id, page);
    }

    @PostMapping("/{id}/extract")
    ExtractResponse extract(@PathVariable String id, @RequestBody ExtractRequest request) throws IOException, InterruptedException {
        BufferedImage selectedRegion = documentService.cropSelection(id, request);
        String text = ocrService.extractText(selectedRegion);
        return new ExtractResponse(request.fieldName(), text);
    }

    @org.springframework.web.bind.annotation.ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    ResponseEntity<String> handleBadRequest(RuntimeException error) {
        return ResponseEntity.badRequest().body(error.getMessage());
    }
}
