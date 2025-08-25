import { use, useEffect, useMemo, useState } from 'react';
import { TinkerableContext } from './TinkerableContext';
import { FilesMetadata, Metadata, MetadataQueryFunction, MetadataQueryResult } from './sandboxTypes';

const evaluateQueryFunction = (filesMetadata:FilesMetadata, queryFunction: MetadataQueryFunction):MetadataQueryResult => {
  try {
    return {result: queryFunction(filesMetadata)}
  } catch (e) {
    return {error: e}
  }
}

const arraysEqual = <T>(a: T[], b:T[]):boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export const useMetadataQuery = (queryFunction:MetadataQueryFunction) => {
  const {filesMetadata} = use(TinkerableContext);
  // we don't care if the metadata reference has changed, we only care about the output of queryFunction()
  const [queryResult, setQueryResult] = useState<MetadataQueryResult | null>(null);
  // any time the metadata object changes,
  // recalculate the query result and update the state if necessary
  useEffect(() => {
    setQueryResult(prevResult => {
      const newResult = evaluateQueryFunction(filesMetadata, queryFunction);
      if (!prevResult) {
        return newResult;
      }
      if (!('result' in newResult)) {
        return newResult;
      }
      if (!('result' in prevResult)) {
        return newResult;
      }
      return arraysEqual(prevResult.result, newResult.result) ? prevResult : newResult;
    })
  }, [filesMetadata, setQueryResult, queryFunction])
  return queryResult;
}

export const useFileMetadata = (path: string): Metadata|null => {
  const {filesMetadata} = use(TinkerableContext);
  const result = useMemo(() => filesMetadata[path], [path, filesMetadata]);
  return result;
}
