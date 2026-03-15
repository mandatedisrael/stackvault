;; STACKVAULT - vault-timelock.clar
;; All sensitive parameter changes must be queued here first.
;; After the delay passes, the owner may execute them.

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-AUTHORIZED   (err u500))
(define-constant ERR-NOT-QUEUED       (err u501))
(define-constant ERR-NOT-READY        (err u502))
(define-constant ERR-ALREADY-QUEUED   (err u503))
(define-constant ERR-ALREADY-EXECUTED (err u504))
(define-constant ERR-EXPIRED          (err u505))
(define-constant ERR-ZERO-DELAY       (err u506))
(define-constant ERR-DELAY-TOO-SHORT  (err u507))

(define-constant MIN-DELAY u144)
(define-constant MAX-DELAY u2016)
(define-constant GRACE-PERIOD u144)

(define-data-var default-delay uint MIN-DELAY)
(define-data-var op-nonce uint u0)

(define-map operations
  uint
  {
    action: (string-ascii 64),
    target: principal,
    value: uint,
    queued-at: uint,
    ready-at: uint,
    executed: bool,
    cancelled: bool,
    proposer: principal
  }
)

(define-map pending-op-by-action-target
  { action: (string-ascii 64), target: principal }
  uint
)

;; Read-only

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

(define-read-only (get-pending-op-id (action (string-ascii 64)) (target principal))
  (map-get? pending-op-by-action-target { action: action, target: target })
)

(define-read-only (get-default-delay)
  (var-get default-delay)
)

;; Private helpers

(define-private (assert-owner)
  (ok (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED))
)

;; Public functions

(define-public (queue
  (action (string-ascii 64))
  (target principal)
  (value uint)
  (delay uint)
)
  (begin
    (try! (assert-owner))

    (let (
      (actual-delay (if (is-eq delay u0) (var-get default-delay) delay))
    )
      (asserts! (>= actual-delay MIN-DELAY) ERR-DELAY-TOO-SHORT)
      (asserts! (<= actual-delay MAX-DELAY) ERR-DELAY-TOO-SHORT)
      (asserts!
        (is-none (map-get? pending-op-by-action-target { action: action, target: target }))
        ERR-ALREADY-QUEUED
      )

      (let ((op-id (var-get op-nonce)))
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

(define-public (execute (op-id uint))
  (begin
    (try! (assert-owner))
    (match (map-get? operations op-id)
      op
        (begin
          (asserts! (not (get executed op)) ERR-ALREADY-EXECUTED)
          (asserts! (not (get cancelled op)) ERR-NOT-QUEUED)
          (asserts! (>= block-height (get ready-at op)) ERR-NOT-READY)
          (asserts!
            (< block-height (+ (get ready-at op) GRACE-PERIOD))
            ERR-EXPIRED
          )

          (map-set operations op-id (merge op { executed: true }))
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

(define-public (cancel (op-id uint))
  (begin
    (try! (assert-owner))
    (match (map-get? operations op-id)
      op
        (begin
          (asserts! (not (get executed op)) ERR-ALREADY-EXECUTED)
          (asserts! (not (get cancelled op)) ERR-NOT-QUEUED)

          (map-set operations op-id (merge op { cancelled: true }))
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
