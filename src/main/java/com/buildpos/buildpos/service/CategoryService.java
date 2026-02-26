package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.CategoryReorderRequest;
import com.buildpos.buildpos.dto.request.CategoryRequest;
import com.buildpos.buildpos.dto.response.BreadcrumbItem;
import com.buildpos.buildpos.dto.response.CategoryResponse;
import com.buildpos.buildpos.dto.response.CategoryStatsResponse;
import com.buildpos.buildpos.entity.Category;
import com.buildpos.buildpos.entity.enums.CategoryStatus;
import com.buildpos.buildpos.mapper.CategoryMapper;
import com.buildpos.buildpos.repository.CategoryRepository;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.exception.AlreadyExistsException;
import com.buildpos.buildpos.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private static final int MAX_DEPTH = 3;

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    public CategoryResponse create(CategoryRequest request) {
        String slug = generateSlug(request.getName());

        if (categoryRepository.existsBySlugAndIsDeletedFalse(slug)) {
            throw new AlreadyExistsException("Bu nomdagi kategoriya mavjud: " + slug);
        }

        Category category = Category.builder()
                .name(request.getName())
                .slug(slug)
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .status(request.getStatus() != null ? request.getStatus() : CategoryStatus.ACTIVE)
                .position(request.getPosition() != null ? request.getPosition() : 0)
                .build();

        if (request.getParentId() != null) {
            Category parent = getActiveOrThrow(request.getParentId());
            int parentDepth = getDepth(parent);
            if (parentDepth >= MAX_DEPTH - 1) {
                throw new BadRequestException(
                        "Maksimal daraja (%d) dan oshib ketdi. Pastroq darajaga qo'shing.".formatted(MAX_DEPTH)
                );
            }
            category.setParent(parent);
        }

        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Transactional(readOnly = true)
    public Page<CategoryResponse> getAll(String keyword, Pageable pageable) {
        Page<Category> page = (keyword != null && !keyword.isBlank())
                ? categoryRepository.searchByKeyword(keyword.trim(), pageable)
                : categoryRepository.findAllActive(pageable);
        return page.map(categoryMapper::toSimpleResponse);
    }

    @Transactional(readOnly = true)
    public CategoryResponse getById(Long id) {
        Category category = getActiveOrThrow(id);
        return categoryMapper.toResponse(category);
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getTree() {
        return categoryRepository.findAllRootCategories()
                .stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getSubcategories(Long parentId) {
        getActiveOrThrow(parentId);
        return categoryRepository.findAllByParentId(parentId)
                .stream()
                .map(categoryMapper::toSimpleResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BreadcrumbItem> getBreadcrumb(Long id) {
        Category category = getActiveOrThrow(id);
        return categoryMapper.buildBreadcrumb(category);
    }

    @Transactional(readOnly = true)
    public CategoryStatsResponse getStats() {
        return new CategoryStatsResponse(
                categoryRepository.countAllActive(),
                categoryRepository.countByStatusActive(),
                categoryRepository.countRootCategories()
        );
    }

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getActiveOrThrow(id);

        String newSlug = generateSlug(request.getName());
        if (!newSlug.equals(category.getSlug()) &&
                categoryRepository.existsBySlugAndIsDeletedFalse(newSlug)) {
            throw new AlreadyExistsException("Bu nomdagi kategoriya mavjud: " + newSlug);
        }

        category.setName(request.getName());
        category.setSlug(newSlug);
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());

        if (request.getStatus() != null) {
            category.setStatus(request.getStatus());
        }
        if (request.getPosition() != null) {
            category.setPosition(request.getPosition());
        }

        if (request.getParentId() != null) {
            if (request.getParentId().equals(id)) {
                throw new BadRequestException("Kategoriya o'zining parenti bo'la olmaydi");
            }
            if (isDescendant(id, request.getParentId())) {
                throw new BadRequestException("Kategoriyani o'z avlodiga ko'chirib bo'lmaydi");
            }
            Category parent = getActiveOrThrow(request.getParentId());
            if (getDepth(parent) >= MAX_DEPTH - 1) {
                throw new BadRequestException("Maksimal daraja (%d) dan oshib ketdi".formatted(MAX_DEPTH));
            }
            category.setParent(parent);
        } else {
            category.setParent(null);
        }

        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    public CategoryResponse toggleStatus(Long id) {
        Category category = getActiveOrThrow(id);
        CategoryStatus newStatus = category.getStatus() == CategoryStatus.ACTIVE
                ? CategoryStatus.INACTIVE
                : CategoryStatus.ACTIVE;
        category.setStatus(newStatus);
        return categoryMapper.toSimpleResponse(categoryRepository.save(category));
    }

    public CategoryResponse move(Long id, Long newParentId) {
        Category category = getActiveOrThrow(id);

        if (newParentId == null) {
            category.setParent(null);
        } else {
            if (newParentId.equals(id)) {
                throw new BadRequestException("Kategoriya o'zining parenti bo'la olmaydi");
            }
            if (isDescendant(id, newParentId)) {
                throw new BadRequestException("Kategoriyani o'z avlodiga ko'chirib bo'lmaydi");
            }
            Category newParent = getActiveOrThrow(newParentId);
            if (getDepth(newParent) >= MAX_DEPTH - 1) {
                throw new BadRequestException("Maksimal daraja (%d) dan oshib ketdi".formatted(MAX_DEPTH));
            }
            category.setParent(newParent);
        }

        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    public void reorder(List<CategoryReorderRequest> requests) {
        requests.forEach(req -> {
            Category category = getActiveOrThrow(req.getId());
            category.setPosition(req.getPosition());
            categoryRepository.save(category);
        });
    }

    public void delete(Long id) {
        Category category = getActiveOrThrow(id);
        softDeleteChildren(category);
        category.setIsDeleted(true);
        category.setDeletedAt(LocalDateTime.now());
        categoryRepository.save(category);
    }

    private Category getActiveOrThrow(Long id) {
        return categoryRepository.findActiveById(id)
                .orElseThrow(() -> new NotFoundException("Kategoriya topilmadi: " + id));
    }

    private int getDepth(Category category) {
        int depth = 0;
        Category current = category;
        while (current.getParent() != null) {
            depth++;
            current = current.getParent();
            if (depth > 10) break;
        }
        return depth;
    }

    private boolean isDescendant(Long ancestorId, Long checkId) {
        Category current = categoryRepository.findActiveById(checkId).orElse(null);
        while (current != null && current.getParent() != null) {
            if (current.getParent().getId().equals(ancestorId)) return true;
            current = current.getParent();
        }
        return false;
    }

    private void softDeleteChildren(Category parent) {
        List<Category> children = categoryRepository.findAllByParentId(parent.getId());
        for (Category child : children) {
            softDeleteChildren(child);
            child.setIsDeleted(true);
            child.setDeletedAt(LocalDateTime.now());
            categoryRepository.save(child);
        }
    }

    private String generateSlug(String name) {
        return name.toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
    }
}