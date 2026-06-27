// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {VaultBaseV2} from "./flap/VaultBaseV2.sol";
import {VaultFactoryBaseV2} from "./flap/VaultFactoryBaseV2.sol";
import {IVaultFactoryValidationV2} from "./flap/IVaultFactory.sol";
import {
    VaultUISchema,
    VaultMethodSchema,
    VaultDataSchema,
    FieldDescriptor,
    ApproveAction
} from "./flap/IVaultSchemasV1.sol";

interface IRewardReceiver {
    function depositTaxRewards() external payable;
}

interface IBrutusRewardPoolView {
    function totalStaked() external view returns (uint256);
    function totalRewardShares() external view returns (uint256);
    function totalBnbRewardsReceived() external view returns (uint256);
    function claimable(address user) external view returns (uint256);
}

interface IERC20LiteForVault {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

abstract contract VaultReentrancyGuard {
    uint256 private _entered;

    modifier nonReentrant() {
        require(_entered == 0, "reentrant");
        _entered = 1;
        _;
        _entered = 0;
    }
}

contract BrutusBloodVault is VaultBaseV2, VaultReentrancyGuard {
    address public taxToken;
    address public rewardReceiver;
    address public operator;
    uint256 public totalTaxRewardsReceived;
    uint256 public totalTaxRewardsForwarded;

    event RewardReceiverUpdated(address indexed rewardReceiver);
    event OperatorUpdated(address indexed operator);
    event TaxRewardsReceived(address indexed from, uint256 amount, uint256 totalReceived);
    event TaxRewardsForwarded(address indexed rewardReceiver, uint256 amount, uint256 totalForwarded);
    event EmergencyWithdrawNative(address indexed to, uint256 amount);
    event EmergencyWithdrawToken(address indexed token, address indexed to, uint256 amount);

    modifier onlyOperatorOrGuardian() {
        require(msg.sender == operator || msg.sender == _getGuardian(), "only operator or guardian");
        _;
    }

    constructor(address taxToken_, address rewardReceiver_, address operator_) {
        taxToken = taxToken_;
        rewardReceiver = rewardReceiver_;
        operator = operator_ == address(0) ? msg.sender : operator_;
    }

    receive() external payable {
        totalTaxRewardsReceived += msg.value;
        emit TaxRewardsReceived(msg.sender, msg.value, totalTaxRewardsReceived);
    }

    function setRewardReceiver(address newReceiver) external onlyOperatorOrGuardian {
        require(newReceiver != address(0), "reward receiver required");
        rewardReceiver = newReceiver;
        emit RewardReceiverUpdated(newReceiver);
    }

    function setOperator(address newOperator) external onlyOperatorOrGuardian {
        require(newOperator != address(0), "operator required");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    function forwardTaxRewards(uint256 amountWei) external onlyOperatorOrGuardian nonReentrant {
        require(rewardReceiver != address(0), "reward receiver required");
        require(amountWei > 0, "amount required");
        require(amountWei <= address(this).balance, "insufficient balance");
        totalTaxRewardsForwarded += amountWei;
        IRewardReceiver(rewardReceiver).depositTaxRewards{value: amountWei}();
        emit TaxRewardsForwarded(rewardReceiver, amountWei, totalTaxRewardsForwarded);
    }

    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function rewardPoolTotalStaked() external view returns (uint256) {
        if (rewardReceiver == address(0)) return 0;
        return IBrutusRewardPoolView(rewardReceiver).totalStaked();
    }

    function rewardPoolTotalRewardShares() external view returns (uint256) {
        if (rewardReceiver == address(0)) return 0;
        return IBrutusRewardPoolView(rewardReceiver).totalRewardShares();
    }

    function rewardPoolTotalBnbReceived() external view returns (uint256) {
        if (rewardReceiver == address(0)) return 0;
        return IBrutusRewardPoolView(rewardReceiver).totalBnbRewardsReceived();
    }

    function rewardPoolClaimable(address user) external view returns (uint256) {
        if (rewardReceiver == address(0)) return 0;
        return IBrutusRewardPoolView(rewardReceiver).claimable(user);
    }

    function emergencyWithdrawNative(address to) external onlyGuardian nonReentrant {
        require(to != address(0), "to required");
        uint256 bal = address(this).balance;
        (bool ok,) = to.call{value: bal}("");
        require(ok, "native transfer failed");
        emit EmergencyWithdrawNative(to, bal);
    }

    function emergencyWithdrawToken(address token, address to) external onlyGuardian nonReentrant {
        require(token != address(0), "token required");
        require(to != address(0), "to required");
        uint256 bal = IERC20LiteForVault(token).balanceOf(address(this));
        require(IERC20LiteForVault(token).transfer(to, bal), "token transfer failed");
        emit EmergencyWithdrawToken(token, to, bal);
    }

    function description() public view override returns (string memory) {
        if (totalTaxRewardsReceived == 0) {
            return "BrutusBloodVault: waiting for Flap tax revenue. Revenue can be forwarded to the Brutus staking reward pool.";
        }
        return "BrutusBloodVault: BNB tax revenue is accumulating for Brutus token stakers and game rewards.";
    }

    function vaultUISchema() public pure override returns (VaultUISchema memory schema) {
        schema.vaultType = "BrutusBloodVault";
        schema.description = "Receives BNB tax revenue from the Flap-launched Brutus token and forwards it to the Brutus staking reward pool.";
        schema.methods = new VaultMethodSchema[](7);

        schema.methods[0].name = "taxToken";
        schema.methods[0].description = "Brutus token launched through Flap and connected to this vault.";
        schema.methods[0].inputs = new FieldDescriptor[](0);
        schema.methods[0].outputs = new FieldDescriptor[](1);
        schema.methods[0].outputs[0] = FieldDescriptor("taxToken", "address", "Brutus token address", 0);
        schema.methods[0].approvals = new ApproveAction[](0);

        schema.methods[1].name = "vaultBalance";
        schema.methods[1].description = "Current BNB balance held by the vault before forwarding to rewards.";
        schema.methods[1].inputs = new FieldDescriptor[](0);
        schema.methods[1].outputs = new FieldDescriptor[](1);
        schema.methods[1].outputs[0] = FieldDescriptor("balance", "uint256", "Current vault BNB balance", 18);
        schema.methods[1].approvals = new ApproveAction[](0);

        schema.methods[2].name = "totalTaxRewardsReceived";
        schema.methods[2].description = "Lifetime BNB tax revenue received by this vault.";
        schema.methods[2].inputs = new FieldDescriptor[](0);
        schema.methods[2].outputs = new FieldDescriptor[](1);
        schema.methods[2].outputs[0] = FieldDescriptor("amount", "uint256", "Total received BNB", 18);
        schema.methods[2].approvals = new ApproveAction[](0);

        schema.methods[3].name = "totalTaxRewardsForwarded";
        schema.methods[3].description = "Lifetime BNB forwarded from this vault to the Brutus reward pool.";
        schema.methods[3].inputs = new FieldDescriptor[](0);
        schema.methods[3].outputs = new FieldDescriptor[](1);
        schema.methods[3].outputs[0] = FieldDescriptor("amount", "uint256", "Total forwarded BNB", 18);
        schema.methods[3].approvals = new ApproveAction[](0);

        schema.methods[4].name = "rewardReceiver";
        schema.methods[4].description = "Brutus reward pool receiving forwarded BNB tax revenue.";
        schema.methods[4].inputs = new FieldDescriptor[](0);
        schema.methods[4].outputs = new FieldDescriptor[](1);
        schema.methods[4].outputs[0] = FieldDescriptor("rewardReceiver", "address", "Reward receiver contract", 0);
        schema.methods[4].approvals = new ApproveAction[](0);

        schema.methods[5].name = "rewardPoolTotalStaked";
        schema.methods[5].description = "Total Brutus token amount staked for reward eligibility.";
        schema.methods[5].inputs = new FieldDescriptor[](0);
        schema.methods[5].outputs = new FieldDescriptor[](1);
        schema.methods[5].outputs[0] = FieldDescriptor("totalStaked", "uint256", "Total staked token amount", 18);
        schema.methods[5].approvals = new ApproveAction[](0);

        schema.methods[6].name = "rewardPoolClaimable";
        schema.methods[6].description = "BNB reward amount currently claimable by a staking wallet.";
        schema.methods[6].inputs = new FieldDescriptor[](1);
        schema.methods[6].inputs[0] = FieldDescriptor("user", "address", "User wallet", 0);
        schema.methods[6].outputs = new FieldDescriptor[](1);
        schema.methods[6].outputs[0] = FieldDescriptor("claimable", "uint256", "Claimable BNB", 18);
        schema.methods[6].approvals = new ApproveAction[](0);
    }
}

contract BrutusBloodVaultFactory is VaultFactoryBaseV2 {
    event BrutusVaultCreated(address indexed vault, address indexed taxToken, address indexed rewardReceiver, address operator);

    function newVault(address taxToken, address quoteToken, address creator, bytes calldata vaultData)
        external
        override
        returns (address vault)
    {
        require(msg.sender == _getVaultPortal(), "only VaultPortal");
        require(quoteToken == address(0), "only BNB quote token");
        (address rewardReceiver, address operator) = abi.decode(vaultData, (address, address));
        address finalOperator = operator == address(0) ? creator : operator;
        vault = address(new BrutusBloodVault(taxToken, rewardReceiver, finalOperator));
        emit BrutusVaultCreated(vault, taxToken, rewardReceiver, finalOperator);
    }

    function isQuoteTokenSupported(address quoteToken) external pure override returns (bool supported) {
        supported = quoteToken == address(0);
    }

    function vaultDataSchema() public pure override returns (VaultDataSchema memory schema) {
        schema.description = "Creates a BrutusBloodVault. rewardReceiver can be zero during token launch, then set later to BrutusRewardPool. operator can be zero to default to the launch creator.";
        schema.fields = new FieldDescriptor[](2);
        schema.fields[0] = FieldDescriptor("rewardReceiver", "address", "BrutusRewardPool address, or zero if it will be set after token launch", 0);
        schema.fields[1] = FieldDescriptor("operator", "address", "Operator wallet allowed to forward rewards; zero defaults to creator", 0);
        schema.isArray = false;
    }

    function _validateBeforeLaunch(IVaultFactoryValidationV2.LaunchValidationDataV1 memory data)
        internal
        pure
        override
        returns (bool success, string memory reason)
    {
        if (data.quoteToken != address(0)) return (false, "BrutusBloodVault only supports BNB quote token");
        return (true, "");
    }
}
