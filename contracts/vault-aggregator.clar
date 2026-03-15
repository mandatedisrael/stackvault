;; STACKVAULT - vault-aggregator.clar
;; Core deposit, withdrawal, and share accounting

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-AUTHORIZED        (err u100))
(define-constant ERR-PAUSED                (err u101))
(define-constant ERR-ZERO-AMOUNT           (err u102))
(define-constant ERR-INSUFFICIENT-BALANCE  (err u103))
(define-constant ERR-TVL-CAP-EXCEEDED      (err u104))
(define-constant ERR-USER-CAP-EXCEEDED     (err u105))
(define-constant ERR-INVALID-SHARES        (err u106))
(define-constant ERR-FIRST-DEPOSIT         (err u108))
(define-constant ERR-SLIPPAGE              (err u109))

(define-constant PRECISION u100000000)
(define-constant TVL-CAP u50000000000)
(define-constant USER-CAP u1000000000)
(define-constant MIN-FIRST-DEPOSIT u100000)

(define-data-var whitelisted-token principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token)

;; StackingDAO / Zest placeholders (mainnet only)
(define-constant STACKINGDAO-CORE 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stacking-dao-core-v1)
(define-constant ZEST-POOL 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.zest-reward-dist)

(define-data-var vault-paused bool false)
(define-data-var total-assets uint u0)
(define-data-var total-shares uint u0)
(define-data-var total-yield-harvested uint u0)
(define-data-var protocol-fee-bps uint u50)
(define-data-var fee-recipient principal CONTRACT-OWNER)

(define-map user-shares principal uint)
(define-map user-deposited principal uint)

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

;; Read-only functions

(define-read-only (get-shares (user principal))
  (default-to u0 (map-get? user-shares user))
)

(define-read-only (get-total-assets)
  (var-get total-assets)
)

(define-read-only (get-total-shares)
  (var-get total-shares)
)

(define-read-only (assets-to-shares (assets uint))
  (let (
    (ts (var-get total-shares))
    (ta (var-get total-assets))
  )
    (if (or (is-eq ts u0) (is-eq ta u0))
      assets
      (/ (* assets ts) ta)
    )
  )
)

(define-read-only (shares-to-assets (shares uint))
  (let (
    (ts (var-get total-shares))
    (ta (var-get total-assets))
  )
    (if (is-eq ts u0)
      u0
      (/ (* shares ta) ts)
    )
  )
)

(define-read-only (get-share-price)
  (let (
    (ts (var-get total-shares))
    (ta (var-get total-assets))
  )
    (if (is-eq ts u0)
      PRECISION
      (/ (* ta PRECISION) ts)
    )
  )
)

(define-read-only (is-paused)
  (var-get vault-paused)
)

(define-read-only (get-position (user principal))
  (let (
    (shares (get-shares user))
    (assets (shares-to-assets shares))
    (deposited (default-to u0 (map-get? user-deposited user)))
  )
    {
      shares: shares,
      asset-value: assets,
      deposited: deposited,
      share-price: (get-share-price)
    }
  )
)

;; Private helpers

(define-private (assert-not-paused)
  (ok (asserts! (not (var-get vault-paused)) ERR-PAUSED))
)

(define-private (assert-owner)
  (ok (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED))
)

(define-private (apply-fee (amount uint))
  (let (
    (fee (/ (* amount (var-get protocol-fee-bps)) u10000))
    (net (- amount fee))
  )
    net
  )
)

;; Public functions

