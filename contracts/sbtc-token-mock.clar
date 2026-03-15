;; STACKVAULT - sbtc-token-mock.clar
;; Minimal SIP-010 mock for testing. Not for production.

(define-fungible-token sbtc-token)

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INSUFFICIENT-BALANCE (err u1))

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

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (ft-mint? sbtc-token amount recipient)
  )
)
