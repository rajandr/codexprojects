package com.example.documentocr;

import java.nio.file.Path;

public record DocumentRecord(String id, String fileName, String contentType, int pageCount, Path path) {
}
