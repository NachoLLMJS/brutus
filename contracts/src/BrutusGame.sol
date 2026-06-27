// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20Lite {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

abstract contract BrutusReentrancyGuard {
    uint256 private _entered;

    modifier nonReentrant() {
        require(_entered == 0, "reentrant");
        _entered = 1;
        _;
        _entered = 0;
    }
}

interface IBrutusRegistryView {
    function ownerOfBrute(uint256 bruteId) external view returns (address);
}

contract BrutusRegistry is BrutusReentrancyGuard {
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BASE_BRUTE_LIMIT = 3;

    IERC20Lite public gameToken;
    address public rewardReceiver;
    address public operator;
    uint256 public nextBruteId = 1;
    uint256 public baseExtraPrice;

    mapping(uint256 => address) public ownerOfBrute;
    mapping(uint256 => bytes32) public metadataHashOf;
    mapping(address => uint256) public bruteCount;
    mapping(address => uint256) public extraBruteCount;

    event BruteCreated(address indexed owner, uint256 indexed bruteId, bytes32 metadataHash, bool extra, uint256 tokenPaid);
    event ExtraBrutePayment(address indexed owner, uint256 indexed bruteId, uint256 burned, uint256 rewarded);
    event RewardReceiverUpdated(address indexed rewardReceiver);
    event GameTokenUpdated(address indexed gameToken);
    event BaseExtraPriceUpdated(uint256 baseExtraPrice);
    event OperatorUpdated(address indexed operator);

    modifier onlyOperator() {
        require(msg.sender == operator, "only operator");
        _;
    }

    constructor(address token_, address rewardReceiver_, uint256 baseExtraPrice_, address operator_) {
        require(rewardReceiver_ != address(0), "reward receiver required");
        gameToken = IERC20Lite(token_);
        rewardReceiver = rewardReceiver_;
        baseExtraPrice = baseExtraPrice_;
        operator = operator_ == address(0) ? msg.sender : operator_;
    }

    function createBaseBrute(bytes32 metadataHash) external nonReentrant returns (uint256 bruteId) {
        require(metadataHash != bytes32(0), "metadata hash required");
        require(bruteCount[msg.sender] < BASE_BRUTE_LIMIT, "base brute limit reached");
        bruteId = _mintBrute(msg.sender, metadataHash, false, 0);
    }

    function createExtraBrute(bytes32 metadataHash) external nonReentrant returns (uint256 bruteId) {
        require(metadataHash != bytes32(0), "metadata hash required");
        require(bruteCount[msg.sender] >= BASE_BRUTE_LIMIT, "base brutes available");
        uint256 price = extraBrutePrice(msg.sender);
        require(address(gameToken) != address(0), "game token not set");
        require(price > 0, "price required");
        require(gameToken.transferFrom(msg.sender, address(this), price), "token payment failed");

        uint256 burned = price / 2;
        uint256 rewarded = price - burned;
        require(gameToken.transfer(BURN_ADDRESS, burned), "burn transfer failed");
        require(gameToken.transfer(rewardReceiver, rewarded), "reward transfer failed");

        extraBruteCount[msg.sender] += 1;
        bruteId = _mintBrute(msg.sender, metadataHash, true, price);
        emit ExtraBrutePayment(msg.sender, bruteId, burned, rewarded);
    }

    function extraBrutePrice(address user) public view returns (uint256) {
        uint256 extras = extraBruteCount[user];
        if (extras >= 16) return baseExtraPrice * 65536;
        return baseExtraPrice * (2 ** extras);
    }

    function setRewardReceiver(address newReceiver) external onlyOperator {
        require(newReceiver != address(0), "reward receiver required");
        rewardReceiver = newReceiver;
        emit RewardReceiverUpdated(newReceiver);
    }

    function setGameToken(address newToken) external onlyOperator {
        require(newToken != address(0), "token required");
        require(address(gameToken) == address(0), "game token already set");
        gameToken = IERC20Lite(newToken);
        emit GameTokenUpdated(newToken);
    }

    function setBaseExtraPrice(uint256 newPrice) external onlyOperator {
        require(newPrice > 0, "price required");
        baseExtraPrice = newPrice;
        emit BaseExtraPriceUpdated(newPrice);
    }

    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "operator required");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    function _mintBrute(address owner, bytes32 metadataHash, bool extra, uint256 tokenPaid) private returns (uint256 bruteId) {
        bruteId = nextBruteId++;
        ownerOfBrute[bruteId] = owner;
        metadataHashOf[bruteId] = metadataHash;
        bruteCount[owner] += 1;
        emit BruteCreated(owner, bruteId, metadataHash, extra, tokenPaid);
    }
}

