// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20LiteV2 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

abstract contract BrutusReentrancyGuardV2 {
    uint256 private _entered;

    modifier nonReentrant() {
        require(_entered == 0, "reentrant");
        _entered = 1;
        _;
        _entered = 0;
    }
}

interface IBrutusRegistryV2View {
    function ownerOfBrute(uint256 bruteId) external view returns (address);
}

contract BrutusRegistryV2 is BrutusReentrancyGuardV2 {
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BASE_BRUTE_LIMIT = 3;

    IERC20LiteV2 public immutable gameToken;
    address payable public vaultReceiver;
    address public operator;
    uint256 public nextBruteId = 1;
    uint256 public extraBrutePriceWei;

    mapping(uint256 => address) public ownerOfBrute;
    mapping(uint256 => bytes32) public metadataHashOf;
    mapping(address => uint256) public bruteCount;
    mapping(address => uint256) public extraBruteCount;

    event BruteCreated(address indexed owner, uint256 indexed bruteId, bytes32 metadataHash, bool extra, uint256 bnbPaid);
    event ExtraBrutePayment(address indexed owner, uint256 indexed bruteId, uint256 toVault, uint256 burned);
    event VaultReceiverUpdated(address indexed vaultReceiver);
    event ExtraBrutePriceUpdated(uint256 extraBrutePriceWei);
    event OperatorUpdated(address indexed operator);

    modifier onlyOperator() {
        require(msg.sender == operator, "only operator");
        _;
    }

    constructor(address token_, address payable vaultReceiver_, uint256 extraBrutePriceWei_, address operator_) {
        require(token_ != address(0), "token required");
        require(vaultReceiver_ != address(0), "vault required");
        require(extraBrutePriceWei_ > 0, "price required");
        gameToken = IERC20LiteV2(token_);
        vaultReceiver = vaultReceiver_;
        extraBrutePriceWei = extraBrutePriceWei_;
        operator = operator_ == address(0) ? msg.sender : operator_;
    }

    function createBaseBrute(bytes32 metadataHash) external nonReentrant returns (uint256 bruteId) {
        require(metadataHash != bytes32(0), "metadata hash required");
        require(bruteCount[msg.sender] < BASE_BRUTE_LIMIT, "base brute limit reached");
        bruteId = _mintBrute(msg.sender, metadataHash, false, 0);
    }

    function createExtraBrute(bytes32 metadataHash) external payable nonReentrant returns (uint256 bruteId) {
        require(metadataHash != bytes32(0), "metadata hash required");
        require(bruteCount[msg.sender] >= BASE_BRUTE_LIMIT, "base brutes available");
        uint256 price = extraBrutePrice(msg.sender);
        require(msg.value == price, "wrong BNB amount");

        uint256 toVault = msg.value / 2;
        uint256 burned = msg.value - toVault;
        (bool okVault,) = vaultReceiver.call{value: toVault}("");
        require(okVault, "vault transfer failed");
        (bool okBurn,) = payable(BURN_ADDRESS).call{value: burned}("");
        require(okBurn, "burn transfer failed");

        extraBruteCount[msg.sender] += 1;
        bruteId = _mintBrute(msg.sender, metadataHash, true, msg.value);
        emit ExtraBrutePayment(msg.sender, bruteId, toVault, burned);
    }

    function extraBrutePrice(address user) public view returns (uint256) {
        uint256 extras = extraBruteCount[user];
        if (extras >= 16) return extraBrutePriceWei * 65536;
        return extraBrutePriceWei * (2 ** extras);
    }

    function setVaultReceiver(address payable newReceiver) external onlyOperator {
        require(newReceiver != address(0), "vault required");
        vaultReceiver = newReceiver;
        emit VaultReceiverUpdated(newReceiver);
    }

    function setExtraBrutePrice(uint256 newPriceWei) external onlyOperator {
        require(newPriceWei > 0, "price required");
        extraBrutePriceWei = newPriceWei;
        emit ExtraBrutePriceUpdated(newPriceWei);
    }

    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "operator required");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    function _mintBrute(address owner, bytes32 metadataHash, bool extra, uint256 bnbPaid) private returns (uint256 bruteId) {
        bruteId = nextBruteId++;
        ownerOfBrute[bruteId] = owner;
        metadataHashOf[bruteId] = metadataHash;
        bruteCount[owner] += 1;
        emit BruteCreated(owner, bruteId, metadataHash, extra, bnbPaid);
    }
}

