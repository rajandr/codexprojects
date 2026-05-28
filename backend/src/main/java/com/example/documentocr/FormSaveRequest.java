package com.example.documentocr;

import java.util.Map;

public record FormSaveRequest(String documentId, Map<String, String> values) {
}
