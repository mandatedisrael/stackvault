import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const deployer = simnet.getAccounts().get("deployer")!;
const wallet1 = simnet.getAccounts().get("wallet_1")!;
const wallet2 = simnet.getAccounts().get("wallet_2")!;

const SBTC = "sbtc-token";
const VAULT = "vault-aggregator";
const DAO = "vault-dao";
const ORACLE = "vault-oracle";
const MATH = "vault-math";
const TIMELOCK = "vault-timelock";

// Trait contract reference for the sBTC mock (deployer address)
const sbtcContract = Cl.contractPrincipal(deployer, SBTC);

const ONE_SBTC = 100_000_000n; // 1 sBTC in sats

function mintSbtc(recipient: string, amount: bigint) {
  return simnet.callPublicFn(SBTC, "mint", [Cl.uint(amount), Cl.principal(recipient)], deployer);
}

// ---------------------------------------------------------------------------
// vault-math tests
// ---------------------------------------------------------------------------
describe("vault-math", () => {
  it("fp-mul: 2 * 3 = 6 (precision-scaled)", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "fp-mul",
      [Cl.uint(200_000_000n), Cl.uint(300_000_000n)],
      deployer
    );
    // (2e8 * 3e8) / 1e8 = 6e8
    expect(result).toBeOk(Cl.uint(600_000_000n));
  });

  it("fp-div: 6 / 3 = 2 (precision-scaled)", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "fp-div",
      [Cl.uint(600_000_000n), Cl.uint(300_000_000n)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(200_000_000n));
  });

  it("fp-div: divide by zero returns error", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "fp-div",
      [Cl.uint(100n), Cl.uint(0n)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(300));
  });

  it("assets-to-shares: first deposit is 1:1", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "assets-to-shares",
      [Cl.uint(ONE_SBTC), Cl.uint(0n), Cl.uint(0n)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(ONE_SBTC));
  });

  it("shares-to-assets: zero shares returns 0", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "shares-to-assets",
      [Cl.uint(0n), Cl.uint(ONE_SBTC), Cl.uint(0n)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(0n));
  });

  it("calc-share-price: initial price = PRECISION", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "calc-share-price",
      [Cl.uint(0n), Cl.uint(0n)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(100_000_000n));
  });

  it("calc-ltv-bps: 75% LTV", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "calc-ltv-bps",
      [Cl.uint(75_000n), Cl.uint(100_000n)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(7500n));
  });

  it("check-ltv: accepts borrow at max LTV", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "check-ltv",
      [Cl.uint(7500n), Cl.uint(10000n)],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("check-ltv: rejects borrow above max LTV", () => {
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "check-ltv",
      [Cl.uint(8000n), Cl.uint(10000n)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(302));
  });

  it("sats-to-usd: 1 BTC at $65k = $65,000", () => {
    // 1 BTC = 1e8 sats, price = 65000_00000000 (8 decimal scaled)
    const btcPrice = 6_500_000_000_000n; // $65,000 * 1e8
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "sats-to-usd",
      [Cl.uint(ONE_SBTC), Cl.uint(btcPrice)],
      deployer
    );
    // (1e8 * 6.5e12) / 1e8 = 6.5e12
    expect(result).toBeOk(Cl.uint(btcPrice));
  });

  it("calc-yield: 8.5% APY over 1 year", () => {
    const principal = ONE_SBTC;
    const apyBps = 850n; // 8.5%
    const blocksPerYear = 52560n;
    const { result } = simnet.callReadOnlyFn(
      MATH,
      "calc-yield",
      [Cl.uint(principal), Cl.uint(apyBps), Cl.uint(blocksPerYear)],
      deployer
    );
    // yield = 1e8 * 850 * 52560 / (52560 * 10000) = 1e8 * 850 / 10000 = 8500000
    expect(result).toBeOk(Cl.uint(8_500_000n));
  });
});

