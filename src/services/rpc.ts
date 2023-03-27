import {
	AXIE_CONTRACT_ABI,
	SLP_CONTRACT_ABI,
	STAKING_CONTRACT_ABI,
	STAKING_MANAGER_CONTRACT_ABI,
} from "@constants/contracts/"
import {
	AXIE_CONTRACT_ADDRESS,
	AXS_STAKING_POOL_CONTRACT_ADDRESS,
	RON_AXS_LP_STAKING_POOL_CONTRACT_ADDRESS,
	RON_SLP_LP_STAKING_POOL_CONTRACT_ADDRESS,
	RON_USDC_LP_STAKING_POOL_CONTRACT_ADDRESS,
	RON_WETH_LP_STAKING_POOL_CONTRACT_ADDRESS,
	SLP_CONTRACT_ADDRESS,
	STAKING_MANAGER_CONTRACT_ADDRESS,
} from "@constants/contracts/addresses"
import { RONINCHAIN_PROXY_RPC_URL, RONINCHAIN_RPC_URL } from "@constants/url"
import { ethers } from "ethers"

export const RoninRPC = new ethers.providers.JsonRpcProvider(RONINCHAIN_RPC_URL)
export const rpcProxy = new ethers.providers.JsonRpcProvider(RONINCHAIN_PROXY_RPC_URL)

export const SlpContract = new ethers.Contract(SLP_CONTRACT_ADDRESS, SLP_CONTRACT_ABI, RoninRPC)
export const AxieContract = new ethers.Contract(AXIE_CONTRACT_ADDRESS, AXIE_CONTRACT_ABI, RoninRPC)
export const AxsStakeContract = new ethers.Contract(AXS_STAKING_POOL_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, RoninRPC)
export const RonWethContract = new ethers.Contract(
	RON_WETH_LP_STAKING_POOL_CONTRACT_ADDRESS,
	STAKING_CONTRACT_ABI,
	RoninRPC
)
export const RonAxsContract = new ethers.Contract(
	RON_AXS_LP_STAKING_POOL_CONTRACT_ADDRESS,
	STAKING_CONTRACT_ABI,
	RoninRPC
)
export const RonSlpContract = new ethers.Contract(
	RON_SLP_LP_STAKING_POOL_CONTRACT_ADDRESS,
	STAKING_CONTRACT_ABI,
	RoninRPC
)
export const RonUsdcContract = new ethers.Contract(
	RON_USDC_LP_STAKING_POOL_CONTRACT_ADDRESS,
	STAKING_CONTRACT_ABI,
	RoninRPC
)
export const StakingManagerContract = new ethers.Contract(
	STAKING_MANAGER_CONTRACT_ADDRESS,
	STAKING_MANAGER_CONTRACT_ABI,
	RoninRPC
)
