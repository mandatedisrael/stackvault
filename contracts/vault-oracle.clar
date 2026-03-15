;; ============================================================
;; STACKVAULT - vault-oracle.clar
;; On-chain BTC/USD price feed with stale-price guard,
;; authorized updater whitelist, and circuit-breaker deviation check.
;; ============================================================

;; ============================================================
;; CONSTANTS
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED    (err u400))
(define-constant ERR-STALE-PRICE       (err u401))
(define-constant ERR-ZERO-PRICE        (err u402))
(define-constant ERR-NOT-WHITELISTED   (err u403))
(define-constant ERR-DEVIATION-BREAKER (err u404))
(define-constant ERR-NO-PRICE          (err u405))

;; Stale price threshold: 20 blocks (~200 minutes at 10 min/block)
;; On testnet blocks can be faster; keep conservative.
(define-constant STALE-THRESHOLD u20)

;; Circuit-breaker: max allowed price deviation per update = 20% (2000 bps)
(define-constant MAX-DEVIATION-BPS u2000)

;; Price precision: 8 decimal places
;; e.g. BTC = $65,000.00000000 -> stored as u6500000000000
(define-constant PRECISION u100000000)

;; BPS denominator
(define-constant BPS-DENOM u10000)

;; ============================================================
;; DATA VARS
;; ============================================================

;; Latest BTC/USD price (8-decimal scaled)
(define-data-var btc-price uint u0)

;; Block height of last price update
(define-data-var last-updated uint u0)

;; Circuit-breaker: is the oracle halted?
(define-data-var oracle-halted bool false)

;; ============================================================
;; DATA MAPS
;; ============================================================

;; Whitelisted price updaters (trusted feeds / owner)
(define-map price-updaters principal bool)

;; Per-asset price store (for future multi-asset support)
;; Key: asset symbol (string-ascii 12), Value: { price, updated-at }
(define-map asset-prices
  (string-ascii 12)
  { price: uint, updated-at: uint }
)

;; ============================================================
;; READ-ONLY
;; ============================================================

;; Get current BTC/USD price - REVERTS if stale or halted
(define-read-only (get-btc-price)
  (begin
    (asserts! (not (var-get oracle-halted)) ERR-STALE-PRICE)
    (asserts! (> (var-get btc-price) u0) ERR-NO-PRICE)
    (asserts!
      (<= (- block-height (var-get last-updated)) STALE-THRESHOLD)
      ERR-STALE-PRICE
    )
    (ok (var-get btc-price))
  )
)

;; Get price without reverting (for view purposes) - caller must handle none
(define-read-only (try-get-btc-price)
  (if
    (and
      (not (var-get oracle-halted))
      (> (var-get btc-price) u0)
      (<= (- block-height (var-get last-updated)) STALE-THRESHOLD)
    )
    (some (var-get btc-price))
    none
  )
)

;; Check if price is fresh
(define-read-only (is-price-fresh)
  (and
    (not (var-get oracle-halted))
    (> (var-get btc-price) u0)
    (<= (- block-height (var-get last-updated)) STALE-THRESHOLD)
  )
)

;; Blocks since last update
(define-read-only (blocks-since-update)
  (if (is-eq (var-get last-updated) u0)
    u999999
    (- block-height (var-get last-updated))
  )
)

;; Is a given principal a whitelisted updater?
(define-read-only (is-updater (who principal))
  (default-to false (map-get? price-updaters who))
)

;; Get price for a named asset (multi-asset path)
(define-read-only (get-asset-price (symbol (string-ascii 12)))
  (match (map-get? asset-prices symbol)
    entry
      (begin
        (asserts!
          (<= (- block-height (get updated-at entry)) STALE-THRESHOLD)
          ERR-STALE-PRICE
        )
        (ok (get price entry))
      )
    ERR-NO-PRICE
  )
)

;; Oracle halted status
(define-read-only (is-halted)
  (var-get oracle-halted)
)

;; ============================================================
;; PRIVATE HELPERS
;; ============================================================

(define-private (assert-owner)
  (ok (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED))
)

(define-private (assert-updater)
  (ok (asserts!
    (or (is-updater tx-sender) (is-eq tx-sender CONTRACT-OWNER))
    ERR-NOT-WHITELISTED
  ))
)

;; Compute absolute deviation in BPS between old and new price
(define-private (deviation-bps (old-price uint) (new-price uint))
  (let (
    (diff (if (>= new-price old-price)
            (- new-price old-price)
            (- old-price new-price)
          ))
  )
    (if (is-eq old-price u0)
      u0
      (/ (* diff BPS-DENOM) old-price)
    )
  )
)

;; ============================================================
;; PUBLIC FUNCTIONS
;; ============================================================

;; -----------------------------------------------------------
;; UPDATE BTC PRICE
;; Only whitelisted updaters may call this.
;; Circuit-breaker: reverts if deviation > MAX-DEVIATION-BPS.
;; On first update (price = 0) skip deviation check.
;; -----------------------------------------------------------
(define-public (update-btc-price (new-price uint))
  (begin
    (try! (assert-updater))
    (asserts! (> new-price u0) ERR-ZERO-PRICE)

    (let ((old-price (var-get btc-price)))
      ;; Circuit-breaker: skip on first update
      (if (> old-price u0)
        (asserts!
          (<= (deviation-bps old-price new-price) MAX-DEVIATION-BPS)
          ERR-DEVIATION-BREAKER
        )
        true
      )

      (var-set btc-price new-price)
      (var-set last-updated block-height)

      (print {
        event: "price-updated",
        asset: "BTC/USD",
        price: new-price,
        block: block-height,
        updater: tx-sender
      })

      (ok new-price)
    )
  )
)

;; Update price for a named asset (multi-asset support)
(define-public (update-asset-price
  (symbol (string-ascii 12))
  (new-price uint)
)
  (begin
    (try! (assert-updater))
    (asserts! (> new-price u0) ERR-ZERO-PRICE)
    (map-set asset-prices symbol { price: new-price, updated-at: block-height })
    (print {
      event: "asset-price-updated",
      symbol: symbol,
      price: new-price,
      block: block-height
    })
    (ok new-price)
  )
)

;; -----------------------------------------------------------
;; WHITELIST MANAGEMENT (owner only)
;; -----------------------------------------------------------

(define-public (add-updater (who principal))
  (begin
    (try! (assert-owner))
    (map-set price-updaters who true)
    (print { event: "updater-added", updater: who })
    (ok true)
  )
)

(define-public (remove-updater (who principal))
  (begin
    (try! (assert-owner))
    (map-delete price-updaters who)
    (print { event: "updater-removed", updater: who })
    (ok true)
  )
)

;; -----------------------------------------------------------
;; CIRCUIT BREAKER (owner only)
;; -----------------------------------------------------------

(define-public (halt-oracle)
  (begin
    (try! (assert-owner))
    (var-set oracle-halted true)
    (print { event: "oracle-halted", block: block-height })
    (ok true)
  )
)

(define-public (resume-oracle)
  (begin
    (try! (assert-owner))
    (var-set oracle-halted false)
    (print { event: "oracle-resumed", block: block-height })
    (ok true)
  )
)
