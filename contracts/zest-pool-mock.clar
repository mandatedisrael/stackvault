;; STACKVAULT - zest-pool-mock.clar
;; Dead-simple mock Zest lending pool for demo.
;; Supply stSTX as collateral, borrow USDCx, repay, withdraw. No LTV enforcement.

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u700))
(define-constant ERR-ZERO-AMOUNT (err u701))
(define-constant ERR-INSUFFICIENT-COLLATERAL (err u704))
(define-constant ERR-INSUFFICIENT-DEBT (err u705))

(define-data-var total-collateral uint u0)
(define-data-var total-debt uint u0)

(define-map positions principal { collateral: uint, debt: uint })

(define-trait sip010-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-balance (principal) (response uint uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))
    (get-token-uri () (response (optional (string-utf8 256)) uint))
    (get-total-supply () (response uint uint))
  )
)

(define-read-only (get-position (user principal))
  (default-to { collateral: u0, debt: u0 } (map-get? positions user))
)

(define-read-only (get-total-collateral)
  (var-get total-collateral)
)

(define-read-only (get-total-debt)
  (var-get total-debt)
)

(define-read-only (get-max-borrow (collateral-amount uint))
  collateral-amount
)

;; Supply stSTX as collateral
(define-public (supply-collateral (amount uint) (ststx-token <sip010-trait>))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (let (
      (caller tx-sender)
      (pos (get-position caller))
      (new-collateral (+ (get collateral pos) amount))
    )
      (try! (contract-call? ststx-token transfer amount caller (as-contract tx-sender) none))
      (map-set positions caller { collateral: new-collateral, debt: (get debt pos) })
      (var-set total-collateral (+ (var-get total-collateral) amount))
      (print { event: "zest-supply-collateral", user: caller, amount: amount, total-collateral: new-collateral })
      (ok new-collateral)
    )
  )
)

;; Borrow USDCx - mints to caller, no LTV check
(define-public (borrow (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (let (
      (caller tx-sender)
      (pos (get-position caller))
      (new-debt (+ (get debt pos) amount))
    )
      (try! (contract-call? .usdcx-token-mock mint amount caller))
      (map-set positions caller { collateral: (get collateral pos), debt: new-debt })
      (var-set total-debt (+ (var-get total-debt) amount))
      (print { event: "zest-borrow", user: caller, amount: amount, total-debt: new-debt })
      (ok new-debt)
    )
  )
)

;; Repay USDCx debt
(define-public (repay (amount uint) (usdcx-token <sip010-trait>))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (let (
      (caller tx-sender)
      (pos (get-position caller))
      (current-debt (get debt pos))
      (repay-amount (if (> amount current-debt) current-debt amount))
    )
      (asserts! (> current-debt u0) ERR-INSUFFICIENT-DEBT)
      (try! (contract-call? usdcx-token transfer repay-amount caller (as-contract tx-sender) none))
      (map-set positions caller { collateral: (get collateral pos), debt: (- current-debt repay-amount) })
      (var-set total-debt (- (var-get total-debt) repay-amount))
      (print { event: "zest-repay", user: caller, amount: repay-amount, remaining-debt: (- current-debt repay-amount) })
      (ok (- current-debt repay-amount))
    )
  )
)

;; Withdraw collateral
(define-public (withdraw-collateral (amount uint) (ststx-token <sip010-trait>))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (let (
      (caller tx-sender)
      (pos (get-position caller))
      (current-collateral (get collateral pos))
    )
      (asserts! (>= current-collateral amount) ERR-INSUFFICIENT-COLLATERAL)
      (try! (as-contract (contract-call? ststx-token transfer amount tx-sender caller none)))
      (map-set positions caller { collateral: (- current-collateral amount), debt: (get debt pos) })
      (var-set total-collateral (- (var-get total-collateral) amount))
      (print { event: "zest-withdraw-collateral", user: caller, amount: amount })
      (ok (- current-collateral amount))
    )
  )
)
