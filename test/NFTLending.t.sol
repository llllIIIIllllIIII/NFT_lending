// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {NFTLending} from "../src/NFTLending.sol";
import {ERC20Mock} from "openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol";
import {MockERC721} from "./mocks/MockERC721.sol";
import {TestBase} from "./utils/TestBase.sol";

contract NFTLendingTest is TestBase {
    NFTLending internal lending;
    MockERC721 internal nft;
    ERC20Mock internal token;

    address internal borrower = address(0xB0B0);
    address internal lender = address(0x10A);

    function setUp() public {
        lending = new NFTLending();
        nft = new MockERC721();
    token = new ERC20Mock();

        vm.deal(borrower, 5 ether);
        vm.deal(lender, 5 ether);

        token.mint(lender, 5 ether);

        vm.prank(address(0xDEAD));
        nft.mint(borrower, 1);

        vm.prank(borrower);
        nft.setApprovalForAll(address(lending), true);

        vm.prank(lender);
        token.approve(address(lending), type(uint256).max);

        vm.prank(borrower);
        token.approve(address(lending), type(uint256).max);
    }

    function testLoanLifecycleHappyPath() public {
        uint64 dueDate = uint64(block.timestamp + 7 days);
        uint256 principal = 1 ether;
        uint256 interest = 0.1 ether;

        vm.prank(borrower);
        uint256 loanId = lending.createLoanOffer(address(nft), 1, address(token), principal, interest, dueDate);

        vm.prank(lender);
        lending.fundLoan(loanId);

        NFTLending.LoanOffer memory loan = lending.getLoan(loanId);
        assertEq(uint256(loan.state), uint256(NFTLending.LoanState.Funded), "Loan should be funded");
        assertEq(loan.nft, address(nft), "NFT address mismatch");
        assertEq(loan.paymentToken, address(token), "Payment token mismatch");
        assertEq(loan.principal, principal, "Stored principal mismatch");
        assertEq(loan.interest, interest, "Stored interest mismatch");
        assertEq(nft.ownerOf(1), address(lending), "NFT should be held by contract");

        token.mint(borrower, interest);
        vm.prank(borrower);
        lending.repayLoan(loanId);

        loan = lending.getLoan(loanId);
        assertEq(uint256(loan.state), uint256(NFTLending.LoanState.Repaid), "Loan should be repaid");
        assertEq(nft.ownerOf(1), borrower, "Borrower should regain NFT");
        assertEq(token.balanceOf(lender), 5 ether + interest, "Lender should earn interest");
    }

    function testClaimDefaultTransfersCollateral() public {
        uint64 dueDate = uint64(block.timestamp + 3 days);
        uint256 principal = 0.5 ether;
        uint256 interest = 0.05 ether;

        vm.prank(borrower);
        uint256 loanId = lending.createLoanOffer(address(nft), 1, address(token), principal, interest, dueDate);

        vm.prank(lender);
        lending.fundLoan(loanId);

        vm.warp(dueDate + 1);

        vm.prank(lender);
        lending.claimDefault(loanId);

        NFTLending.LoanOffer memory loan = lending.getLoan(loanId);
        assertEq(uint256(loan.state), uint256(NFTLending.LoanState.Defaulted), "Loan should be defaulted");
        assertEq(nft.ownerOf(1), lender, "Lender should own NFT after default");
    }

    function testBorrowerCanCancelBeforeFunding() public {
        uint64 dueDate = uint64(block.timestamp + 5 days);

        vm.prank(borrower);
        uint256 loanId = lending.createLoanOffer(address(nft), 1, address(token), 1 ether, 0, dueDate);

        vm.prank(borrower);
        lending.cancelLoanOffer(loanId);

        NFTLending.LoanOffer memory loan = lending.getLoan(loanId);
        assertEq(uint256(loan.state), uint256(NFTLending.LoanState.Cancelled), "Loan should be cancelled");
        assertEq(nft.ownerOf(1), borrower, "Borrower should recover NFT on cancel");
    }
}
