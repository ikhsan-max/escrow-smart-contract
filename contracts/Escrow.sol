// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//roles:
// -buyer
// -seller

//fund: 
// -ETH locked in contract

//states:
// -AWAITING_PAYMENT
// -AWAITING_DELIVERY
// -COMPLETE
// -REFUNDED

contract Escrow {
    //TODO: implement the escrow contract
    // 1. state machine
    enum EscrowState {
        AWAITING_PAYMENT,
        AWAITING_DELIVERY,
        COMPLETE,
        REFUNDED
    }

    // 2. roles
    address public buyer;
    address public seller;

    // 3. fund
    uint256 public amount;
    
    // 4. current state
    EscrowState public state;
    
    // 5. constructor
   constructor(address _seller) {
        require(_seller != address(0), "Invalid Seller");
       
        buyer = msg.sender;
        seller = _seller;
        state = EscrowState.AWAITING_PAYMENT;
    }

    //function deposit
    function deposit() external payable {
        require(msg.sender == buyer, "Only buyer can deposit");
        require(state == EscrowState.AWAITING_PAYMENT, "Invalid State");
        require(msg.value > 0,"Deposit must be greater than zero");

        amount = msg.value;
        state = EscrowState.AWAITING_DELIVERY;
    }

    //function release
    function release() external {
        require(msg.sender == seller, "Only Seller can release");
        require(state == EscrowState.AWAITING_DELIVERY, "Invalid State");
        state = EscrowState.COMPLETE;

        uint256 value = amount;
        amount = 0;
        (bool success, ) = seller.call{value: value}("");
        require(success, "ETH Transfer Failed");
    }

    //function refund
    function refund() external {
        require(msg.sender == buyer, "Only buyer can refund");
        require(state == EscrowState.AWAITING_DELIVERY, "Invalid State");
        state = EscrowState.REFUNDED;

        uint256 value = amount;
        amount = 0;

        (bool success, ) = buyer.call{value : value }("");
        require(success, "ETH refund failed");
        
    }
}
 