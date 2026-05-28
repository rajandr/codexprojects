package com.example.documentocr;

public record ExtractRequest(int page, String fieldName, double x, double y, double width, double height) {
}
