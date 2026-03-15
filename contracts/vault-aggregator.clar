;; STACKVAULT - vault-aggregator.clar
;; Core vault with leveraged yield loop: sBTC -> StackingDAO -> Zest -> DEX -> repeat
;; Deposit/withdraw handle share accounting. Operator executes loop steps.

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
(define-constant ERR-NO-IDLE-SBTC          (err u110))
(define-constant ERR-NOT-OPERATOR          (err u111))
(define-constant ERR-LOOP-MAX-REACHED      (err u112))
(define-constant ERR-NO-LOOP-TO-UNWIND     (err u113))
(define-constant ERR-UNWIND-FIRST          (err u114))
(define-constant ERR-ORACLE-FAIL           (err u115))

(define-constant PRECISION u100000000)
(define-constant TVL-CAP u50000000000)
(define-constant USER-CAP u1000000000)
(define-constant MIN-FIRST-DEPOSIT u100000)
(define-constant MAX-LOOP-ITERATIONS u3)

(define-data-var whitelisted-token principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token)

(define-data-var vault-paused bool false)
(define-data-var total-assets uint u0)
(define-data-var total-shares uint u0)
(define-data-var total-yield-harvested uint u0)
(define-data-var protocol-fee-bps uint u50)
(define-data-var fee-recipient principal CONTRACT-OWNER)

;; Loop state (global, aggregated across all deposits)
(define-data-var idle-sbtc uint u0)
(define-data-var loop-ststx-collateral uint u0)
(define-data-var loop-usdcx-debt uint u0)
(define-data-var loop-sbtc-deployed uint u0)
(define-data-var loop-iterations uint u0)

;; Operator whitelist
(define-map operators principal bool)

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

(define-read-only (get-idle-sbtc)
  (var-get idle-sbtc)
)

(define-read-only (get-loop-state)
  {
    idle-sbtc: (var-get idle-sbtc),
    ststx-collateral: (var-get loop-ststx-collateral),
    usdcx-debt: (var-get loop-usdcx-debt),
    sbtc-deployed: (var-get loop-sbtc-deployed),
    iterations: (var-get loop-iterations)
  }
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

(define-read-only (is-operator (who principal))
  (or (is-eq who CONTRACT-OWNER) (default-to false (map-get? operators who)))
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

(define-private (assert-operator)
  (ok (asserts! (is-operator tx-sender) ERR-NOT-OPERATOR))
)

(define-private (apply-fee (amount uint))
  (let (
    (fee (/ (* amount (var-get protocol-fee-bps)) u10000))
    (net (- amount fee))
  )
    net
  )
)

;; Public: deposit sBTC into the vault
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
        (var-set idle-sbtc (+ (var-get idle-sbtc) amount))

        (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))

        (print {
          event: "deposit",
          user: tx-sender,
          amount: amount,
          shares-minted: shares-to-mint,
          total-assets: (var-get total-assets),
          total-shares: (var-get total-shares),
          idle-sbtc: (var-get idle-sbtc)
        })

        (ok shares-to-mint)
      )
    )
  )
)

;; Public: withdraw sBTC from the vault
;; Requires enough idle sBTC. If loop is active, operator must unwind first.
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
        (asserts! (>= (var-get idle-sbtc) gross-assets) ERR-UNWIND-FIRST)

        (let ((user tx-sender))
          (map-set user-shares user (- user-share-balance shares))
          (var-set total-shares (- (var-get total-shares) shares))
          (var-set total-assets (- (var-get total-assets) gross-assets))
          (var-set idle-sbtc (- (var-get idle-sbtc) gross-assets))

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
            total-shares: (var-get total-shares),
            idle-sbtc: (var-get idle-sbtc)
          })

          (ok net-assets)
        )
      )
    )
  )
)

