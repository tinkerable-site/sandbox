export const sendMessage = (type: string, data: Record<string, any> = {}) => {
  // module.evaluation is defined in the sandbox environment
  // @ts-ignore
  module.evaluation.module.bundler.messageBus.sendMessage(type, data);
}

export const protocolRequest = (protocolName: string, method: string, params: Array<any>): Promise<any> => {
  // example usage: const response = await protocolRequest('fs', 'readFile', [path]);
  // module.evaluation is defined in the sandbox environment
  // @ts-ignore
  return module.evaluation.module.bundler.messageBus.protocolRequest(protocolName, method, params);
}

export const addListener = (msgType: string, handler: (msg:any)=>void, event?:any):(() => void) => {
  // @ts-ignore
  const disposable = (event ?? module.evaluation.module.bundler.messageBus.onMessage)((msg) => {
    if (msg.type === msgType) {
      handler(msg);
    }
  });
  return () => disposable.dispose();
}
