;; ============================================================
;; STACKVAULT - vault-aggregator.clar
;; Core deposit, withdrawal, share accounting, and protocol routing
;; Chains: sBTC -> StackingDAO -> stSTXbtc -> Zest Protocol -> USDCx
;; ============================================================

;; ============================================================
;; CONSTANTS
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED        (err u100))
(define-constant ERR-PAUSED                (err u101))
(define-constant ERR-ZERO-AMOUNT           (err u102))
(define-constant ERR-INSUFFICIENT-BALANCE  (err u103))
(define-constant ERR-TVL-CAP-EXCEEDED      (err u104))
(define-constant ERR-USER-CAP-EXCEEDED     (err u105))
(define-constant ERR-INVALID-SHARES        (err u106))
(define-constant ERR-WITHDRAWAL-LIMIT      (err u107))
(define-constant ERR-FIRST-DEPOSIT         (err u108))
(define-constant ERR-SLIPPAGE              (err u109))

;; Precision: 8 decimal places (matches sBTC / satoshi precision)
(define-constant PRECISION u100000000)

;; TVL cap: 500 sBTC = 50,000,000,000 sats
(define-constant TVL-CAP u50000000000)

;; Per-user cap: 10 sBTC = 1,000,000,000 sats
(define-constant USER-CAP u1000000000)

;; Minimum first deposit to prevent share inflation attack: 0.001 sBTC
(define-constant MIN-FIRST-DEPOSIT u100000)

;; Withdrawal rate limit per epoch (144 blocks ~ 1 day): 10% of TVL
(define-constant WITHDRAWAL-RATE-LIMIT-BPS u1000)

;; Epoch length in blocks
(define-constant EPOCH-LENGTH u144)

;; sBTC token contract -- set by owner after deploy for the target network
;; Testnet: SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
;; Mainnet: SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sbtc-token
;; Default: deployer's own sbtc-token (for simnet/devnet testing)
(define-data-var whitelisted-token principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token)

;; StackingDAO stSTXbtc contract (deposit endpoint)
;; Devnet: deployer address; mainnet: SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-v1
(define-constant STACKINGDAO-CORE 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stacking-dao-core-v1)

;; Zest Protocol pool contract
;; Devnet: deployer address; mainnet: SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.zest-reward-dist
(define-constant ZEST-POOL 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.zest-reward-dist)

;; ============================================================
;; DATA VARS - global state
;; ============================================================

;; Is the vault paused? (guardian can flip this)
(define-data-var vault-paused bool false)

;; Total sBTC deposited (in sats)
(define-data-var total-assets uint u0)

;; Total vault shares outstanding
(define-data-var total-shares uint u0)

;; Accumulated yield harvested (in sats)
(define-data-var total-yield-harvested uint u0)

;; Protocol fee in basis points (default 50 = 0.5%)
(define-data-var protocol-fee-bps uint u50)

;; Fee recipient
(define-data-var fee-recipient principal CONTRACT-OWNER)

;; Withdrawal epoch tracking
(define-data-var current-epoch uint u0)
(define-data-var epoch-withdrawals uint u0)

;; ============================================================
;; DATA MAPS - per-user state
;; ============================================================

;; User share balances
(define-map user-shares
  principal
  uint
)

;; User total deposited (for cap enforcement)
(define-map user-deposited
  principal
  uint
)

;; ============================================================
;; TRAITS
;; ============================================================

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

;; ============================================================
;; READ-ONLY FUNCTIONS
;; ============================================================

;; Get share balance for a user
(define-read-only (get-shares (user principal))
  (default-to u0 (map-get? user-shares user))
)

;; Get total assets in the vault
(define-read-only (get-total-assets)
  (var-get total-assets)
)

;; Get total shares outstanding
(define-read-only (get-total-shares)
  (var-get total-shares)
)