// ---------------------------------------------------------------------------
// vault-oracle tests
// ---------------------------------------------------------------------------
describe("vault-oracle", () => {
  it("get-btc-price fails with no price set", () => {
    const { result } = simnet.callReadOnlyFn(ORACLE, "get-btc-price", [], deployer);
    expect(result).toBeErr(Cl.uint(405)); // ERR-NO-PRICE
  });

  it("owner can update BTC price", () => {
    const price = 6_500_000_000_000n;
    const { result } = simnet.callPublicFn(
      ORACLE,
      "update-btc-price",
      [Cl.uint(price)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(price));
  });

  it("price is fresh after update", () => {
    const price = 6_500_000_000_000n;
    simnet.callPublicFn(ORACLE, "update-btc-price", [Cl.uint(price)], deployer);
    const { result } = simnet.callReadOnlyFn(ORACLE, "is-price-fresh", [], deployer);
    expect(result).toBeBool(true);
  });

  it("non-whitelisted caller cannot update price", () => {
    const { result } = simnet.callPublicFn(
      ORACLE,
      "update-btc-price",
      [Cl.uint(6_500_000_000_000n)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(403)); // ERR-NOT-WHITELISTED
  });

  it("owner can add updater, who can then update", () => {
    simnet.callPublicFn(ORACLE, "add-updater", [Cl.principal(wallet1)], deployer);
    const { result } = simnet.callPublicFn(
      ORACLE,
      "update-btc-price",
      [Cl.uint(6_600_000_000_000n)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(6_600_000_000_000n));
  });

  it("circuit breaker: price deviation > 20% is rejected", () => {
    const initPrice = 6_500_000_000_000n;
    simnet.callPublicFn(ORACLE, "update-btc-price", [Cl.uint(initPrice)], deployer);
    // 30% jump
    const newPrice = (initPrice * 130n) / 100n;
    const { result } = simnet.callPublicFn(
      ORACLE,
      "update-btc-price",
      [Cl.uint(newPrice)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(404)); // ERR-DEVIATION-BREAKER
  });

  it("owner can halt and resume oracle", () => {
    simnet.callPublicFn(ORACLE, "halt-oracle", [], deployer);
    const halted = simnet.callReadOnlyFn(ORACLE, "is-halted", [], deployer);
    expect(halted.result).toBeBool(true);

    simnet.callPublicFn(ORACLE, "resume-oracle", [], deployer);
    const resumed = simnet.callReadOnlyFn(ORACLE, "is-halted", [], deployer);
    expect(resumed.result).toBeBool(false);
  });
});

// ---------------------------------------------------------------------------
// vault-dao tests
// ---------------------------------------------------------------------------
describe("vault-dao", () => {
  it("owner can add an admin", () => {
    const { result } = simnet.callPublicFn(
      DAO,
      "add-admin",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));
    const isAdmin = simnet.callReadOnlyFn(DAO, "is-admin", [Cl.principal(wallet1)], deployer);
    expect(isAdmin.result).toBeBool(true);
  });

  it("non-owner cannot add admin", () => {
    const { result } = simnet.callPublicFn(
      DAO,
      "add-admin",
      [Cl.principal(wallet2)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(200)); // ERR-NOT-AUTHORIZED
  });

  it("admin can propose an action", () => {
    simnet.callPublicFn(DAO, "add-admin", [Cl.principal(wallet1)], deployer);
    const { result } = simnet.callPublicFn(
      DAO,
      "propose",
      [
        Cl.stringAscii("set-fee-bps"),
        Cl.principal(deployer),
        Cl.uint(100n),
      ],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(0n)); // first proposal id = 0
  });

  it("non-admin cannot propose", () => {
    const { result } = simnet.callPublicFn(
      DAO,
      "propose",
      [Cl.stringAscii("set-fee-bps"), Cl.principal(deployer), Cl.uint(100n)],
      wallet2
    );
    expect(result).toBeErr(Cl.uint(200));
  });

  it("owner can set guardian role", () => {
    simnet.callPublicFn(DAO, "set-guardian", [Cl.principal(wallet1), Cl.bool(true)], deployer);
    const { result } = simnet.callReadOnlyFn(DAO, "is-guardian", [Cl.principal(wallet1)], deployer);
    expect(result).toBeBool(true);
  });

  it("owner can set operator role", () => {
    simnet.callPublicFn(DAO, "set-operator", [Cl.principal(wallet1), Cl.bool(true)], deployer);
    const { result } = simnet.callReadOnlyFn(DAO, "is-operator", [Cl.principal(wallet1)], deployer);
    expect(result).toBeBool(true);
  });
});

// ---------------------------------------------------------------------------
// vault-timelock tests
// ---------------------------------------------------------------------------
describe("vault-timelock", () => {
  it("owner can queue an operation", () => {
    const { result } = simnet.callPublicFn(
      TIMELOCK,
      "queue",
      [
        Cl.stringAscii("set-fee-bps"),
        Cl.principal(deployer),
        Cl.uint(100n),
        Cl.uint(0n), // use default delay
      ],
      deployer
    );
    expect(result).toBeOk(Cl.uint(0n)); // op-id = 0
  });

  it("non-owner cannot queue", () => {
    const { result } = simnet.callPublicFn(
      TIMELOCK,
      "queue",
      [
        Cl.stringAscii("set-fee-bps"),
        Cl.principal(deployer),
        Cl.uint(100n),
        Cl.uint(0n),
      ],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(500)); // ERR-NOT-AUTHORIZED
  });

  it("cannot execute before delay passes", () => {
    simnet.callPublicFn(
      TIMELOCK,
      "queue",
      [Cl.stringAscii("set-fee-bps"), Cl.principal(deployer), Cl.uint(100n), Cl.uint(0n)],
      deployer
    );
    const { result } = simnet.callPublicFn(TIMELOCK, "execute", [Cl.uint(0n)], deployer);
    expect(result).toBeErr(Cl.uint(502)); // ERR-NOT-READY
  });

  it("owner can cancel a queued operation", () => {
    simnet.callPublicFn(
      TIMELOCK,
      "queue",
      [Cl.stringAscii("set-fee-bps"), Cl.principal(deployer), Cl.uint(100n), Cl.uint(0n)],
      deployer
    );
    const { result } = simnet.callPublicFn(TIMELOCK, "cancel", [Cl.uint(0n)], deployer);
    expect(result).toBeOk(Cl.bool(true));
  });

  it("cannot queue duplicate action+target", () => {
    simnet.callPublicFn(
      TIMELOCK,
      "queue",
      [Cl.stringAscii("set-fee-bps"), Cl.principal(deployer), Cl.uint(100n), Cl.uint(0n)],
      deployer
    );
    const { result } = simnet.callPublicFn(
      TIMELOCK,
      "queue",
      [Cl.stringAscii("set-fee-bps"), Cl.principal(deployer), Cl.uint(200n), Cl.uint(0n)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(503)); // ERR-ALREADY-QUEUED
  });
});

// ---------------------------------------------------------------------------
// vault-aggregator tests
// ---------------------------------------------------------------------------
describe("vault-aggregator", () => {
  beforeEach(() => {
    // Mint 2 sBTC to wallet1 and wallet2 for testing
    mintSbtc(wallet1, ONE_SBTC * 2n);
    mintSbtc(wallet2, ONE_SBTC * 2n);
  });

  it("vault is unpaused at deploy", () => {
    const { result } = simnet.callReadOnlyFn(VAULT, "is-paused", [], deployer);
    expect(result).toBeBool(false);
  });

  it("initial share price is PRECISION (1:1)", () => {
    const { result } = simnet.callReadOnlyFn(VAULT, "get-share-price", [], deployer);
    expect(result).toBeUint(100_000_000n);
  });

  it("initial total assets = 0", () => {
    const { result } = simnet.callReadOnlyFn(VAULT, "get-total-assets", [], deployer);
    expect(result).toBeUint(0n);
  });

  it("deposit: wallet1 deposits 1 sBTC and receives shares", () => {
    const amount = ONE_SBTC;
    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(amount), Cl.uint(0n), sbtcContract],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(amount)); // first deposit: shares = amount

    const totalAssets = simnet.callReadOnlyFn(VAULT, "get-total-assets", [], deployer);
    expect(totalAssets.result).toBeUint(amount);

    const shares = simnet.callReadOnlyFn(VAULT, "get-shares", [Cl.principal(wallet1)], deployer);
    expect(shares.result).toBeUint(amount);
  });

  it("deposit: zero amount fails with ERR-ZERO-AMOUNT", () => {
    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(0n), Cl.uint(0n), sbtcContract],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(102));
  });

  it("deposit: below MIN-FIRST-DEPOSIT on first vault deposit fails", () => {
    // 99,999 sats < 100,000 (MIN-FIRST-DEPOSIT)
    mintSbtc(wallet1, 99_999n);
    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(99_999n), Cl.uint(0n), sbtcContract],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(108)); // ERR-FIRST-DEPOSIT
  });

  it("deposit: slippage protection triggers correctly", () => {
    // Request more shares than will be minted
    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(ONE_SBTC), Cl.uint(ONE_SBTC * 2n), sbtcContract],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(109)); // ERR-SLIPPAGE
  });

  it("withdraw: after deposit, wallet1 can withdraw within rate limit", () => {
    const amount = ONE_SBTC;
    // deposit first
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(amount), Cl.uint(0n), sbtcContract], wallet1);

    // Epoch limit = 10% of TVL = 0.1 sBTC = 10_000_000 sats
    // Withdraw 5% (5_000_000 sats) to stay within limit
    const withdrawShares = 5_000_000n;

    const { result } = simnet.callPublicFn(
      VAULT,
      "withdraw",
      [Cl.uint(withdrawShares), Cl.uint(0n), sbtcContract],
      wallet1
    );
    // net-assets = 5_000_000 - 0.5% fee (25_000) = 4_975_000
    expect(result).toBeOk(Cl.uint(4_975_000n));

    // shares should be reduced
    const sharesAfter = simnet.callReadOnlyFn(VAULT, "get-shares", [Cl.principal(wallet1)], deployer);
    expect(sharesAfter.result).toBeUint(amount - withdrawShares);
  });

  it("withdraw: 100% withdrawal triggers rate limiter (ERR-WITHDRAWAL-LIMIT)", () => {
    const amount = ONE_SBTC;
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(amount), Cl.uint(0n), sbtcContract], wallet1);

    // Try to withdraw all shares (100% > 10% epoch limit)
    const { result } = simnet.callPublicFn(
      VAULT,
      "withdraw",
      [Cl.uint(amount), Cl.uint(0n), sbtcContract],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(107)); // ERR-WITHDRAWAL-LIMIT
  });

  it("withdraw: cannot withdraw more shares than owned", () => {
    const amount = ONE_SBTC;
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(amount), Cl.uint(0n), sbtcContract], wallet1);

    const { result } = simnet.callPublicFn(
      VAULT,
      "withdraw",
      [Cl.uint(amount * 10n), Cl.uint(0n), sbtcContract],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(103)); // ERR-INSUFFICIENT-BALANCE
  });

  it("withdraw: zero shares fails with ERR-ZERO-AMOUNT", () => {
    const { result } = simnet.callPublicFn(
      VAULT,
      "withdraw",
      [Cl.uint(0n), Cl.uint(0n), sbtcContract],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(102));
  });

  it("harvest-yield: owner can increase total-assets", () => {
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(ONE_SBTC), Cl.uint(0n), sbtcContract], wallet1);
    const yieldAmount = 1_000_000n; // 0.01 sBTC yield

    const { result } = simnet.callPublicFn(
      VAULT,
      "harvest-yield",
      [Cl.uint(yieldAmount)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(yieldAmount));

    const totalAssets = simnet.callReadOnlyFn(VAULT, "get-total-assets", [], deployer);
    expect(totalAssets.result).toBeUint(ONE_SBTC + yieldAmount);
  });

  it("harvest-yield: share price increases after yield", () => {
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(ONE_SBTC), Cl.uint(0n), sbtcContract], wallet1);
    simnet.callPublicFn(VAULT, "harvest-yield", [Cl.uint(ONE_SBTC / 10n)], deployer);

    const { result } = simnet.callReadOnlyFn(VAULT, "get-share-price", [], deployer);
    // price should be > PRECISION after yield
    const price = (result as any).value;
    expect(price > 100_000_000n).toBe(true);
  });

  it("set-paused: owner can pause the vault", () => {
    simnet.callPublicFn(VAULT, "set-paused", [Cl.bool(true)], deployer);
    const { result } = simnet.callReadOnlyFn(VAULT, "is-paused", [], deployer);
    expect(result).toBeBool(true);
  });

  it("deposit: fails when vault is paused", () => {
    simnet.callPublicFn(VAULT, "set-paused", [Cl.bool(true)], deployer);
    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(ONE_SBTC), Cl.uint(0n), sbtcContract],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(101)); // ERR-PAUSED
  });

  it("set-fee-bps: owner can update fee", () => {
    const { result } = simnet.callPublicFn(
      VAULT,
      "set-fee-bps",
      [Cl.uint(100n)], // 1%
      deployer
    );
    expect(result).toBeOk(Cl.uint(100n));
  });

  it("set-fee-bps: fee > 500 bps is rejected", () => {
    const { result } = simnet.callPublicFn(
      VAULT,
      "set-fee-bps",
      [Cl.uint(501n)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED (reuses the constant)
  });

  it("two depositors: share accounting is correct", () => {
    // wallet1 deposits 1 sBTC, wallet2 deposits 1 sBTC
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(ONE_SBTC), Cl.uint(0n), sbtcContract], wallet1);
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(ONE_SBTC), Cl.uint(0n), sbtcContract], wallet2);

    const totalAssets = simnet.callReadOnlyFn(VAULT, "get-total-assets", [], deployer);
    expect(totalAssets.result).toBeUint(ONE_SBTC * 2n);

    const shares1 = simnet.callReadOnlyFn(VAULT, "get-shares", [Cl.principal(wallet1)], deployer);
    const shares2 = simnet.callReadOnlyFn(VAULT, "get-shares", [Cl.principal(wallet2)], deployer);
    // Both should have equal shares
    expect((shares1.result as any).value).toBe((shares2.result as any).value);
  });
});
