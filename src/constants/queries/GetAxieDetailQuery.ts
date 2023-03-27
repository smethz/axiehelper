export const GetAxieDetailQuery = `query GetAxieDetail($axieId: ID!) {
  axie(axieId: $axieId) {
    ...AxieDetail
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
  level
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
  ownerProfile {
    name
    __typename
  }
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
`
