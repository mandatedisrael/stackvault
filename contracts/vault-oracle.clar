;; STACKVAULT - vault-oracle.clar
;; On-chain BTC/USD price feed with stale-price guard,
;; authorized updater whitelist, and circuit-breaker deviation check.

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-AUTHORIZED    (err u400))
(define-constant ERR-STALE-PRICE       (err u401))
(define-constant ERR-ZERO-PRICE        (err u402))
(define-constant ERR-NOT-WHITELISTED   (err u403))
(define-constant ERR-DEVIATION-BREAKER (err u404))
(define-constant ERR-NO-PRICE          (err u405))

(define-constant STALE-THRESHOLD u20)
(define-constant MAX-DEVIATION-BPS u2000)
(define-constant PRECISION u100000000)
(define-constant BPS-DENOM u10000)

(define-data-var btc-price uint u0)
(define-data-var last-updated uint u0)
(define-data-var oracle-halted bool false)

(define-map price-updaters principal bool)

(define-map asset-prices
  (string-ascii 12)
  { price: uint, updated-at: uint }
)

;; Read-only

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

(define-read-only (is-price-fresh)
  (and
    (not (var-get oracle-halted))
    (> (var-get btc-price) u0)
    (<= (- block-height (var-get last-updated)) STALE-THRESHOLD)
  )
)

(define-read-only (blocks-since-update)
  (if (is-eq (var-get last-updated) u0)
    u999999
    (- block-height (var-get last-updated))
  )
)

(define-read-only (is-updater (who principal))
  (default-to false (map-get? price-updaters who))
)

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

(define-read-only (is-halted)
  (var-get oracle-halted)
)

;; Private helpers

(define-private (assert-owner)
  (ok (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED))
)

(define-private (assert-updater)
  (ok (asserts!
    (or (is-updater tx-sender) (is-eq tx-sender CONTRACT-OWNER))
    ERR-NOT-WHITELISTED
  ))
)

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

;; Public functions

(define-public (update-btc-price (new-price uint))
  (begin
    (try! (assert-updater))
    (asserts! (> new-price u0) ERR-ZERO-PRICE)

    (let ((old-price (var-get btc-price)))
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

(define-public (update-asset-price (symbol (string-ascii 12)) (new-price uint))
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

;; Whitelist management

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

;; Circuit breaker

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
