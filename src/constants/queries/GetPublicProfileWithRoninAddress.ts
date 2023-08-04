export const GetPublicProfileWithRoninAddress = `
 query PublicProfileWithRoninAddress {
  publicProfileWithRoninAddress(
    roninAddress: $roninAddress
  ) {
    accountId
  }
}`