(define-public (deposit
  (amount uint)
  (min-shares uint)
  (token <sip010-trait>)
)
  (begin
    (asserts! (is-eq (contract-of token) (var-get whitelisted-token)) ERR-NOT-AUTHORIZED)
    (try! (assert-not-paused))
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (<= (+ (var-get total-assets) amount) TVL-CAP) ERR-TVL-CAP-EXCEEDED)

    (let (
      (user-total (+ (default-to u0 (map-get? user-deposited tx-sender)) amount))
    )
      (asserts! (<= user-total USER-CAP) ERR-USER-CAP-EXCEEDED)
      (asserts!
        (or (> (var-get total-shares) u0) (>= amount MIN-FIRST-DEPOSIT))
        ERR-FIRST-DEPOSIT
      )

      (let (
        (shares-to-mint (assets-to-shares amount))
      )
        (asserts! (>= shares-to-mint min-shares) ERR-SLIPPAGE)

        (map-set user-shares tx-sender (+ (get-shares tx-sender) shares-to-mint))
        (map-set user-deposited tx-sender user-total)
        (var-set total-assets (+ (var-get total-assets) amount))
        (var-set total-shares (+ (var-get total-shares) shares-to-mint))

        (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))

        (print {
          event: "deposit",
          user: tx-sender,
          amount: amount,
          shares-minted: shares-to-mint,
          total-assets: (var-get total-assets),
          total-shares: (var-get total-shares)
        })

        (ok shares-to-mint)
      )
    )
  )
)

(define-public (withdraw
  (shares uint)
  (min-assets uint)
  (token <sip010-trait>)
)
  (begin
    (asserts! (is-eq (contract-of token) (var-get whitelisted-token)) ERR-NOT-AUTHORIZED)
    (try! (assert-not-paused))
    (asserts! (> shares u0) ERR-ZERO-AMOUNT)

    (let (
      (user-share-balance (get-shares tx-sender))
    )
      (asserts! (>= user-share-balance shares) ERR-INSUFFICIENT-BALANCE)

      (let (
        (gross-assets (shares-to-assets shares))
        (net-assets (apply-fee gross-assets))
        (fee-amount (- gross-assets net-assets))
      )
        (asserts! (>= net-assets min-assets) ERR-SLIPPAGE)

        (let ((user tx-sender))
          (map-set user-shares user (- user-share-balance shares))
          (var-set total-shares (- (var-get total-shares) shares))
          (var-set total-assets (- (var-get total-assets) gross-assets))

          (try! (as-contract (contract-call? token transfer
            net-assets
            tx-sender
            user
            none
          )))

          (if (> fee-amount u0)
            (try! (as-contract (contract-call? token transfer
              fee-amount
              tx-sender
              (var-get fee-recipient)
              none
            )))
            true
          )

          (print {
            event: "withdraw",
            user: user,
            shares-burned: shares,
            assets-returned: net-assets,
            fee: fee-amount,
            total-assets: (var-get total-assets),
            total-shares: (var-get total-shares)
          })

          (ok net-assets)
        )
      )
    )
  )
)

(define-public (harvest-yield (yield-amount uint))
  (begin
    (try! (assert-owner))
    (try! (assert-not-paused))
    (asserts! (> yield-amount u0) ERR-ZERO-AMOUNT)

    (var-set total-assets (+ (var-get total-assets) yield-amount))
    (var-set total-yield-harvested (+ (var-get total-yield-harvested) yield-amount))

    (print {
      event: "harvest",
      yield-amount: yield-amount,
      new-total-assets: (var-get total-assets),
      share-price: (get-share-price)
    })

    (ok yield-amount)
  )
)

;; Admin functions

(define-public (set-paused (paused bool))
  (begin
    (try! (assert-owner))
    (var-set vault-paused paused)
    (print { event: "pause-changed", paused: paused })
    (ok paused)
  )
)

(define-public (set-fee-bps (bps uint))
  (begin
    (try! (assert-owner))
    (asserts! (<= bps u500) ERR-NOT-AUTHORIZED)
    (var-set protocol-fee-bps bps)
    (print { event: "fee-updated", fee-bps: bps })
    (ok bps)
  )
)

(define-public (set-fee-recipient (recipient principal))
  (begin
    (try! (assert-owner))
    (var-set fee-recipient recipient)
    (ok recipient)
  )
)

(define-public (set-whitelisted-token (token principal))
  (begin
    (try! (assert-owner))
    (var-set whitelisted-token token)
    (print { event: "whitelisted-token-updated", token: token })
    (ok token)
  )
)

(define-read-only (get-whitelisted-token)
  (var-get whitelisted-token)
)
