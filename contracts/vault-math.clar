;; STACKVAULT - vault-math.clar
;; Fixed-point math library for share price, LTV, and yield calculations.
;; All values scaled to 8 decimals.

(define-constant PRECISION u100000000)
(define-constant PRECISION-18 u1000000000000000000)
(define-constant BPS-DENOM u10000)
(define-constant MAX-LTV-BPS u7500)
(define-constant LIQUIDATION-THRESHOLD-BPS u8000)

(define-constant ERR-DIVIDE-BY-ZERO  (err u300))
(define-constant ERR-OVERFLOW        (err u301))
(define-constant ERR-LTV-EXCEEDED    (err u302))
(define-constant ERR-INVALID-AMOUNT  (err u303))

;; Fixed-point arithmetic

(define-read-only (fp-mul (a uint) (b uint))
  (ok (/ (* a b) PRECISION))
)

(define-read-only (fp-div (a uint) (b uint))
  (if (is-eq b u0)
    ERR-DIVIDE-BY-ZERO
    (ok (/ (* a PRECISION) b))
  )
)

(define-read-only (fp-add (a uint) (b uint))
  (ok (+ a b))
)

(define-read-only (fp-sub (a uint) (b uint))
  (if (>= a b)
    (ok (- a b))
    ERR-OVERFLOW
  )
)

;; BPS helpers

(define-read-only (apply-bps (amount uint) (bps uint))
  (ok (/ (* amount bps) BPS-DENOM))
)

(define-read-only (ratio-to-bps (numerator uint) (denominator uint))
  (if (is-eq denominator u0)
    ERR-DIVIDE-BY-ZERO
    (ok (/ (* numerator BPS-DENOM) denominator))
  )
)

;; Share price math

(define-read-only (calc-share-price (total-assets uint) (total-shares uint))
  (if (is-eq total-shares u0)
    (ok PRECISION)
    (ok (/ (* total-assets PRECISION) total-shares))
  )
)

(define-read-only (assets-to-shares
  (assets uint)
  (total-assets uint)
  (total-shares uint)
)
  (if (or (is-eq total-shares u0) (is-eq total-assets u0))
    (ok assets)
    (ok (/ (* assets total-shares) total-assets))
  )
)

(define-read-only (shares-to-assets
  (shares uint)
  (total-assets uint)
  (total-shares uint)
)
  (if (is-eq total-shares u0)
    (ok u0)
    (ok (/ (* shares total-assets) total-shares))
  )
)

;; LTV calculations

(define-read-only (calc-ltv-bps (debt uint) (collateral uint))
  (if (is-eq collateral u0)
    (ok u0)
    (ok (/ (* debt BPS-DENOM) collateral))
  )
)

(define-read-only (check-ltv (new-debt uint) (collateral-value uint))
  (if (is-eq collateral-value u0)
    ERR-INVALID-AMOUNT
    (let ((ltv-bps (/ (* new-debt BPS-DENOM) collateral-value)))
      (if (<= ltv-bps MAX-LTV-BPS)
        (ok true)
        ERR-LTV-EXCEEDED
      )
    )
  )
)

(define-read-only (max-borrowable (collateral-value uint) (existing-debt uint))
  (let (
    (max-debt (/ (* collateral-value MAX-LTV-BPS) BPS-DENOM))
  )
    (if (>= max-debt existing-debt)
      (ok (- max-debt existing-debt))
      (ok u0)
    )
  )
)

(define-read-only (is-liquidatable (debt uint) (collateral uint))
  (if (is-eq collateral u0)
    (ok false)
    (ok (>= (/ (* debt BPS-DENOM) collateral) LIQUIDATION-THRESHOLD-BPS))
  )
)

;; Yield math

(define-constant BLOCKS-PER-YEAR u52560)

(define-read-only (calc-yield (principal uint) (apy-bps uint) (blocks uint))
  (ok (/ (* (* principal apy-bps) blocks) (* BLOCKS-PER-YEAR BPS-DENOM)))
)

(define-read-only (calc-fee (amount uint) (fee-bps uint))
  (ok (/ (* amount fee-bps) BPS-DENOM))
)

(define-read-only (amount-after-fee (amount uint) (fee-bps uint))
  (let ((fee (/ (* amount fee-bps) BPS-DENOM)))
    (ok (- amount fee))
  )
)

;; Collateral value conversion

(define-read-only (sats-to-usd (sats uint) (btc-price-usd uint))
  (ok (/ (* sats btc-price-usd) PRECISION))
)

(define-read-only (usd-to-sats (usd-amount uint) (btc-price-usd uint))
  (if (is-eq btc-price-usd u0)
    ERR-DIVIDE-BY-ZERO
    (ok (/ (* usd-amount PRECISION) btc-price-usd))
  )
)
