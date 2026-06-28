// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20LiteV3 {
    function balanceOf(address account) external view returns (uint256);
}

abstract contract ReentrancyGuardV3 {
    uint256 private _entered;
    modifier nonReentrant() {
        require(_entered == 0, "reentrant");
        _entered = 1;
        _;
        _entered = 0;
    }
}

contract BrutusRegistryV3 is ReentrancyGuardV3 {
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BASE_BRUTE_LIMIT = 3;

    IERC20LiteV3 public immutable gameToken;
    address payable public vaultReceiver;
    address public operator;
    uint256 public nextBruteId = 1;
    uint256 public extraBrutePriceWei;

    mapping(uint256 => address) public ownerOfBrute;
    mapping(uint256 => bytes32) public metadataHashOf;
    mapping(address => uint256) public bruteCount;
    mapping(address => uint256) public paidExtraBruteCount;

    event BruteCreated(address indexed owner, uint256 indexed bruteId, bytes32 metadataHash, bool extra, uint256 bnbPaid);
    event ExtraBrutePayment(address indexed owner, uint256 indexed bruteId, uint256 toVault, uint256 burned);

    modifier onlyOperator() {
        require(msg.sender == operator, "only operator");
        _;
    }

    constructor(address token_, address payable vaultReceiver_, uint256 extraBrutePriceWei_, address operator_) {
        require(token_ != address(0), "token required");
        require(vaultReceiver_ != address(0), "vault required");
        require(extraBrutePriceWei_ > 0, "price required");
        gameToken = IERC20LiteV3(token_);
        vaultReceiver = vaultReceiver_;
        extraBrutePriceWei = extraBrutePriceWei_;
        operator = operator_ == address(0) ? msg.sender : operator_;
    }

    function createBaseBrute(bytes32 metadataHash) external nonReentrant returns (uint256 bruteId) {
        require(metadataHash != bytes32(0), "metadata hash required");
        require(bruteCount[msg.sender] < BASE_BRUTE_LIMIT, "base brute limit reached");
        bruteId = _mintBrute(msg.sender, metadataHash, false, 0);
    }

    // V3 intentionally allows paid extras even if older local brutes were not minted on-chain.
    // The backend/UI only exposes this after 3 local brutes, but the contract itself accepts payment.
    function createExtraBrute(bytes32 metadataHash) external payable nonReentrant returns (uint256 bruteId) {
        require(metadataHash != bytes32(0), "metadata hash required");
        uint256 price = extraBrutePrice(msg.sender);
        require(msg.value == price, "wrong BNB amount");

        uint256 toVault = msg.value;
        uint256 burned = 0;
        (bool okVault,) = vaultReceiver.call{value: toVault}("");
        require(okVault, "vault transfer failed");

        paidExtraBruteCount[msg.sender] += 1;
        bruteId = _mintBrute(msg.sender, metadataHash, true, msg.value);
        emit ExtraBrutePayment(msg.sender, bruteId, toVault, burned);
    }

    function extraBrutePrice(address user) public view returns (uint256) {
        uint256 extras = paidExtraBruteCount[user];
        if (extras >= 16) return extraBrutePriceWei * 65536;
        return extraBrutePriceWei * (2 ** extras);
    }

    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "operator required");
        operator = newOperator;
    }

    function _mintBrute(address owner, bytes32 metadataHash, bool extra, uint256 bnbPaid) private returns (uint256 bruteId) {
        bruteId = nextBruteId++;
        ownerOfBrute[bruteId] = owner;
        metadataHashOf[bruteId] = metadataHash;
        bruteCount[owner] += 1;
        emit BruteCreated(owner, bruteId, metadataHash, extra, bnbPaid);
    }
}

