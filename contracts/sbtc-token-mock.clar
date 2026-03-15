;; ============================================================
;; STACKVAULT - sbtc-token-mock.clar
;; Minimal SIP-010 mock for local Clarinet testing.
;; NOT for production. Maps to SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sbtc-token
;; on mainnet.
;; ============================================================

(define-fungible-token sbtc-token)

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INSUFFICIENT-BALANCE (err u1))

;; SIP-010 transfer
(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34)))
)
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (ft-transfer? sbtc-token amount sender recipient)
  )
)

(define-read-only (get-name) (ok "Synthetic Bitcoin"))
(define-read-only (get-symbol) (ok "sBTC"))
(define-read-only (get-decimals) (ok u8))
(define-read-only (get-token-uri) (ok (some u"https://token.stacks.co")))
(define-read-only (get-total-supply) (ok (ft-get-supply sbtc-token)))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance sbtc-token who)))

;; Faucet for testing
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (ft-mint? sbtc-token amount recipient)
  )
)
