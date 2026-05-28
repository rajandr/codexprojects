package com.example.documentocr;

public record DocumentResponse(String id, String fileName, String contentType, int pageCount) {
    static DocumentResponse from(DocumentRecord document) {
        return new DocumentResponse(document.id(), document.fileName(), document.contentType(), document.pageCount());
    }
}
