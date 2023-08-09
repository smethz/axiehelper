export const GetMinPriceQuery = `
query GetMinPriceErc1155Tokens($size: Int, $tokenIds: [String!], $tokenType: Erc1155Type) {
  erc1155Tokens(
    size: $size
    tokenIds: $tokenIds
    tokenType: $tokenType
  ) {
    results {
      id: tokenId
      tokenId
      minPrice
      tokenType
    }
  }
}
`
