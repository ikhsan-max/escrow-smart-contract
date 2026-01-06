import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("Escrow", function () {
  async function deployEscrow() {
    const [buyer, seller, other] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.connect(buyer).deploy(seller.address);
    await escrow.waitForDeployment();

    return { escrow, buyer, seller, other };
  }

  describe("deposit()", function () {
    it("buyer can deposit in AWAITING_PAYMENT and moves to AWAITING_DELIVERY", async function () {
      const { escrow, buyer } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });

      expect(await escrow.amount()).to.equal(amount);
      // state enum: AWAITING_PAYMENT=0, AWAITING_DELIVERY=1, COMPLETE=2, REFUNDED=3
      expect(await escrow.state()).to.equal(1);
    });

    it("seller cannot deposit", async function () {
      const { escrow, seller } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await expect(
        escrow.connect(seller).deposit({ value: amount })
      ).to.be.revertedWith("Only buyer can deposit");
    });

    it("cannot deposit with zero value", async function () {
      const { escrow, buyer } = await deployEscrow();

      await expect(
        escrow.connect(buyer).deposit({ value: 0 })
      ).to.be.revertedWith("Deposit must be greater than zero");
    });

    it("cannot deposit in wrong state (after refund)", async function () {
      const { escrow, buyer } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });
      await escrow.connect(buyer).refund();

      await expect(
        escrow.connect(buyer).deposit({ value: amount })
      ).to.be.revertedWith("Invalid State");
    });
  });

  describe("release()", function () {
    it("seller can release only in AWAITING_DELIVERY, moves to COMPLETE and zeroes amount", async function () {
      const { escrow, buyer, seller } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });

      await escrow.connect(seller).release();

      expect(await escrow.amount()).to.equal(0);
      expect(await escrow.state()).to.equal(2);
    });

    it("buyer cannot release", async function () {
      const { escrow, buyer, seller } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });

      await expect(
        escrow.connect(buyer).release()
      ).to.be.revertedWith("Only Seller can release");
    });

    it("cannot release before deposit (wrong state)", async function () {
      const { escrow, seller } = await deployEscrow();

      await expect(
        escrow.connect(seller).release()
      ).to.be.revertedWith("Invalid State");
    });

    it("cannot release twice", async function () {
      const { escrow, buyer, seller } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });
      await escrow.connect(seller).release();

      await expect(
        escrow.connect(seller).release()
      ).to.be.revertedWith("Invalid State");
    });
  });

  describe("refund()", function () {
    it("buyer can refund only in AWAITING_DELIVERY, moves to REFUNDED and zeroes amount", async function () {
      const { escrow, buyer } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });

      await escrow.connect(buyer).refund();

      expect(await escrow.amount()).to.equal(0);
      expect(await escrow.state()).to.equal(3);
    });

    it("seller cannot refund", async function () {
      const { escrow, buyer, seller } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });

      await expect(
        escrow.connect(seller).refund()
      ).to.be.revertedWith("Only buyer can refund");
    });

    it("cannot refund before deposit (wrong state)", async function () {
      const { escrow, buyer } = await deployEscrow();

      await expect(
        escrow.connect(buyer).refund()
      ).to.be.revertedWith("Invalid State");
    });

    it("cannot refund after release (terminal state)", async function () {
      const { escrow, buyer, seller } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });
      await escrow.connect(seller).release();

      await expect(
        escrow.connect(buyer).refund()
      ).to.be.revertedWith("Invalid State");
    });

    it("cannot refund twice", async function () {
      const { escrow, buyer } = await deployEscrow();
      const amount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: amount });
      await escrow.connect(buyer).refund();

      await expect(
        escrow.connect(buyer).refund()
      ).to.be.revertedWith("Invalid State");
    });
  });

  describe("invariants", function () {
    it("refund and release are mutually exclusive (cannot do both)", async function () {
      const { escrow, buyer, seller } = await deployEscrow();
      const amount = ethers.parseEther("1");

      // Path 1: refund first => release must fail
      await escrow.connect(buyer).deposit({ value: amount });
      await escrow.connect(buyer).refund();

      await expect(
        escrow.connect(seller).release()
      ).to.be.revertedWith("Invalid State");
    });
  });
});
