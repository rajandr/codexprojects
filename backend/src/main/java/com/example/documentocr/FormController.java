package com.example.documentocr;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forms")
class FormController {
    private final FormDataRepository repository;
    private final ObjectMapper objectMapper;

    FormController(FormDataRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @PostMapping
    FormSaveResponse save(@RequestBody FormSaveRequest request) throws JsonProcessingException {
        FormData formData = new FormData();
        formData.setDocumentId(request.documentId());
        formData.setValuesJson(objectMapper.writeValueAsString(request.values()));
        FormData saved = repository.save(formData);
        return new FormSaveResponse(saved.getId(), saved.getDocumentId(), saved.getCreatedAt());
    }
}
