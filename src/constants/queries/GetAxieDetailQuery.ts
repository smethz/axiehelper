export const GetAxieDetailQuery = `query GetAxieDetail($axieId: ID!) {
  axie(axieId: $axieId) {
    ...AxieDetail
    ownerProfile {
      ...ProfileAvatarBrief
      __typename
    }
    __typename
  }
}

fragment AxieDetail on Axie {
  id
  image
  class
  chain
  name
  genes
  newGenes
  owner
  birthDate
  bodyShape
  class
  sireId
  sireClass
  matronId
  matronClass
  stage
  title
  breedCount
  axpInfo {
    ...AxpInfo
    __typename
  }
  axpStatDay {
    ...AxpStat
    __typename
  }
  figure {
    atlas
    model
    image
    __typename
  }
  parts {
    ...AxiePart
    __typename
  }
  stats {
    ...AxieStats
    __typename
  }
  order {
    ...OrderInfo
    __typename
  }
  ...TokenAssetOffers
  battleInfo {
    ...AxieBattleInfo
    __typename
  }
  children {
    id
    name
    class
    image
    title
    stage
    __typename
  }
  potentialPoints {
    beast
    aquatic
    plant
    bug
    bird
    reptile
    mech
    dawn
    dusk
    __typename
  }
  equipmentInstances {
    ...EquipmentInstance
    __typename
  }
  __typename
}

fragment AxieBattleInfo on AxieBattleInfo {
  banned
  banUntil
  level
  __typename
}

fragment AxiePart on AxiePart {
  id
  name
  class
  type
  specialGenes
  stage
  abilities {
    ...AxieCardAbility
    __typename
  }
  __typename
}

fragment AxieCardAbility on AxieCardAbility {
  id
  name
  attack
  defense
  energy
  description
  backgroundUrl
  effectIconUrl
  __typename
}

fragment AxieStats on AxieStats {
  hp
  speed
  skill
  morale
  __typename
}

fragment OrderInfo on Order {
  id
  maker
  kind
  assets {
    ...AssetInfo
    __typename
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
  __typename
}

fragment AssetInfo on Asset {
  erc
  address
  id
  quantity
  orderId
  __typename
}

fragment EquipmentInstance on EquipmentInstance {
  id: tokenId
  tokenId
  owner
  equipmentId
  alias
  equipmentType
  slot
  name
  rarity
  collections
  equippedBy
  __typename
}

fragment TokenAssetOffers on TokenAsset {
  ... on Axie {
    yourOffer {
      ...OfferInfo
      __typename
    }
    highestOffer {
      ...OfferInfo
      __typename
    }
    offers(from: 0, size: 10) {
      total
      data {
        ...OfferInfo
        __typename
      }
      __typename
    }
    numActiveOffers
    __typename
  }
  ... on LandPlot {
    yourOffer {
      ...OfferInfo
      __typename
    }
    highestOffer {
      ...OfferInfo
      __typename
    }
    offers(from: 0, size: 10) {
      total
      data {
        ...OfferInfo
        __typename
      }
      __typename
    }
    numActiveOffers
    __typename
  }
  ... on LandItem {
    yourOffer {
      ...OfferInfo
      __typename
    }
    highestOffer {
      ...OfferInfo
      __typename
    }
    offers(from: 0, size: 10) {
      total
      data {
        ...OfferInfo
        __typename
      }
      __typename
    }
    numActiveOffers
    __typename
  }
  ... on EquipmentInstance {
    yourOffer {
      ...OfferInfo
      __typename
    }
    highestOffer {
      ...OfferInfo
      __typename
    }
    offers(from: 0, size: 10) {
      total
      data {
        ...OfferInfo
        __typename
      }
      __typename
    }
    numActiveOffers
    __typename
  }
  __typename
}

fragment OfferInfo on Order {
  ...ExcludedAssetsOffer
  status
  assets {
    ...ExcludedTokenAsset
    token {
      ...TokenAsset
      __typename
    }
    __typename
  }
  __typename
}

fragment ExcludedAssetsOffer on Order {
  id
  maker
  makerProfile {
    ...Profile
    __typename
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
  __typename
}

fragment Profile on PublicProfile {
  accountId
  name
  addresses {
    ...Addresses
    __typename
  }
  __typename
}

fragment Addresses on NetAddresses {
  ethereum
  tomo
  loom
  ronin
  __typename
}

fragment ExcludedTokenAsset on Asset {
  erc
  address
  id
  quantity
  orderId
  __typename
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
    assetType: __typename
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
    assetType: __typename
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
    assetType: __typename
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
      __typename
    }
    assetType: __typename
  }
  __typename
}

fragment AxpStat on AxpStat {
  axieId
  axpAxieCapDay
  totalGainedAxpDay
  maxLevel
  __typename
}

fragment AxpInfo on AxpInfo {
  level
  nextOnchainLevel
  onchainLevel
  shouldAscend
  xp
  xpToLevelUp
  __typename
}

fragment ProfileAvatarBrief on PublicProfile {
  accountId
  name
  settings {
    avatar {
      ...ProfileAvatar
      __typename
    }
    __typename
  }
  __typename
}

fragment ProfileAvatar on ProfileAvatar {
  axie {
    ...AxieProfileSettings
    __typename
  }
  position
  backgroundColor
  __typename
}

fragment AxieProfileSettings on Axie {
  id
  genes
  class
  newGenes
  equipmentInstances {
    ...EquipmentInstance
    __typename
  }
  __typename
}
`
