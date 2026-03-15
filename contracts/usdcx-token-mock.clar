;; STACKVAULT - usdcx-token-mock.clar
;; Mock SIP-010 USDCx stablecoin for testing. Not for production.

(define-fungible-token usdcx-token)

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))

(define-map authorized-minters principal bool)

(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34)))
)
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (ft-transfer? usdcx-token amount sender recipient)
  )
)

(define-read-only (get-name) (ok "USD Coin"))
(define-read-only (get-symbol) (ok "USDCx"))
(define-read-only (get-decimals) (ok u6))
(define-read-only (get-token-uri) (ok (some u"https://circle.com")))
(define-read-only (get-total-supply) (ok (ft-get-supply usdcx-token)))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance usdcx-token who)))

(define-read-only (is-authorized-minter (who principal))
  (or (is-eq who CONTRACT-OWNER) (default-to false (map-get? authorized-minters who)))
)

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-authorized-minter contract-caller) ERR-NOT-AUTHORIZED)
    (ft-mint? usdcx-token amount recipient)
  )
)

(define-public (set-minter (who principal) (enabled bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (map-set authorized-minters who enabled)
    (ok true)
  )
)
