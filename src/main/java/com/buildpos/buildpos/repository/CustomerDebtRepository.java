package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.CustomerDebt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface CustomerDebtRepository extends JpaRepository<CustomerDebt, Long> {

    List<CustomerDebt> findAllByCustomerIdAndIsPaidFalse(Long customerId);

    Optional<CustomerDebt> findBySaleId(Long saleId);

    @Query("""
        SELECT COALESCE(SUM(cd.amount - cd.paidAmount), 0)
        FROM CustomerDebt cd
        WHERE cd.customer.id = :customerId AND cd.isPaid = false
    """)
    BigDecimal getTotalDebtByCustomerId(@Param("customerId") Long customerId);
}