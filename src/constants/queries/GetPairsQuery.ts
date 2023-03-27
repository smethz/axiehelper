import {
	RON_AXS_LP_CONTRACT_ADDRESS,
	RON_SLP_LP_CONTRACT_ADDRESS,
	RON_USDC_LP_CONTRACT_ADDRESS,
	RON_WETH_LP_CONTRACT_ADDRESS,
} from "@constants/contracts/addresses"

export const GetPairsQuery = `query pairs {
    pairs(
        where: {
            id_in: [
                "${RON_WETH_LP_CONTRACT_ADDRESS}"
                "${RON_AXS_LP_CONTRACT_ADDRESS}"
                "${RON_USDC_LP_CONTRACT_ADDRESS}"
                "${RON_SLP_LP_CONTRACT_ADDRESS}"
            ]
        }
    ) {
    id
    token0 {
            id
            symbol
            name
        }
    token1 {
            id
            symbol
            name
        }
        reserve0
        reserve1
    }
  }`
