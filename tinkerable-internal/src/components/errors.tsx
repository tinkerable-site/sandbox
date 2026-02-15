import { useContext } from "react";
import { TinkerableContext } from "../TinkerableContext";

export const ErrorNotFound = () => {
  const {navigationState: {pathParameters}} = useContext(TinkerableContext);
  return <>No route registered for path {pathParameters?.path ?? "(unknown)"}</>
}