;; Operator: execute one loop iteration
;; Takes idle sBTC -> StackingDAO (get stSTX) -> Zest (supply collateral + borrow USDCx) -> DEX (swap to sBTC)
(define-public (execute-loop-step
  (sbtc-amount uint)
  (sbtc-token <sip010-trait>)
  (ststx-token <sip010-trait>)
  (usdcx-token <sip010-trait>)
)
  (begin
    (try! (assert-operator))
    (try! (assert-not-paused))
    (asserts! (> sbtc-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= (var-get idle-sbtc) sbtc-amount) ERR-NO-IDLE-SBTC)
    (asserts! (< (var-get loop-iterations) MAX-LOOP-ITERATIONS) ERR-LOOP-MAX-REACHED)

    (let (
      (caller tx-sender)
      (btc-price (unwrap! (contract-call? .vault-oracle get-btc-price) ERR-ORACLE-FAIL))
      ;; Borrow 38% of sBTC value in USDCx (6 decimals)
      ;; usdcx = sbtc-amount * btc-price * 38 / (PRECISION * 100 * 100)
      (borrow-amount (/ (* (* sbtc-amount btc-price) u38) (* (* PRECISION u100) u100)))
    )
      ;; Step 1: sBTC -> StackingDAO -> stSTX
      (let (
        (ststx-received (try! (as-contract
          (contract-call? .stacking-dao-mock deposit-sbtc sbtc-amount sbtc-token)
        )))
      )
        ;; Step 2: stSTX -> Zest as collateral
        (try! (as-contract
          (contract-call? .zest-pool-mock supply-collateral ststx-received ststx-token)
        ))

        ;; Step 3: Borrow USDCx from Zest
        (try! (as-contract
          (contract-call? .zest-pool-mock borrow borrow-amount)
        ))

        ;; Step 4: Swap USDCx -> sBTC via DEX
        (let (
          (sbtc-received (try! (as-contract
            (contract-call? .dex-mock swap-usdcx-to-sbtc borrow-amount u0 usdcx-token sbtc-token)
          )))
        )
          (var-set idle-sbtc (- (+ (var-get idle-sbtc) sbtc-received) sbtc-amount))
          (var-set loop-ststx-collateral (+ (var-get loop-ststx-collateral) ststx-received))
          (var-set loop-usdcx-debt (+ (var-get loop-usdcx-debt) borrow-amount))
          (var-set loop-sbtc-deployed (+ (var-get loop-sbtc-deployed) sbtc-amount))
          (var-set loop-iterations (+ (var-get loop-iterations) u1))

          (print {
            event: "loop-executed",
            iteration: (var-get loop-iterations),
            sbtc-in: sbtc-amount,
            ststx-minted: ststx-received,
            usdcx-borrowed: borrow-amount,
            sbtc-received: sbtc-received,
            idle-sbtc: (var-get idle-sbtc),
            operator: caller
          })

          (ok {
            iteration: (var-get loop-iterations),
            ststx-minted: ststx-received,
            usdcx-borrowed: borrow-amount,
            sbtc-received: sbtc-received
          })
        )
      )
    )
  )
)

;; Operator: unwind the entire loop
;; Swap sBTC -> USDCx to repay debt -> withdraw stSTX -> unstake -> get sBTC back
(define-public (unwind-loop-step
  (sbtc-token <sip010-trait>)
  (ststx-token <sip010-trait>)
  (usdcx-token <sip010-trait>)
)
  (begin
    (try! (assert-operator))
    (try! (assert-not-paused))
    (asserts! (> (var-get loop-iterations) u0) ERR-NO-LOOP-TO-UNWIND)

    (let (
      (caller tx-sender)
      (current-debt (var-get loop-usdcx-debt))
      (current-collateral (var-get loop-ststx-collateral))
      (current-idle (var-get idle-sbtc))
    )
      ;; Step 1: Swap idle sBTC -> USDCx and repay debt
      (if (and (> current-debt u0) (> current-idle u0))
        (let (
          (usdcx-received (try! (as-contract
            (contract-call? .dex-mock swap-sbtc-to-usdcx current-idle u0 sbtc-token usdcx-token)
          )))
          (repay-amount (if (> current-debt usdcx-received) usdcx-received current-debt))
        )
          (try! (as-contract
            (contract-call? .zest-pool-mock repay repay-amount usdcx-token)
          ))
          (var-set idle-sbtc u0)
          true
        )
        true
      )

      ;; Step 2: Withdraw stSTX collateral from Zest
      (if (> current-collateral u0)
        (begin
          (try! (as-contract
            (contract-call? .zest-pool-mock withdraw-collateral current-collateral ststx-token)
          ))
          true
        )
        true
      )

      ;; Step 3: Unstake stSTX -> get sBTC back
      (if (> current-collateral u0)
        (let (
          (sbtc-returned (try! (as-contract
            (contract-call? .stacking-dao-mock withdraw-sbtc current-collateral sbtc-token)
          )))
        )
          (var-set idle-sbtc (+ (var-get idle-sbtc) sbtc-returned))
          true
        )
        true
      )

      ;; Reset loop state
      (var-set loop-ststx-collateral u0)
      (var-set loop-usdcx-debt u0)
      (var-set loop-sbtc-deployed u0)
      (var-set loop-iterations u0)

      (print {
        event: "loop-unwound",
        debt-repaid: current-debt,
        collateral-withdrawn: current-collateral,
        idle-sbtc: (var-get idle-sbtc),
        operator: caller
      })

      (ok true)
    )
  )
)

;; Owner: harvest yield (increase total-assets to reflect accrued yield)
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

(define-public (set-operator (who principal) (enabled bool))
  (begin
    (try! (assert-owner))
    (map-set operators who enabled)
    (print { event: "operator-updated", operator: who, enabled: enabled })
    (ok true)
  )
)

(define-read-only (get-whitelisted-token)
  (var-get whitelisted-token)
)