contract BrutusDailyActions {
    uint8 public constant DAILY_ACTION_LIMIT = 3;
    IBrutusRegistryView public immutable registry;
    mapping(uint256 => mapping(uint256 => uint8)) public actionsUsed;

    event DailyActionUsed(address indexed user, uint256 indexed bruteId, uint256 indexed day, uint8 used);

    constructor(address registry_) {
        require(registry_ != address(0), "registry required");
        registry = IBrutusRegistryView(registry_);
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

contract BrutusRewardPool is BrutusReentrancyGuard {
    uint256 public constant REWARD_PRECISION = 1e18;

    IERC20Lite public stakingToken;
    address public operator;
    uint256 public immutable minimumEligibleStake;
    uint256 public totalStaked;
    uint256 public totalRewardShares;
    uint256 public accRewardPerShare;
    uint256 public totalBnbRewardsReceived;

    mapping(address => uint256) public staked;
    mapping(address => uint256) public rewardShares;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public pendingRewards;

    event Staked(address indexed user, uint256 amount, uint256 totalUserStake, uint256 rewardShares);
    event Unstaked(address indexed user, uint256 amount, uint256 totalUserStake, uint256 rewardShares);
    event TaxRewardsDeposited(address indexed from, uint256 amount, uint256 accRewardPerShare);
    event RewardsClaimed(address indexed user, uint256 amount);
    event StakingTokenUpdated(address indexed stakingToken);
    event OperatorUpdated(address indexed operator);

    modifier onlyOperator() {
        require(msg.sender == operator, "only operator");
        _;
    }

    constructor(address stakingToken_, uint256 minimumEligibleStake_, address operator_) {
        require(minimumEligibleStake_ > 0, "minimum stake required");
        stakingToken = IERC20Lite(stakingToken_);
        minimumEligibleStake = minimumEligibleStake_;
        operator = operator_ == address(0) ? msg.sender : operator_;
    }

    function setStakingToken(address newToken) external onlyOperator {
        require(newToken != address(0), "token required");
        require(address(stakingToken) == address(0), "staking token already set");
        stakingToken = IERC20Lite(newToken);
        emit StakingTokenUpdated(newToken);
    }

    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "operator required");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    receive() external payable {
        _depositTaxRewards();
    }

    function depositTaxRewards() external payable {
        _depositTaxRewards();
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "amount required");
        require(address(stakingToken) != address(0), "staking token not set");
        _syncRewards(msg.sender);
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "stake transfer failed");
        totalStaked += amount;
        staked[msg.sender] += amount;
        _refreshShares(msg.sender);
        emit Staked(msg.sender, amount, staked[msg.sender], rewardShares[msg.sender]);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "amount required");
        require(staked[msg.sender] >= amount, "insufficient stake");
        _syncRewards(msg.sender);
        staked[msg.sender] -= amount;
        totalStaked -= amount;
        require(stakingToken.transfer(msg.sender, amount), "unstake transfer failed");
        _refreshShares(msg.sender);
        emit Unstaked(msg.sender, amount, staked[msg.sender], rewardShares[msg.sender]);
    }

    function claimRewards() external nonReentrant {
        _syncRewards(msg.sender);
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "nothing to claim");
        pendingRewards[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "reward transfer failed");
        emit RewardsClaimed(msg.sender, amount);
    }

    function claimable(address user) public view returns (uint256) {
        uint256 accumulated = (rewardShares[user] * accRewardPerShare) / REWARD_PRECISION;
        uint256 pending = pendingRewards[user];
        if (accumulated <= rewardDebt[user]) return pending;
        return pending + (accumulated - rewardDebt[user]);
    }

    function _depositTaxRewards() private {
        require(msg.value > 0, "reward required");
        require(totalRewardShares > 0, "no eligible stakers");
        accRewardPerShare += (msg.value * REWARD_PRECISION) / totalRewardShares;
        totalBnbRewardsReceived += msg.value;
        emit TaxRewardsDeposited(msg.sender, msg.value, accRewardPerShare);
    }

    function _syncRewards(address user) private {
        uint256 accumulated = (rewardShares[user] * accRewardPerShare) / REWARD_PRECISION;
        if (accumulated > rewardDebt[user]) pendingRewards[user] += accumulated - rewardDebt[user];
        rewardDebt[user] = accumulated;
    }

    function _refreshShares(address user) private {
        uint256 oldShares = rewardShares[user];
        uint256 newShares = staked[user] >= minimumEligibleStake ? staked[user] : 0;
        if (oldShares != newShares) {
            totalRewardShares = totalRewardShares - oldShares + newShares;
            rewardShares[user] = newShares;
        }
        rewardDebt[user] = (newShares * accRewardPerShare) / REWARD_PRECISION;
    }
}

