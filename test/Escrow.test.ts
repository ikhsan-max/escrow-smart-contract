import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Escrow", function () {
  async function deployEscrow() {
    const [buyer, seller] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.connect(buyer).deploy(seller.address);
    await escrow.waitForDeployment();

    return { escrow, buyer, seller };
  }

  // test 1
  it("Buyer can Deposit ETH", async function () {
    const { escrow, buyer } = await deployEscrow();

    const depositAmount = ethers.parseEther("1");

    await escrow.connect(buyer).deposit({ value: depositAmount });

    expect(await escrow.amount()).to.equal(depositAmount);
  });

  // test 2
  it("Seller cannot Deposit ETH", async function () {
    const { escrow, seller } = await deployEscrow();

    const depositAmount = ethers.parseEther("1");

    await expect(
      escrow.connect(seller).deposit({ value: depositAmount })
    ).to.be.revertedWith("Only buyer can deposit");
  });
});
