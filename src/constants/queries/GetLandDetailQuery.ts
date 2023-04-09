export const GetLandDetailQuery = `
query GetLandDetail($col: Int!, $row: Int!) {
  land(col: $col, row: $row) {
    ...LandDetail
  }
}

fragment LandDetail on LandPlot {
  tokenId
  owner
  ownerProfile {
    name
  }
  landType
  row
  col
  order {
    ...OrderInfo
  }
  ...TokenAssetOffers
}

fragment OrderInfo on Order {
  id
  maker
  kind
  assets {
    ...AssetInfo
  }
  expiredAt
  paymentToken
  startedAt
  basePrice
  endedAt
  endedPrice
  expectedState
  nonce
  marketFeePercentage
  signature
  hash
  duration
  timeLeft
  currentPrice
  suggestedPrice
  currentPriceUsd
}

fragment AssetInfo on Asset {
  erc
  address
  id
  quantity
  orderId
}

fragment OfferInfo on Order {
  ...ExcludedAssetsOffer
  status
  assets {
    ...ExcludedTokenAsset
    token {
      ...TokenAsset
    }
  }
}

fragment ExcludedAssetsOffer on Order {
  id
  maker
  makerProfile {
    ...Profile
  }
  kind
  expiredAt
  paymentToken
  startedAt
  basePrice
  endedAt
  endedPrice
  expectedState
  nonce
  marketFeePercentage
  signature
  hash
  duration
  timeLeft
  currentPrice
  suggestedPrice
  currentPriceUsd
}

fragment Profile on PublicProfile {
  accountId
  name
  addresses {
    ...Addresses
  }
}

fragment Addresses on NetAddresses {
  ethereum
  tomo
  loom
  ronin
}

fragment ExcludedTokenAsset on Asset {
  erc
  address
  id
  quantity
  orderId
}

fragment TokenAsset on TokenAsset {
  ... on Axie {
    id
    name
    class
    image
    stage
    owner
    newGenes
    title
    parts {
      id
      name
      class
      type
      specialGenes
      stage
      __typename
    }
    ownerProfile {
      ...Profile
      __typename
    }
  }
  ... on LandPlot {
    landType
    row
    col
    owner
    ownerProfile {
      ...Profile
      __typename
    }
  }
  ... on LandItem {
    itemId
    name
    itemAlias
    tokenId
    landType
    itemId
    figureURL
    rarity
    owner
    tokenType
    ownerProfile {
      ...Profile
      __typename
    }
  }
  ... on EquipmentInstance {
    equipmentId
    name
    rarity
    alias
    collections
    slot
    ownerProfile {
      ...Profile
    }
  }
}

fragment TokenAssetOffers on TokenAsset {
  ... on LandPlot {
    highestOffer {
      ...OfferInfo
    }
    offers(from: 0, size: 10) {
      total
      data {
        ...OfferInfo
      }
    }
    numActiveOffers
  }
  ... on LandItem {
    highestOffer {
      ...OfferInfo
    }
    offers(from: 0, size: 10) {
      total
      data {
        ...OfferInfo
      }
    }
    numActiveOffers
  }
  ... on EquipmentInstance {

    highestOffer {
      ...OfferInfo
    }
    offers(from: 0, size: 10) {
      total
      data {
        ...OfferInfo
      }
    }
    numActiveOffers
  }
}
`
