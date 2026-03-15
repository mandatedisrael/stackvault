;; STACKVAULT - dex-mock.clar
;; Mock DEX for swapping USDCx <-> sBTC using vault-oracle BTC price.
;; Owner pre-funds with liquidity. Not for production.

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u800))
(define-constant ERR-ZERO-AMOUNT (err u801))
(define-constant ERR-PAUSED (err u802))
(define-constant ERR-INSUFFICIENT-LIQUIDITY (err u803))
(define-constant ERR-SLIPPAGE (err u804))
(define-constant ERR-ORACLE-FAIL (err u805))

(define-constant PRECISION u100000000)

(define-data-var paused bool false)

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

;; Read-only: calculate how much sBTC you get for a given USDCx amount
;; usdcx has 6 decimals, sBTC has 8 decimals
;; btc-price is 8-decimal scaled USD (e.g., $85000 = 8_500_000_000_000)
;; sbtc-out = (usdcx-amount * 100 * PRECISION) / btc-price
(define-read-only (get-sbtc-for-usdcx (usdcx-amount uint) (btc-price uint))
  (/ (* (* usdcx-amount u100) PRECISION) btc-price)
)

;; Read-only: calculate how much USDCx you get for a given sBTC amount
;; usdcx-out = (sbtc-amount * btc-price) / (PRECISION * 100)
(define-read-only (get-usdcx-for-sbtc (sbtc-amount uint) (btc-price uint))
  (/ (* sbtc-amount btc-price) (* PRECISION u100))
)

;; Public: swap USDCx -> sBTC
;; Caller sends USDCx, receives sBTC from the DEX pool
(define-public (swap-usdcx-to-sbtc
  (usdcx-amount uint)
  (min-sbtc-out uint)
  (usdcx-token <sip010-trait>)
  (sbtc-token <sip010-trait>)
)
  (begin
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (> usdcx-amount u0) ERR-ZERO-AMOUNT)

    (let (
      (btc-price (unwrap! (contract-call? .vault-oracle get-btc-price) ERR-ORACLE-FAIL))
      (sbtc-out (get-sbtc-for-usdcx usdcx-amount btc-price))
      (caller tx-sender)
    )
      (asserts! (>= sbtc-out min-sbtc-out) ERR-SLIPPAGE)

      ;; Transfer USDCx from caller to DEX
      (try! (contract-call? usdcx-token transfer usdcx-amount caller (as-contract tx-sender) none))

      ;; Transfer sBTC from DEX to caller
      (try! (as-contract (contract-call? sbtc-token transfer sbtc-out tx-sender caller none)))

      (print {
        event: "dex-swap",
        direction: "usdcx-to-sbtc",
        usdcx-in: usdcx-amount,
        sbtc-out: sbtc-out,
        btc-price: btc-price,
        user: caller
      })

      (ok sbtc-out)
    )
  )
)

;; Public: swap sBTC -> USDCx
;; Caller sends sBTC, receives USDCx from the DEX pool
(define-public (swap-sbtc-to-usdcx
  (sbtc-amount uint)
  (min-usdcx-out uint)
  (sbtc-token <sip010-trait>)
  (usdcx-token <sip010-trait>)
)
  (begin
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (> sbtc-amount u0) ERR-ZERO-AMOUNT)

    (let (
      (btc-price (unwrap! (contract-call? .vault-oracle get-btc-price) ERR-ORACLE-FAIL))
      (usdcx-out (get-usdcx-for-sbtc sbtc-amount btc-price))
      (caller tx-sender)
    )
      (asserts! (>= usdcx-out min-usdcx-out) ERR-SLIPPAGE)

      ;; Transfer sBTC from caller to DEX
      (try! (contract-call? sbtc-token transfer sbtc-amount caller (as-contract tx-sender) none))

      ;; Transfer USDCx from DEX to caller
      (try! (as-contract (contract-call? usdcx-token transfer usdcx-out tx-sender caller none)))

      (print {
        event: "dex-swap",
        direction: "sbtc-to-usdcx",
        sbtc-in: sbtc-amount,
        usdcx-out: usdcx-out,
        btc-price: btc-price,
        user: caller
      })

      (ok usdcx-out)
    )
  )
)

;; Admin: add sBTC liquidity to the DEX pool
(define-public (add-sbtc-liquidity (amount uint) (sbtc-token <sip010-trait>))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? sbtc-token transfer amount tx-sender (as-contract tx-sender) none))
    (print { event: "dex-add-liquidity", asset: "sbtc", amount: amount })
    (ok true)
  )
)

;; Admin: add USDCx liquidity to the DEX pool
(define-public (add-usdcx-liquidity (amount uint) (usdcx-token <sip010-trait>))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? usdcx-token transfer amount tx-sender (as-contract tx-sender) none))
    (print { event: "dex-add-liquidity", asset: "usdcx", amount: amount })
    (ok true)
  )
)

(define-public (set-paused (new-paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set paused new-paused)
    (ok new-paused)
  )
)