contract BrutusDailyActionsV2 {
    uint8 public constant DAILY_ACTION_LIMIT = 3;
    IBrutusRegistryV2View public immutable registry;
    mapping(uint256 => mapping(uint256 => uint8)) public actionsUsed;

    event DailyActionUsed(address indexed user, uint256 indexed bruteId, uint256 indexed day, uint8 used);

    constructor(address registry_) {
        require(registry_ != address(0), "registry required");
        registry = IBrutusRegistryV2View(registry_);
    }

    function currentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function useDailyAction(uint256 bruteId) external returns (uint8 used) {
        require(registry.ownerOfBrute(bruteId) == msg.sender, "not brute owner");
        uint256 day = currentDay();
        used = actionsUsed[bruteId][day];
        require(used < DAILY_ACTION_LIMIT, "daily actions exhausted");
        used += 1;
        actionsUsed[bruteId][day] = used;
        emit DailyActionUsed(msg.sender, bruteId, day, used);
    }

    function actionsRemaining(uint256 bruteId) external view returns (uint8) {
        uint8 used = actionsUsed[bruteId][currentDay()];
        if (used >= DAILY_ACTION_LIMIT) return 0;
        return DAILY_ACTION_LIMIT - used;
    }
}

contract BrutusCombatRewardsV2 is BrutusReentrancyGuardV2 {
    IERC20LiteV2 public immutable gameToken;
    IBrutusRegistryV2View public immutable registry;
    address public operator;
    uint256 public minimumTokenHold;
    uint256 public claimAmountWei;
    uint256 public totalDeposited;
    uint256 public totalClaimed;

    mapping(bytes32 => address) public fightWinner;
    mapping(bytes32 => uint256) public fightWinnerBruteId;
    mapping(bytes32 => bool) public fightClaimed;

    event CombatRewardFunded(address indexed from, uint256 amount, uint256 totalDeposited);
    event CombatWinRecorded(bytes32 indexed fightId, address indexed winner, uint256 indexed bruteId);
    event CombatRewardClaimed(bytes32 indexed fightId, address indexed winner, uint256 amount);
    event ClaimConfigUpdated(uint256 minimumTokenHold, uint256 claimAmountWei);
    event OperatorUpdated(address indexed operator);

    modifier onlyOperator() {
        require(msg.sender == operator, "only operator");
        _;
    }

    constructor(address token_, address registry_, uint256 minimumTokenHold_, uint256 claimAmountWei_, address operator_) {
        require(token_ != address(0), "token required");
        require(registry_ != address(0), "registry required");
        require(minimumTokenHold_ > 0, "minimum hold required");
        require(claimAmountWei_ > 0, "claim amount required");
        gameToken = IERC20LiteV2(token_);
        registry = IBrutusRegistryV2View(registry_);
        minimumTokenHold = minimumTokenHold_;
        claimAmountWei = claimAmountWei_;
        operator = operator_ == address(0) ? msg.sender : operator_;
    }

    receive() external payable {
        _recordFunding();
    }

    function depositRewards() external payable {
        _recordFunding();
    }

    function recordCombatWin(bytes32 fightId, address winner, uint256 winnerBruteId) external onlyOperator {
        require(fightId != bytes32(0), "fight id required");
        require(winner != address(0), "winner required");
        require(fightWinner[fightId] == address(0), "fight already recorded");
        require(registry.ownerOfBrute(winnerBruteId) == winner, "winner not brute owner");
        fightWinner[fightId] = winner;
        fightWinnerBruteId[fightId] = winnerBruteId;
        emit CombatWinRecorded(fightId, winner, winnerBruteId);
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

    function setClaimConfig(uint256 newMinimumTokenHold, uint256 newClaimAmountWei) external onlyOperator {
        require(newMinimumTokenHold > 0, "minimum hold required");
        require(newClaimAmountWei > 0, "claim amount required");
        minimumTokenHold = newMinimumTokenHold;
        claimAmountWei = newClaimAmountWei;
        emit ClaimConfigUpdated(newMinimumTokenHold, newClaimAmountWei);
    }

    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "operator required");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    function _recordFunding() private {
        require(msg.value > 0, "reward required");
        totalDeposited += msg.value;
        emit CombatRewardFunded(msg.sender, msg.value, totalDeposited);
    }
}

