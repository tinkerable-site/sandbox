import { useContext } from "react";
import { TinkerableContext } from "../TinkerableContext";

export const ErrorNotFound = () => {
  const {navigation: {pathParameters}} = useContext(TinkerableContext);
  return <>No route registered for path {pathParameters?.path ?? "(unknown)"}</>
}
