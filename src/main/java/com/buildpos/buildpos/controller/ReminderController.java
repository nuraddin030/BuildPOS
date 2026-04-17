package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.entity.Reminder;
import com.buildpos.buildpos.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(reminderService.getAll().stream()
                .map(this::toMap).toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String text = body.get("text");
        String dueDateStr = body.get("dueDate");
        LocalDate dueDate = dueDateStr != null && !dueDateStr.isBlank()
                ? LocalDate.parse(dueDateStr)
                : null;
        Reminder saved = reminderService.create(text, dueDate, userDetails.getUsername());
        return ResponseEntity.ok(toMap(saved));
    }

    @PatchMapping("/{id}/done")
    public ResponseEntity<Map<String, Object>> markDone(@PathVariable Long id) {
        return ResponseEntity.ok(toMap(reminderService.markDone(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        reminderService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toMap(Reminder r) {
        return Map.of(
                "id",        r.getId(),
                "text",      r.getText(),
                "dueDate",   r.getDueDate() != null ? r.getDueDate().toString() : "",
                "isDone",    r.getIsDone(),
                "createdBy", r.getCreatedBy() != null ? r.getCreatedBy().getFullName() : "",
                "createdAt", r.getCreatedAt().toString()
        );
    }
}