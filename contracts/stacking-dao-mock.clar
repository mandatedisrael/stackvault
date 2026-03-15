;; STACKVAULT - stacking-dao-mock.clar
;; Mock StackingDAO: deposit sBTC, receive stSTX at a configurable ratio.
;; In production, StackingDAO takes STX and returns stSTX. For our demo,
;; we simplify to accept sBTC and mint stSTX proportionally using the
;; BTC/STX price from the oracle. Not for production.

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u600))
(define-constant ERR-ZERO-AMOUNT (err u601))
(define-constant ERR-PAUSED (err u602))

(define-constant PRECISION u100000000)

;; Configurable exchange rate: how many stSTX sats per sBTC sat deposited
;; Default 1:1 for simplicity. Owner can adjust to simulate yield accrual.
(define-data-var exchange-rate uint PRECISION)
(define-data-var paused bool false)
(define-data-var total-deposited uint u0)

(define-map deposits principal uint)

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

;; Read-only

(define-read-only (get-exchange-rate)
  (var-get exchange-rate)
)

(define-read-only (get-total-deposited)
  (var-get total-deposited)
)

(define-read-only (get-deposit (user principal))
  (default-to u0 (map-get? deposits user))
)

(define-read-only (sbtc-to-ststx (sbtc-amount uint))
  (/ (* sbtc-amount (var-get exchange-rate)) PRECISION)
)

(define-read-only (ststx-to-sbtc (ststx-amount uint))
  (/ (* ststx-amount PRECISION) (var-get exchange-rate))
)

;; Public: deposit sBTC, receive stSTX
;; The caller passes the sBTC token trait and the stSTX token trait.
;; sBTC is transferred to this contract; stSTX is minted to the caller.
;; For the mock, we use as-contract to call mint on the stSTX token.
;; In simnet, the deployer owns both contracts so mint authority works.

(define-public (deposit-sbtc
  (amount uint)
  (sbtc-token <sip010-trait>)
)
  (begin
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    (let (
      (ststx-amount (sbtc-to-ststx amount))
      (caller tx-sender)
    )
      ;; Transfer sBTC from caller to this contract
      (try! (contract-call? sbtc-token transfer amount caller (as-contract tx-sender) none))

      ;; Mint stSTX to the caller
      ;; Note: stSTX mock contract-owner must be deployer (same as this contract deployer)
      (try! (contract-call? .ststx-token-mock mint ststx-amount caller))

      (map-set deposits caller (+ (get-deposit caller) amount))
      (var-set total-deposited (+ (var-get total-deposited) amount))

      (print {
        event: "stacking-dao-deposit",
        user: caller,
        sbtc-in: amount,
        ststx-out: ststx-amount
      })

      (ok ststx-amount)
    )
  )
)

;; Public: withdraw - burn stSTX, return sBTC
(define-public (withdraw-sbtc
  (ststx-amount uint)
  (sbtc-token <sip010-trait>)
)
  (begin
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (> ststx-amount u0) ERR-ZERO-AMOUNT)

    (let (
      (sbtc-amount (ststx-to-sbtc ststx-amount))
      (caller tx-sender)
    )
      ;; Transfer stSTX from caller to this contract (simulates burn)
      (try! (contract-call? .ststx-token-mock transfer ststx-amount caller (as-contract tx-sender) none))

      ;; Return sBTC from this contract to caller
      (try! (as-contract (contract-call? sbtc-token transfer sbtc-amount tx-sender caller none)))

      (print {
        event: "stacking-dao-withdraw",
        user: caller,
        ststx-in: ststx-amount,
        sbtc-out: sbtc-amount
      })

      (ok sbtc-amount)
    )
  )
)

;; Admin: adjust exchange rate (simulate yield accrual over time)
(define-public (set-exchange-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set exchange-rate new-rate)
    (ok new-rate)
  )
)

(define-public (set-paused (new-paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set paused new-paused)
    (ok new-paused)
  )
)