contract BrutusArenaEscrowV2 is BrutusReentrancyGuardV2 {
    struct Challenge {
        address creator;
        address acceptor;
        uint256 creatorBruteId;
        uint256 acceptorBruteId;
        address stakeToken;
        uint256 amount;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 winnerBruteId;
        bytes32 fightHash;
        bool resolved;
        bool claimed;
        bool refunded;
    }

    IBrutusRegistryV2View public immutable registry;
    address public resolver;
    address public feeReceiver;
    uint16 public feeBps;
    uint256 public resolveTimeout = 1 days;
    uint256 public nextChallengeId = 1;

    mapping(uint256 => Challenge) public challenges;
    mapping(uint256 => bool) public bruteInActiveChallenge;

    event ChallengeCreated(uint256 indexed challengeId, address indexed creator, uint256 indexed bruteId, address stakeToken, uint256 amount);
    event ChallengeAccepted(uint256 indexed challengeId, address indexed acceptor, uint256 indexed bruteId);
    event ChallengeResolved(uint256 indexed challengeId, uint256 indexed winnerBruteId, bytes32 fightHash);
    event WinningsClaimed(uint256 indexed challengeId, address indexed winner, uint256 payout, uint256 fee);
    event ChallengeRefunded(uint256 indexed challengeId);

    constructor(address registry_, address resolver_, address feeReceiver_, uint16 feeBps_) {
        require(registry_ != address(0), "registry required");
        require(resolver_ != address(0), "resolver required");
        require(feeReceiver_ != address(0), "fee receiver required");
        require(feeBps_ <= 1000, "fee too high");
        registry = IBrutusRegistryV2View(registry_);
        resolver = resolver_;
        feeReceiver = feeReceiver_;
        feeBps = feeBps_;
    }

    function createChallenge(uint256 bruteId, address stakeToken, uint256 amount) external payable nonReentrant returns (uint256 challengeId) {
        require(registry.ownerOfBrute(bruteId) == msg.sender, "not brute owner");
        require(!bruteInActiveChallenge[bruteId], "brute already active");
        require(amount > 0, "amount required");
        _collectStake(stakeToken, amount);
        bruteInActiveChallenge[bruteId] = true;
        challengeId = nextChallengeId++;
        challenges[challengeId] = Challenge(msg.sender, address(0), bruteId, 0, stakeToken, amount, block.timestamp, 0, 0, bytes32(0), false, false, false);
        emit ChallengeCreated(challengeId, msg.sender, bruteId, stakeToken, amount);
    }

    function acceptChallenge(uint256 challengeId, uint256 bruteId) external payable nonReentrant {
        Challenge storage c = challenges[challengeId];
        require(c.creator != address(0), "challenge not found");
        require(c.acceptor == address(0), "already accepted");
        require(!c.refunded, "challenge refunded");
        require(registry.ownerOfBrute(bruteId) == msg.sender, "not brute owner");
        require(!bruteInActiveChallenge[bruteId], "brute already active");
        require(bruteId != c.creatorBruteId, "same brute");
        _collectStake(c.stakeToken, c.amount);
        c.acceptor = msg.sender;
        c.acceptorBruteId = bruteId;
        c.acceptedAt = block.timestamp;
        bruteInActiveChallenge[bruteId] = true;
        emit ChallengeAccepted(challengeId, msg.sender, bruteId);
    }

    function resolveChallenge(uint256 challengeId, uint256 winnerBruteId, bytes32 fightHash, bytes calldata signature) external nonReentrant {
        Challenge storage c = challenges[challengeId];
        require(c.acceptor != address(0), "not accepted");
        require(!c.resolved, "already resolved");
        require(winnerBruteId == c.creatorBruteId || winnerBruteId == c.acceptorBruteId, "invalid winner");
        bytes32 digest = keccak256(abi.encodePacked(address(this), block.chainid, challengeId, winnerBruteId, fightHash));
        require(_recoverSigner(digest, signature) == resolver, "invalid resolver signature");
        c.resolved = true;
        c.winnerBruteId = winnerBruteId;
        c.fightHash = fightHash;
        bruteInActiveChallenge[c.creatorBruteId] = false;
        bruteInActiveChallenge[c.acceptorBruteId] = false;
        emit ChallengeResolved(challengeId, winnerBruteId, fightHash);
    }

    function claimWinnings(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];
        require(c.resolved, "not resolved");
        require(!c.claimed, "already claimed");
        address winner = c.winnerBruteId == c.creatorBruteId ? c.creator : c.acceptor;
        require(msg.sender == winner, "not winner");
        c.claimed = true;
        uint256 pot = c.amount * 2;
        uint256 fee = (pot * feeBps) / 10000;
        uint256 payout = pot - fee;
        _sendStake(c.stakeToken, winner, payout);
        if (fee > 0) _sendStake(c.stakeToken, feeReceiver, fee);
        emit WinningsClaimed(challengeId, winner, payout, fee);
    }

    function _collectStake(address token, uint256 amount) private {
        if (token == address(0)) {
            require(msg.value == amount, "wrong bnb amount");
        } else {
            require(msg.value == 0, "bnb not accepted");
            require(IERC20LiteV2(token).transferFrom(msg.sender, address(this), amount), "stake transfer failed");
        }
    }

    function _sendStake(address token, address to, uint256 amount) private {
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            require(ok, "bnb transfer failed");
        } else {
            require(IERC20LiteV2(token).transfer(to, amount), "token transfer failed");
        }
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) private pure returns (address) {
        require(signature.length == 65, "bad signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "bad signature v");
        return ecrecover(digest, v, r, s);
    }
}
