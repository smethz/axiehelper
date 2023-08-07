export const GetPublicProfileWithRoninAddress = `
 query PublicProfileWithRoninAddress($roninAddress: String!) {
  publicProfileWithRoninAddress(
    roninAddress: $roninAddress
  ) {
    accountId
  }
}`
