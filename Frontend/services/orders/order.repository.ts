import { mockOrder } from "../../lib/mock-api";
import { createOnlineOrder } from "./order.service";
import type { CreateOnlineOrderRequest } from "../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export const orderRepository = {
  createOnlineOrder: (request: CreateOnlineOrderRequest) => useMock ? mockOrder(request) : createOnlineOrder(request),
};
