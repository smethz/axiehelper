export const GetMinPriceQuery = `
query GetMinPriceErc1155Tokens($from: Int, $size: Int, $tokenIds: [String!], $tokenType: Erc1155Type) {
  erc1155Tokens(
    from: $from
    size: $size
    tokenIds: $tokenIds
    tokenType: $tokenType
  ) {
    results {
      id: tokenId
      tokenId
      minPrice
      tokenType
      __typename
    }
    __typename
  }
}
`
