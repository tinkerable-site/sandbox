const PATH_SEPARATOR = "/";

export const joinPaths = (...pathPart: string[]) => pathPart.reduce((acc, part) => {
  const left = (acc.endsWith(PATH_SEPARATOR)) ? acc.slice(0, -1) : acc;
  const right = (part.startsWith(PATH_SEPARATOR)) ? part.substring(1) : part;
  if (left || acc === PATH_SEPARATOR) {
    return `${left}${PATH_SEPARATOR}${right}`;
  }
  if (part.startsWith(PATH_SEPARATOR)) {
    return `${PATH_SEPARATOR}${right}`;
  }
  return right;
}, "");

export const absPath = (rawPath: string): string => {
  const absCandidate = joinPaths.apply(
    null,
    rawPath.split(PATH_SEPARATOR).reduce(
      (partialAbsPath: string[], currentPathPart: string) => {
        if (currentPathPart == '.') {
          return partialAbsPath;
        }
        if (currentPathPart == '..') {
          return partialAbsPath.slice(0, -1)
        }
        return partialAbsPath.concat(currentPathPart);
      },
      []
    ));
  if (absCandidate === '' && rawPath.startsWith(PATH_SEPARATOR)) {
    return PATH_SEPARATOR;
  }
  return absCandidate;
}
