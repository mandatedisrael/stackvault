;; STACKVAULT - vault-dao.clar
;; Role-based access control: owner, admins (3-of-5 multisig),
;; guardian (instant pause), operator (yield harvester)

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-AUTHORIZED     (err u200))
(define-constant ERR-ALREADY-MEMBER     (err u201))
(define-constant ERR-NOT-MEMBER         (err u202))
(define-constant ERR-QUORUM-NOT-MET     (err u203))
(define-constant ERR-PROPOSAL-EXPIRED   (err u204))
(define-constant ERR-PROPOSAL-EXECUTED  (err u205))
(define-constant ERR-INVALID-QUORUM     (err u206))
(define-constant ERR-MAX-ADMINS         (err u207))
(define-constant ERR-ZERO-ADDRESS       (err u208))

(define-constant MAX-ADMINS u5)
(define-constant MIN-QUORUM u3)
(define-constant PROPOSAL-TTL u576)

(define-data-var required-quorum uint MIN-QUORUM)
(define-data-var admin-count uint u0)
(define-data-var proposal-nonce uint u0)

(define-map admins principal bool)
(define-map guardians principal bool)
(define-map operators principal bool)

(define-map proposals
  uint
  {
    action: (string-ascii 64),
    target: principal,
    value: uint,
    proposer: principal,
    created-at: uint,
    executed: bool,
    approvals: uint
  }
)

(define-map proposal-approvals
  { proposal-id: uint, admin: principal }
  bool
)

;; Read-only

(define-read-only (is-admin (who principal))
  (default-to false (map-get? admins who))
)

(define-read-only (is-guardian (who principal))
  (default-to false (map-get? guardians who))
)

(define-read-only (is-operator (who principal))
  (default-to false (map-get? operators who))
)

(define-read-only (get-proposal (proposal-id uint))
  (map-get? proposals proposal-id)
)

(define-read-only (has-approved (proposal-id uint) (admin principal))
  (default-to false (map-get? proposal-approvals { proposal-id: proposal-id, admin: admin }))
)

(define-read-only (get-quorum)
  (var-get required-quorum)
)

(define-read-only (get-admin-count)
  (var-get admin-count)
)

;; Private helpers

(define-private (assert-owner)
  (ok (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED))
)

(define-private (assert-admin)
  (ok (asserts! (is-admin tx-sender) ERR-NOT-AUTHORIZED))
)

(define-private (assert-guardian-or-owner)
  (ok (asserts!
    (or (is-guardian tx-sender) (is-eq tx-sender CONTRACT-OWNER))
    ERR-NOT-AUTHORIZED
  ))
)

;; Owner bootstrap

(define-public (add-admin (who principal))
  (begin
    (try! (assert-owner))
    (asserts! (not (is-admin who)) ERR-ALREADY-MEMBER)
    (asserts! (< (var-get admin-count) MAX-ADMINS) ERR-MAX-ADMINS)
    (map-set admins who true)
    (var-set admin-count (+ (var-get admin-count) u1))
    (print { event: "admin-added", admin: who })
    (ok true)
  )
)

(define-public (remove-admin (who principal))
  (begin
    (try! (assert-owner))
    (asserts! (is-admin who) ERR-NOT-MEMBER)
    (map-delete admins who)
    (var-set admin-count (- (var-get admin-count) u1))
    (print { event: "admin-removed", admin: who })
    (ok true)
  )
)

(define-public (set-guardian (who principal) (enabled bool))
  (begin
    (try! (assert-owner))
    (if enabled
      (map-set guardians who true)
      (map-delete guardians who)
    )
    (print { event: "guardian-updated", guardian: who, enabled: enabled })
    (ok true)
  )
)

(define-public (set-operator (who principal) (enabled bool))
  (begin
    (try! (assert-owner))
    (if enabled
      (map-set operators who true)
      (map-delete operators who)
    )
    (print { event: "operator-updated", operator: who, enabled: enabled })
    (ok true)
  )
)

;; Multisig proposals

(define-public (propose
  (action (string-ascii 64))
  (target principal)
  (value uint)
)
  (begin
    (try! (assert-admin))
    (let ((id (var-get proposal-nonce)))
      (map-set proposals id {
        action: action,
        target: target,
        value: value,
        proposer: tx-sender,
        created-at: block-height,
        executed: false,
        approvals: u1
      })
      (map-set proposal-approvals { proposal-id: id, admin: tx-sender } true)
      (var-set proposal-nonce (+ id u1))
      (print {
        event: "proposal-created",
        proposal-id: id,
        action: action,
        target: target,
        value: value,
        proposer: tx-sender
      })
      (ok id)
    )
  )
)

(define-public (approve (proposal-id uint))
  (begin
    (try! (assert-admin))
    (match (map-get? proposals proposal-id)
      proposal
        (begin
          (asserts! (not (get executed proposal)) ERR-PROPOSAL-EXECUTED)
          (asserts!
            (<= block-height (+ (get created-at proposal) PROPOSAL-TTL))
            ERR-PROPOSAL-EXPIRED
          )
          (asserts!
            (not (has-approved proposal-id tx-sender))
            ERR-ALREADY-MEMBER
          )
          (map-set proposal-approvals { proposal-id: proposal-id, admin: tx-sender } true)
          (map-set proposals proposal-id
            (merge proposal { approvals: (+ (get approvals proposal) u1) })
          )
          (print {
            event: "proposal-approved",
            proposal-id: proposal-id,
            approver: tx-sender,
            approvals: (+ (get approvals proposal) u1)
          })
          (ok (+ (get approvals proposal) u1))
        )
      ERR-NOT-MEMBER
    )
  )
)

(define-public (execute (proposal-id uint))
  (begin
    (try! (assert-admin))
    (match (map-get? proposals proposal-id)
      proposal
        (begin
          (asserts! (not (get executed proposal)) ERR-PROPOSAL-EXECUTED)
          (asserts!
            (<= block-height (+ (get created-at proposal) PROPOSAL-TTL))
            ERR-PROPOSAL-EXPIRED
          )
          (asserts! (>= (get approvals proposal) (var-get required-quorum)) ERR-QUORUM-NOT-MET)
          (map-set proposals proposal-id (merge proposal { executed: true }))
          (print {
            event: "proposal-executed",
            proposal-id: proposal-id,
            action: (get action proposal),
            target: (get target proposal),
            value: (get value proposal)
          })
          (ok proposal)
        )
      ERR-NOT-MEMBER
    )
  )
)

;; Guardian emergency

(define-public (emergency-pause-signal)
  (begin
    (try! (assert-guardian-or-owner))
    (print { event: "emergency-pause-signal", caller: tx-sender, block: block-height })
    (ok true)
  )
)

;; Quorum management

(define-public (set-quorum (q uint))
  (begin
    (try! (assert-owner))
    (asserts! (and (>= q MIN-QUORUM) (<= q (var-get admin-count))) ERR-INVALID-QUORUM)
    (var-set required-quorum q)
    (print { event: "quorum-updated", quorum: q })
    (ok q)
  )
)