;; Convert assets to shares (handles first deposit)
;; shares = (assets * total-shares) / total-assets
(define-read-only (assets-to-shares (assets uint))
  (let (
    (ts (var-get total-shares))
    (ta (var-get total-assets))
  )
    (if (or (is-eq ts u0) (is-eq ta u0))
      ;; First deposit: 1:1 ratio
      assets
      ;; Subsequent deposits: pro-rata
      (/ (* assets ts) ta)
    )
  )
)

;; Convert shares to assets
;; assets = (shares * total-assets) / total-shares
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

;; Get current share price (in sats per share, scaled by PRECISION)
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

;; Get vault paused status
(define-read-only (is-paused)
  (var-get vault-paused)
)

;; Get position for a user: shares, asset value, deposited
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

;; Check if withdrawal is within rate limit for current epoch
(define-read-only (check-withdrawal-limit (amount uint))
  (let (
    (epoch (/ block-height EPOCH-LENGTH))
    (epoch-limit (/ (* (var-get total-assets) WITHDRAWAL-RATE-LIMIT-BPS) u10000))
    (current-epoch-withdrawals
      (if (is-eq epoch (var-get current-epoch))
        (var-get epoch-withdrawals)
        u0
      )
    )
  )
    (<= (+ current-epoch-withdrawals amount) epoch-limit)
  )
)

;; ============================================================
;; PRIVATE HELPERS
;; ============================================================

;; Assert vault is not paused
(define-private (assert-not-paused)
  (ok (asserts! (not (var-get vault-paused)) ERR-PAUSED))
)

;; Assert caller is contract owner
(define-private (assert-owner)
  (ok (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED))
)

;; Update epoch withdrawal tracker
(define-private (update-epoch-withdrawals (amount uint))
  (let ((epoch (/ block-height EPOCH-LENGTH)))
    (if (is-eq epoch (var-get current-epoch))
      (var-set epoch-withdrawals (+ (var-get epoch-withdrawals) amount))
      (begin
        (var-set current-epoch epoch)
        (var-set epoch-withdrawals amount)
      )
    )
  )
)

;; Calculate and deduct protocol fee, return net amount
(define-private (apply-fee (amount uint))
  (let (
    (fee (/ (* amount (var-get protocol-fee-bps)) u10000))
    (net (- amount fee))
  )
    net
  )
)

;; ============================================================
;; PUBLIC FUNCTIONS
;; ============================================================

