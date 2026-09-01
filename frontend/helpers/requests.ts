export function isProdEnv() {
  return process.env.NEXT_PUBLIC_IS_PROD?.toLowerCase() === "true";
}

export function getApiHost() {
  return isProdEnv()
    ? process.env.NEXT_PUBLIC_API_HOST_PROD
    : process.env.NEXT_PUBLIC_API_HOST_DEV;
}