contract BrutusCombatRewardsV3 is ReentrancyGuardV3 {
    IERC20LiteV3 public immutable gameToken;
    address public operator;
    uint256 public minimumTokenHold;
    uint256 public claimAmountWei;
    uint256 public maxOperatorGasRefundWei;
    uint256 public totalDeposited;
    uint256 public totalClaimed;
    uint256 public totalOperatorGasRefunded;

    mapping(bytes32 => address) public fightWinner;
    mapping(bytes32 => bool) public fightClaimed;

    event CombatRewardFunded(address indexed from, uint256 amount, uint256 totalDeposited);
    event CombatWinRecorded(bytes32 indexed fightId, address indexed winner);
    event CombatRewardClaimed(bytes32 indexed fightId, address indexed winner, uint256 amount);
    event OperatorGasRefunded(address indexed operator, bytes32 indexed fightId, uint256 amount);
    event OperatorGasRefundCapUpdated(uint256 maxOperatorGasRefundWei);

    modifier onlyOperator() {
        require(msg.sender == operator, "only operator");
        _;
    }

    constructor(
        address token_,
        uint256 minimumTokenHold_,
        uint256 claimAmountWei_,
        address operator_,
        uint256 maxOperatorGasRefundWei_
    ) {
        require(token_ != address(0), "token required");
        require(minimumTokenHold_ > 0, "minimum hold required");
        require(claimAmountWei_ > 0, "claim amount required");
        gameToken = IERC20LiteV3(token_);
        minimumTokenHold = minimumTokenHold_;
        claimAmountWei = claimAmountWei_;
        operator = operator_ == address(0) ? msg.sender : operator_;
        maxOperatorGasRefundWei = maxOperatorGasRefundWei_;
    }

    receive() external payable { _recordFunding(); }
    function depositRewards() external payable { _recordFunding(); }

    function recordCombatWin(bytes32 fightId, address winner) external onlyOperator nonReentrant {
        uint256 gasStart = gasleft();
        require(fightId != bytes32(0), "fight id required");
        require(winner != address(0), "winner required");
        require(fightWinner[fightId] == address(0), "fight already recorded");
        fightWinner[fightId] = winner;
        emit CombatWinRecorded(fightId, winner);
        _refundOperatorGas(fightId, gasStart);
    }

    function setMaxOperatorGasRefundWei(uint256 newMaxOperatorGasRefundWei) external onlyOperator {
        maxOperatorGasRefundWei = newMaxOperatorGasRefundWei;
        emit OperatorGasRefundCapUpdated(newMaxOperatorGasRefundWei);
    }

    function canClaim(bytes32 fightId, address user) external view returns (bool ok, string memory reason) {
        if (fightWinner[fightId] != user) return (false, "not winner");
        if (fightClaimed[fightId]) return (false, "already claimed");
        if (gameToken.balanceOf(user) < minimumTokenHold) return (false, "needs 10000 tokens");
        if (address(this).balance < claimAmountWei) return (false, "reward pool empty");
        return (true, "");
    }

    function claimCombatReward(bytes32 fightId) external nonReentrant {
        require(fightWinner[fightId] == msg.sender, "not winner");
        require(!fightClaimed[fightId], "already claimed");
        require(gameToken.balanceOf(msg.sender) >= minimumTokenHold, "needs 10000 tokens");
        require(address(this).balance >= claimAmountWei, "reward pool empty");
        fightClaimed[fightId] = true;
        totalClaimed += claimAmountWei;
        (bool ok,) = msg.sender.call{value: claimAmountWei}("");
        require(ok, "claim transfer failed");
        emit CombatRewardClaimed(fightId, msg.sender, claimAmountWei);
    }

    function _refundOperatorGas(bytes32 fightId, uint256 gasStart) private {
        uint256 cap = maxOperatorGasRefundWei;
        if (cap == 0) {
            emit OperatorGasRefunded(msg.sender, fightId, 0);
            return;
        }

        uint256 gasUsed = gasStart - gasleft() + 32_000;
        uint256 refund = gasUsed * tx.gasprice;
        if (refund > cap) refund = cap;

        uint256 balance = address(this).balance;
        if (balance <= claimAmountWei) {
            emit OperatorGasRefunded(msg.sender, fightId, 0);
            return;
        }
        uint256 refundableBalance = balance - claimAmountWei;
        if (refund > refundableBalance) refund = refundableBalance;
        if (refund == 0) {
            emit OperatorGasRefunded(msg.sender, fightId, 0);
            return;
        }

        totalOperatorGasRefunded += refund;
        (bool ok,) = payable(msg.sender).call{value: refund}("");
        if (ok) {
            emit OperatorGasRefunded(msg.sender, fightId, refund);
        } else {
            totalOperatorGasRefunded -= refund;
            emit OperatorGasRefunded(msg.sender, fightId, 0);
        }
    }

    function _recordFunding() private {
        require(msg.value > 0, "reward required");
        totalDeposited += msg.value;
        emit CombatRewardFunded(msg.sender, msg.value, totalDeposited);
    }
}