;; -----------------------------------------------------------
;; DEPOSIT
;; User deposits sBTC, receives vault shares.
;; token must be the whitelisted sBTC contract ((var-get whitelisted-token)).
;; -----------------------------------------------------------
(define-public (deposit
  (amount uint)
  (min-shares uint)
  (token <sip010-trait>)
)
  (begin
    ;; Whitelist check: only accept the canonical sBTC token
    (asserts! (is-eq (contract-of token) (var-get whitelisted-token)) ERR-NOT-AUTHORIZED)

    ;; Guards
    (try! (assert-not-paused))
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    ;; TVL cap check
    (asserts!
      (<= (+ (var-get total-assets) amount) TVL-CAP)
      ERR-TVL-CAP-EXCEEDED
    )

    ;; Per-user cap check
    (let (
      (user-total (+ (default-to u0 (map-get? user-deposited tx-sender)) amount))
    )
      (asserts! (<= user-total USER-CAP) ERR-USER-CAP-EXCEEDED)

      ;; First-depositor inflation attack prevention:
      ;; If this is the very first deposit, require minimum amount
      (asserts!
        (or
          (> (var-get total-shares) u0)
          (>= amount MIN-FIRST-DEPOSIT)
        )
        ERR-FIRST-DEPOSIT
      )

      ;; Calculate shares to mint (before transferring to maintain CEI pattern)
      (let (
        (shares-to-mint (assets-to-shares amount))
      )
        ;; Slippage protection
        (asserts! (>= shares-to-mint min-shares) ERR-SLIPPAGE)

        ;; CEI: Effects before Interactions
        ;; Update state first
        (map-set user-shares tx-sender
          (+ (get-shares tx-sender) shares-to-mint)
        )
        (map-set user-deposited tx-sender user-total)
        (var-set total-assets (+ (var-get total-assets) amount))
        (var-set total-shares (+ (var-get total-shares) shares-to-mint))

        ;; Interactions: pull sBTC from user into vault
        (try! (contract-call? token transfer
          amount
          tx-sender
          (as-contract tx-sender)
          none
        ))

        ;; Emit deposit event (via print)
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

;; -----------------------------------------------------------
;; WITHDRAW
;; User burns shares, receives sBTC back.
;; token must be the whitelisted sBTC contract ((var-get whitelisted-token)).
;; -----------------------------------------------------------
(define-public (withdraw
  (shares uint)
  (min-assets uint)
  (token <sip010-trait>)
)
  (begin
    ;; Whitelist check
    (asserts! (is-eq (contract-of token) (var-get whitelisted-token)) ERR-NOT-AUTHORIZED)

    ;; Guards
    (try! (assert-not-paused))
    (asserts! (> shares u0) ERR-ZERO-AMOUNT)

    ;; Check user has enough shares
    (let (
      (user-share-balance (get-shares tx-sender))
    )
      (asserts! (>= user-share-balance shares) ERR-INSUFFICIENT-BALANCE)

      ;; Calculate assets to return
      (let (
        (gross-assets (shares-to-assets shares))
        (net-assets (apply-fee gross-assets))
        (fee-amount (- gross-assets net-assets))
      )
        ;; Slippage protection
        (asserts! (>= net-assets min-assets) ERR-SLIPPAGE)

        ;; Withdrawal rate limit
        (asserts! (check-withdrawal-limit gross-assets) ERR-WITHDRAWAL-LIMIT)

        ;; Capture user address before as-contract changes tx-sender
        (let ((user tx-sender))
          ;; CEI: Effects first
          (map-set user-shares user (- user-share-balance shares))
          (var-set total-shares (- (var-get total-shares) shares))
          (var-set total-assets (- (var-get total-assets) gross-assets))
          (update-epoch-withdrawals gross-assets)

          ;; Interactions: vault sends net-assets back to user
          (try! (as-contract (contract-call? token transfer
            net-assets
            tx-sender  ;; inside as-contract: tx-sender = vault contract
            user       ;; recipient = original caller
            none
          )))

          ;; Send fee to fee-recipient if non-zero
          (if (> fee-amount u0)
            (try! (as-contract (contract-call? token transfer
              fee-amount
              tx-sender  ;; vault contract
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
        )  ;; end let user
      )    ;; end let gross/net/fee
    )      ;; end let user-share-balance
  )
)

;; -----------------------------------------------------------
;; HARVEST YIELD
;; Operator calls this to record yield accrued from StackingDAO
;; Increases total-assets without minting shares -> share price rises
;; -----------------------------------------------------------
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

;; ============================================================
;; ADMIN FUNCTIONS
;; ============================================================

;; Pause the vault (emergency)
(define-public (set-paused (paused bool))
  (begin
    (try! (assert-owner))
    (var-set vault-paused paused)
    (print { event: "pause-changed", paused: paused })
    (ok paused)
  )
)

;; Update protocol fee (max 500 bps = 5%)
(define-public (set-fee-bps (bps uint))
  (begin
    (try! (assert-owner))
    (asserts! (<= bps u500) ERR-NOT-AUTHORIZED)
    (var-set protocol-fee-bps bps)
    (print { event: "fee-updated", fee-bps: bps })
    (ok bps)
  )
)

;; Update fee recipient
(define-public (set-fee-recipient (recipient principal))
  (begin
    (try! (assert-owner))
    (var-set fee-recipient recipient)
    (ok recipient)
  )
)

;; Update whitelisted token (owner-only, for network migration)
(define-public (set-whitelisted-token (token principal))
  (begin
    (try! (assert-owner))
    (var-set whitelisted-token token)
    (print { event: "whitelisted-token-updated", token: token })
    (ok token)
  )
)

;; Read the current whitelisted token
(define-read-only (get-whitelisted-token)
  (var-get whitelisted-token)
)
