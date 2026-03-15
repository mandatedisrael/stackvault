;; ============================================================
;; STACKVAULT - vault-timelock.clar
;; All sensitive parameter changes must be queued here first.
;; After the delay passes, the owner may execute them.
;; Prevents flash-governance attacks.
;; ============================================================

;; ============================================================
;; CONSTANTS
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED   (err u500))
(define-constant ERR-NOT-QUEUED       (err u501))
(define-constant ERR-NOT-READY        (err u502))
(define-constant ERR-ALREADY-QUEUED   (err u503))
(define-constant ERR-ALREADY-EXECUTED (err u504))
(define-constant ERR-EXPIRED          (err u505))
(define-constant ERR-ZERO-DELAY       (err u506))
(define-constant ERR-DELAY-TOO-SHORT  (err u507))

;; Minimum delay: ~24 hours (144 blocks at ~10 min/block)
(define-constant MIN-DELAY u144)

;; Maximum delay: ~14 days (2016 blocks)
(define-constant MAX-DELAY u2016)

;; Grace period: how long after ready-at can an operation be executed
;; before it expires. ~1 day = 144 blocks.
(define-constant GRACE-PERIOD u144)

;; ============================================================
;; DATA VARS
;; ============================================================

;; Default delay used when queueing if caller passes u0
(define-data-var default-delay uint MIN-DELAY)

;; Nonce for unique operation IDs
(define-data-var op-nonce uint u0)

;; ============================================================
;; DATA MAPS
;; ============================================================

;; Timelock operations
(define-map operations
  uint  ;; operation-id
  {
    action: (string-ascii 64),     ;; e.g. "set-fee-bps", "set-paused"
    target: principal,             ;; contract or principal being changed
    value: uint,                   ;; new parameter value
    queued-at: uint,               ;; block height when queued
    ready-at: uint,                ;; queued-at + delay
    executed: bool,
    cancelled: bool,
    proposer: principal
  }
)

;; Index by action+target for deduplication (prevent double-queue)
;; key: hash of (action, target, value) represented as (string-ascii 64)
;; We use a simple (action, target) pair since only one pending op
;; per action+target is allowed at a time.
(define-map pending-op-by-action-target
  { action: (string-ascii 64), target: principal }
  uint  ;; operation-id
)

;; ============================================================
;; READ-ONLY
;; ============================================================

(define-read-only (get-operation (op-id uint))
  (map-get? operations op-id)
)

(define-read-only (is-ready (op-id uint))
  (match (map-get? operations op-id)
    op
      (and
        (not (get executed op))
        (not (get cancelled op))
        (>= block-height (get ready-at op))
        (< block-height (+ (get ready-at op) GRACE-PERIOD))
      )
    false
  )
)

(define-read-only (is-expired (op-id uint))
  (match (map-get? operations op-id)
    op (>= block-height (+ (get ready-at op) GRACE-PERIOD))
    false
  )
)

(define-read-only (blocks-until-ready (op-id uint))
  (match (map-get? operations op-id)
    op
      (if (>= block-height (get ready-at op))
        u0
        (- (get ready-at op) block-height)
      )
    u0
  )
)

(define-read-only (get-pending-op-id
  (action (string-ascii 64))
  (target principal)
)
  (map-get? pending-op-by-action-target { action: action, target: target })
)

(define-read-only (get-default-delay)
  (var-get default-delay)
)

;; ============================================================
;; PRIVATE HELPERS
;; ============================================================

(define-private (assert-owner)
  (ok (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED))
)

;; ============================================================
;; PUBLIC FUNCTIONS
;; ============================================================