contract BrutusArenaEscrow is BrutusReentrancyGuard {
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

    IBrutusRegistryView public immutable registry;
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
    event ResolverUpdated(address indexed resolver);

    constructor(address registry_, address resolver_, address feeReceiver_, uint16 feeBps_) {
        require(registry_ != address(0), "registry required");
        require(resolver_ != address(0), "resolver required");
        require(feeReceiver_ != address(0), "fee receiver required");
        require(feeBps_ <= 1000, "fee too high");
        registry = IBrutusRegistryView(registry_);
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
        challenges[challengeId] = Challenge({
            creator: msg.sender,
            acceptor: address(0),
            creatorBruteId: bruteId,
            acceptorBruteId: 0,
            stakeToken: stakeToken,
            amount: amount,
            createdAt: block.timestamp,
            acceptedAt: 0,
            winnerBruteId: 0,
            fightHash: bytes32(0),
            resolved: false,
            claimed: false,
            refunded: false
        });
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

    function cancelUnacceptedChallenge(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];
        require(c.creator == msg.sender, "not creator");
        require(c.acceptor == address(0), "already accepted");
        require(!c.refunded, "already refunded");
        c.refunded = true;
        bruteInActiveChallenge[c.creatorBruteId] = false;
        _sendStake(c.stakeToken, c.creator, c.amount);
        emit ChallengeRefunded(challengeId);
    }

    function refundExpiredAcceptedChallenge(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];
        require(c.acceptor != address(0), "not accepted");
        require(!c.resolved, "already resolved");
        require(!c.refunded, "already refunded");
        require(block.timestamp >= c.acceptedAt + resolveTimeout, "not expired");
        c.refunded = true;
        bruteInActiveChallenge[c.creatorBruteId] = false;
        bruteInActiveChallenge[c.acceptorBruteId] = false;
        _sendStake(c.stakeToken, c.creator, c.amount);
        _sendStake(c.stakeToken, c.acceptor, c.amount);
        emit ChallengeRefunded(challengeId);
    }

    function _collectStake(address token, uint256 amount) private {
        if (token == address(0)) {
            require(msg.value == amount, "wrong bnb amount");
        } else {
            require(msg.value == 0, "bnb not accepted");
            require(IERC20Lite(token).transferFrom(msg.sender, address(this), amount), "stake transfer failed");
        }
    }

    function _sendStake(address token, address to, uint256 amount) private {
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            require(ok, "bnb transfer failed");
        } else {
            require(IERC20Lite(token).transfer(to, amount), "token transfer failed");
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
