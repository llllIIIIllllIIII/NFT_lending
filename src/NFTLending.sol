// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol";

/// @title Minimal NFT-backed lending contract for hackathon MVP
/// @notice Borrowers escrow an ERC-721 and define ERC-20 payment token, principal, interest, and due date.
contract NFTLending is IERC721Receiver {
    using SafeERC20 for IERC20;

    enum LoanState {
        Listed,
        Funded,
        Repaid,
        Defaulted,
        Cancelled
    }

    struct LoanOffer {
        address borrower;
        address lender;
        address nft;
        address paymentToken;
        uint256 tokenId;
        uint256 principal;
        uint256 interest;
        uint64 dueDate;
        LoanState state;
    }

    uint256 public constant MAX_LOAN_DURATION = 180 days;
    uint256 public nextLoanId = 1;

    mapping(uint256 => LoanOffer) public loans;

    event LoanOffered(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed nft,
        uint256 tokenId,
        address paymentToken,
        uint256 principal,
        uint256 interest,
        uint64 dueDate
    );
    event LoanCancelled(uint256 indexed loanId);
    event LoanFunded(uint256 indexed loanId, address indexed lender, address paymentToken, uint256 principal);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower);
    event LoanDefaulted(uint256 indexed loanId, address indexed lender);

    error InvalidLoan();
    error InvalidState();
    error NotAuthorized();

    uint256 private _entered;

    modifier nonReentrant() {
        require(_entered == 0, "REENTRANCY");
        _entered = 1;
        _;
        _entered = 0;
    }

    /// @notice Creates a loan offer by escrowing the specified NFT in the contract.
    /// @param nft Address of the ERC-721 collection
    /// @param tokenId Token identifier to collateralize
    /// @param paymentToken ERC-20 asset to borrow and repay
    /// @param principal Amount of ERC-20 tokens requested from a lender
    /// @param interest Fixed interest owed on repayment
    /// @param dueDate Unix timestamp by which repayment must occur
    function createLoanOffer(
        address nft,
        uint256 tokenId,
        address paymentToken,
        uint256 principal,
        uint256 interest,
        uint64 dueDate
    ) external returns (uint256 loanId) {
        if (principal == 0 || nft == address(0) || paymentToken == address(0)) revert InvalidLoan();
        if (dueDate <= block.timestamp) revert InvalidLoan();
        if (dueDate - block.timestamp > MAX_LOAN_DURATION) revert InvalidLoan();

        IERC721(nft).safeTransferFrom(msg.sender, address(this), tokenId);

        loanId = nextLoanId++;
        loans[loanId] = LoanOffer({
            borrower: msg.sender,
            lender: address(0),
            nft: nft,
            paymentToken: paymentToken,
            tokenId: tokenId,
            principal: principal,
            interest: interest,
            dueDate: dueDate,
            state: LoanState.Listed
        });

        emit LoanOffered(loanId, msg.sender, nft, tokenId, paymentToken, principal, interest, dueDate);
    }

    /// @notice Cancels an unfunded offer and returns the NFT to the borrower.
    function cancelLoanOffer(uint256 loanId) external {
        LoanOffer storage loan = loans[loanId];
        if (loan.borrower == address(0)) revert InvalidLoan();
        if (loan.state != LoanState.Listed) revert InvalidState();
        if (loan.borrower != msg.sender) revert NotAuthorized();

        loan.state = LoanState.Cancelled;
        IERC721(loan.nft).safeTransferFrom(address(this), loan.borrower, loan.tokenId);

        emit LoanCancelled(loanId);
    }

    /// @notice A lender funds an offer by transferring ERC-20 principal to the borrower.
    function fundLoan(uint256 loanId) external nonReentrant {
        LoanOffer storage loan = loans[loanId];
        if (loan.borrower == address(0)) revert InvalidLoan();
        if (loan.state != LoanState.Listed) revert InvalidState();
        if (loan.dueDate <= block.timestamp) revert InvalidState();

        loan.lender = msg.sender;
        loan.state = LoanState.Funded;

        IERC20(loan.paymentToken).safeTransferFrom(msg.sender, loan.borrower, loan.principal);

        emit LoanFunded(loanId, msg.sender, loan.paymentToken, loan.principal);
    }

    /// @notice Borrower repays principal + interest before the due date to reclaim their NFT.
    function repayLoan(uint256 loanId) external nonReentrant {
        LoanOffer storage loan = loans[loanId];
        if (loan.borrower == address(0)) revert InvalidLoan();
        if (loan.state != LoanState.Funded) revert InvalidState();
        if (loan.borrower != msg.sender) revert NotAuthorized();
        if (block.timestamp > loan.dueDate) revert InvalidState();

        uint256 payoff = loan.principal + loan.interest;

        loan.state = LoanState.Repaid;

        IERC20(loan.paymentToken).safeTransferFrom(msg.sender, loan.lender, payoff);

        IERC721(loan.nft).safeTransferFrom(address(this), loan.borrower, loan.tokenId);

        emit LoanRepaid(loanId, msg.sender);
    }

    /// @notice Lender claims the NFT collateral if the loan is overdue.
    function claimDefault(uint256 loanId) external {
        LoanOffer storage loan = loans[loanId];
        if (loan.borrower == address(0)) revert InvalidLoan();
        if (loan.state != LoanState.Funded) revert InvalidState();
        if (loan.lender != msg.sender) revert NotAuthorized();
        if (block.timestamp <= loan.dueDate) revert InvalidState();

        loan.state = LoanState.Defaulted;

        IERC721(loan.nft).safeTransferFrom(address(this), loan.lender, loan.tokenId);

        emit LoanDefaulted(loanId, msg.sender);
    }

    /// @notice Exposes complete loan details for off-chain consumers.
    function getLoan(uint256 loanId) external view returns (LoanOffer memory) {
        LoanOffer memory loan = loans[loanId];
        if (loan.borrower == address(0)) revert InvalidLoan();
        return loan;
    }

    /// @notice Allows marketplace / wallet transfers via safeTransferFrom.
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
