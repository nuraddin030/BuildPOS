package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.Reminder;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.ReminderRepository;
import com.buildpos.buildpos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReminderService {

    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;

    public List<Reminder> getAll() {
        return reminderRepository.findAllByIsDoneFalseOrderByDueDateAscCreatedAtDesc();
    }

    @Transactional
    public Reminder create(String text, LocalDate dueDate, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi"));
        Reminder reminder = Reminder.builder()
                .text(text)
                .dueDate(dueDate)
                .isDone(false)
                .createdBy(user)
                .build();
        return reminderRepository.save(reminder);
    }

    @Transactional
    public Reminder markDone(Long id) {
        Reminder reminder = reminderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Eslatma topilmadi: " + id));
        reminder.setIsDone(true);
        return reminderRepository.save(reminder);
    }

    @Transactional
    public void delete(Long id) {
        if (!reminderRepository.existsById(id)) {
            throw new NotFoundException("Eslatma topilmadi: " + id);
        }
        reminderRepository.deleteById(id);
    }
}