;; -----------------------------------------------------------
;; QUEUE an operation
;; delay = 0 -> use default-delay
;; -----------------------------------------------------------
(define-public (queue
  (action (string-ascii 64))
  (target principal)
  (value uint)
  (delay uint)
)
  (begin
    (try! (assert-owner))

    ;; Resolve actual delay
    (let (
      (actual-delay (if (is-eq delay u0) (var-get default-delay) delay))
    )
      ;; Validate delay bounds
      (asserts! (>= actual-delay MIN-DELAY) ERR-DELAY-TOO-SHORT)
      (asserts! (<= actual-delay MAX-DELAY) ERR-DELAY-TOO-SHORT)

      ;; No duplicate pending op for same action+target
      (asserts!
        (is-none (map-get? pending-op-by-action-target { action: action, target: target }))
        ERR-ALREADY-QUEUED
      )

      (let ((op-id (var-get op-nonce)))
        ;; Store operation
        (map-set operations op-id {
          action: action,
          target: target,
          value: value,
          queued-at: block-height,
          ready-at: (+ block-height actual-delay),
          executed: false,
          cancelled: false,
          proposer: tx-sender
        })
        ;; Track pending
        (map-set pending-op-by-action-target
          { action: action, target: target }
          op-id
        )
        (var-set op-nonce (+ op-id u1))

        (print {
          event: "operation-queued",
          op-id: op-id,
          action: action,
          target: target,
          value: value,
          ready-at: (+ block-height actual-delay)
        })

        (ok op-id)
      )
    )
  )
)

;; -----------------------------------------------------------
;; EXECUTE a matured operation
;; Returns the operation data for the caller to act on.
;; The caller (vault-aggregator or owner script) reads action/value
;; and calls the appropriate setter.
;; -----------------------------------------------------------
(define-public (execute (op-id uint))
  (begin
    (try! (assert-owner))
    (match (map-get? operations op-id)
      op
        (begin
          (asserts! (not (get executed op)) ERR-ALREADY-EXECUTED)
          (asserts! (not (get cancelled op)) ERR-NOT-QUEUED)
          ;; Must be past ready-at
          (asserts! (>= block-height (get ready-at op)) ERR-NOT-READY)
          ;; Must not have expired past grace period
          (asserts!
            (< block-height (+ (get ready-at op) GRACE-PERIOD))
            ERR-EXPIRED
          )

          ;; Mark executed
          (map-set operations op-id (merge op { executed: true }))

          ;; Clear pending index
          (map-delete pending-op-by-action-target
            { action: (get action op), target: (get target op) }
          )

          (print {
            event: "operation-executed",
            op-id: op-id,
            action: (get action op),
            target: (get target op),
            value: (get value op),
            block: block-height
          })

          (ok op)
        )
      ERR-NOT-QUEUED
    )
  )
)

;; -----------------------------------------------------------
;; CANCEL a queued operation (before execution)
;; -----------------------------------------------------------
(define-public (cancel (op-id uint))
  (begin
    (try! (assert-owner))
    (match (map-get? operations op-id)
      op
        (begin
          (asserts! (not (get executed op)) ERR-ALREADY-EXECUTED)
          (asserts! (not (get cancelled op)) ERR-NOT-QUEUED)

          (map-set operations op-id (merge op { cancelled: true }))

          ;; Clear pending index
          (map-delete pending-op-by-action-target
            { action: (get action op), target: (get target op) }
          )

          (print {
            event: "operation-cancelled",
            op-id: op-id,
            action: (get action op)
          })

          (ok true)
        )
      ERR-NOT-QUEUED
    )
  )
)

;; -----------------------------------------------------------
;; ADMIN: update default delay (itself subject to a timelock queue
;; in production - here owner can set directly for bootstrap)
;; -----------------------------------------------------------
(define-public (set-default-delay (new-delay uint))
  (begin
    (try! (assert-owner))
    (asserts! (>= new-delay MIN-DELAY) ERR-DELAY-TOO-SHORT)
    (asserts! (<= new-delay MAX-DELAY) ERR-DELAY-TOO-SHORT)
    (var-set default-delay new-delay)
    (print { event: "default-delay-updated", delay: new-delay })
    (ok new-delay)
  )
)
