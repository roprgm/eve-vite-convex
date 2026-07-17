export function toClientContinuationToken(token: string | undefined): string | undefined {
  if (!token) return token;

  const separator = token.indexOf(":");
  if (separator <= 0) return token;

  const namespace = token.slice(0, separator);
  const duplicatedPrefix = `${namespace}:${namespace}:`;
  if (token.startsWith(duplicatedPrefix)) return token.slice(namespace.length + 1);

  return token;
}
