package com.example.documentocr;

import java.time.Instant;

public record FormSaveResponse(Long id, String documentId, Instant createdAt) {
}
