;; ============================================================
;; STACKVAULT - vault-math.clar
;; Fixed-point math library for share price, LTV, and
;; interest rate calculations. All values scaled to 8 decimals.
;; ============================================================

;; ============================================================
;; CONSTANTS
;; ============================================================

;; 8-decimal precision (matches sBTC / satoshi)
(define-constant PRECISION u100000000)        ;; 1e8

;; 18-decimal precision for high-precision intermediate math
(define-constant PRECISION-18 u1000000000000000000)  ;; 1e18

;; Basis points denominator
(define-constant BPS-DENOM u10000)

;; Max LTV: 75% (7500 bps)
(define-constant MAX-LTV-BPS u7500)

;; Liquidation threshold: 80% (8000 bps)
(define-constant LIQUIDATION-THRESHOLD-BPS u8000)

;; Error codes
(define-constant ERR-DIVIDE-BY-ZERO  (err u300))
(define-constant ERR-OVERFLOW        (err u301))
(define-constant ERR-LTV-EXCEEDED    (err u302))
(define-constant ERR-INVALID-AMOUNT  (err u303))

;; ============================================================
;; BASIC FIXED-POINT ARITHMETIC
;; All inputs and outputs are in PRECISION (1e8) units
;; unless otherwise noted.
;; ============================================================

;; Multiply two PRECISION-scaled values, result stays PRECISION-scaled
;; result = (a * b) / PRECISION
(define-read-only (fp-mul (a uint) (b uint))
  (ok (/ (* a b) PRECISION))
)

;; Divide two PRECISION-scaled values, result stays PRECISION-scaled
;; result = (a * PRECISION) / b
(define-read-only (fp-div (a uint) (b uint))
  (if (is-eq b u0)
    ERR-DIVIDE-BY-ZERO
    (ok (/ (* a PRECISION) b))
  )
)

;; Add two values (plain uint addition with overflow guard)
(define-read-only (fp-add (a uint) (b uint))
  (ok (+ a b))
)

;; Subtract (returns error instead of underflow)
(define-read-only (fp-sub (a uint) (b uint))
  (if (>= a b)
    (ok (- a b))
    ERR-OVERFLOW
  )
)

;; ============================================================
;; PERCENTAGE / BPS HELPERS
;; ============================================================

;; Apply basis points to an amount: result = amount * bps / 10000
(define-read-only (apply-bps (amount uint) (bps uint))
  (ok (/ (* amount bps) BPS-DENOM))
)

;; Convert a ratio (numerator/denominator) to basis points
;; bps = (numerator * 10000) / denominator
(define-read-only (ratio-to-bps (numerator uint) (denominator uint))
  (if (is-eq denominator u0)
    ERR-DIVIDE-BY-ZERO
    (ok (/ (* numerator BPS-DENOM) denominator))
  )
)

;; ============================================================
;; SHARE PRICE MATH
;; ============================================================

;; Calculate share price scaled by PRECISION
;; price = (total-assets * PRECISION) / total-shares
(define-read-only (calc-share-price (total-assets uint) (total-shares uint))
  (if (is-eq total-shares u0)
    (ok PRECISION)   ;; Initial price = 1.0
    (ok (/ (* total-assets PRECISION) total-shares))
  )
)

;; Assets -> shares: how many shares does `assets` amount buy?
;; shares = (assets * total-shares) / total-assets
(define-read-only (assets-to-shares
  (assets uint)
  (total-assets uint)
  (total-shares uint)
)
  (if (or (is-eq total-shares u0) (is-eq total-assets u0))
    (ok assets)  ;; First deposit: 1:1
    (ok (/ (* assets total-shares) total-assets))
  )
)

;; Shares -> assets: how many sBTC sats does `shares` redeem for?
;; assets = (shares * total-assets) / total-shares
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

;; ============================================================
;; LTV (LOAN-TO-VALUE) CALCULATIONS
;; ============================================================

;; Calculate current LTV in basis points
;; ltv-bps = (debt-usd * 10000) / (collateral-usd)
;; All inputs in same unit (e.g. USD cents or satoshis)
(define-read-only (calc-ltv-bps (debt uint) (collateral uint))
  (if (is-eq collateral u0)
    (ok u0)
    (ok (/ (* debt BPS-DENOM) collateral))
  )
)

;; Check if a borrow would exceed max LTV
;; Returns (ok true) if safe, (err ERR-LTV-EXCEEDED) if not
;; Returns ERR-INVALID-AMOUNT if collateral-value is zero
(define-read-only (check-ltv
  (new-debt uint)
  (collateral-value uint)
)
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

;; Max borrowable given collateral value and current debt
;; max-borrow = (collateral * MAX-LTV-BPS / 10000) - existing-debt
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

;; Is position liquidatable? (LTV >= liquidation threshold)
(define-read-only (is-liquidatable (debt uint) (collateral uint))
  (if (is-eq collateral u0)
    (ok false)
    (ok (>= (/ (* debt BPS-DENOM) collateral) LIQUIDATION-THRESHOLD-BPS))
  )
)

;; ============================================================
;; INTEREST / YIELD MATH
;; ============================================================

;; Calculate yield over N blocks at an APY (in bps)
;; Approximation: yield = principal * apy-bps * blocks / (blocks-per-year * 10000)
;; blocks-per-year ~ 52560 (10 min blocks, 365 days)
(define-constant BLOCKS-PER-YEAR u52560)

(define-read-only (calc-yield
  (principal uint)
  (apy-bps uint)
  (blocks uint)
)
  (ok (/ (* (* principal apy-bps) blocks) (* BLOCKS-PER-YEAR BPS-DENOM)))
)

;; Calculate fee amount from gross amount and fee bps
(define-read-only (calc-fee (amount uint) (fee-bps uint))
  (ok (/ (* amount fee-bps) BPS-DENOM))
)

;; Return net amount after fee deduction
(define-read-only (amount-after-fee (amount uint) (fee-bps uint))
  (let ((fee (/ (* amount fee-bps) BPS-DENOM)))
    (ok (- amount fee))
  )
)

;; ============================================================
;; COLLATERAL VALUE (BTC price denominated)
;; Inputs: sats (uint), btc-price-usd (uint, 8-decimal scaled)
;; Output: USD value (uint, 8-decimal scaled)
;; ============================================================

;; value-usd = (sats * btc-price-usd) / PRECISION
(define-read-only (sats-to-usd (sats uint) (btc-price-usd uint))
  (ok (/ (* sats btc-price-usd) PRECISION))
)

;; usd-to-sats: how many sats = usd-amount at current price?
(define-read-only (usd-to-sats (usd-amount uint) (btc-price-usd uint))
  (if (is-eq btc-price-usd u0)
    ERR-DIVIDE-BY-ZERO
    (ok (/ (* usd-amount PRECISION) btc-price-usd))
  )
)

;; ============================================================
;; WITHDRAWAL RATE LIMIT
;; ============================================================

;; Max withdrawable this epoch = total-assets * limit-bps / 10000
(define-read-only (epoch-withdrawal-limit (total-assets uint) (limit-bps uint))
  (ok (/ (* total-assets limit-bps) BPS-DENOM))
)

;; Check if amount fits within remaining epoch allowance
(define-read-only (within-epoch-limit
  (amount uint)
  (already-withdrawn uint)
  (total-assets uint)
  (limit-bps uint)
)
  (let ((limit (/ (* total-assets limit-bps) BPS-DENOM)))
    (ok (<= (+ already-withdrawn amount) limit))
  )
)
